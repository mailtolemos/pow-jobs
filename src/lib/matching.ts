// Hybrid matching engine.
// Pipeline: hard filters → structured score → (optional) LLM score → blended final.

import type { Candidate, Job, MatchScore } from "./types";
import { getJob, listJobs, getCandidate, upsertMatch } from "./db";
import { scoreJobWithClaude, isLLMAvailable } from "./llm";

// --- Hard filters ---------------------------------------------------------

export interface HardFilterResult {
  pass: boolean;
  failed: string[];
}

export function applyHardFilters(candidate: Candidate, job: Job): HardFilterResult {
  const failed: string[] = [];

  // Compensation floor. We use base_max (optimistic) vs. floor; if base_max is null, accept.
  if (job.base_max != null && job.base_max < candidate.comp_floor_usd) {
    failed.push("comp_floor");
  }

  // Jurisdiction — candidate must be allowed in the job's required jurisdiction.
  // "global" jobs accept any candidate; otherwise the candidate's jurisdiction_ok list must include it.
  if (job.jurisdiction_required !== "global") {
    if (!candidate.jurisdiction_ok.includes(job.jurisdiction_required)) {
      failed.push("jurisdiction");
    }
  }

  // Remote policy compatibility.
  if (!candidate.remote_policy_ok.includes(job.remote_policy)) {
    failed.push("remote_policy");
  }

  // Visa — candidate needs sponsorship but job doesn't offer it.
  if (candidate.visa_needed && !job.visa_sponsored) {
    failed.push("visa");
  }

  // Regulated dealbreaker — if candidate can't take regulated roles.
  if (job.regulated && !candidate.max_regulated_ok) {
    failed.push("regulated_not_ok");
  }

  // Free-form dealbreakers: simple substring match against employer, stage, domain, description.
  const haystack = `${job.employer} ${job.stage} ${job.domain} ${job.employer_category} ${job.description}`.toLowerCase();
  for (const db of candidate.dealbreakers) {
    const needle = db.toLowerCase().trim();
    if (!needle) continue;
    // Handle a few structured tokens that appear in dealbreakers (e.g., "stage:seed").
    if (needle.startsWith("stage:")) {
      const val = needle.slice("stage:".length);
      if (job.stage === val) {
        failed.push(`dealbreaker:${needle}`);
        continue;
      }
    }
    if (haystack.includes(needle)) {
      failed.push(`dealbreaker:${needle}`);
    }
  }

  return { pass: failed.length === 0, failed };
}

// --- Structured scoring ---------------------------------------------------

// Seniority bands ordered so we can compute distance.
const SENIORITY_ORDER: Record<string, number> = {
  ic1: 1, ic2: 2, ic3: 3, ic4: 4, ic5: 5, ic6: 6, ic7: 7,
  m1: 4, m2: 5, m3: 6, m4: 7, m5: 8,
};

function seniorityFit(candLevel: string, jobLevel: string): number {
  const c = SENIORITY_ORDER[candLevel] ?? 4;
  const j = SENIORITY_ORDER[jobLevel] ?? 4;
  const dist = Math.abs(c - j);
  if (dist === 0) return 1;
  if (dist === 1) return 0.75;
  if (dist === 2) return 0.4;
  return 0.1;
}

function domainFit(candDomains: string[], jobDomain: string): number {
  if (candDomains.includes(jobDomain)) return 1;
  // Partial credit for same top-level family (crypto:* / finance:*).
  const jobFamily = jobDomain.split(":")[0];
  const anyFamily = candDomains.some((d) => d.split(":")[0] === jobFamily);
  if (anyFamily) return 0.6;
  return 0.15;
}

function functionFit(candFunctions: string[], jobFunction: string): number {
  if (candFunctions.includes(jobFunction)) return 1;
  // Some functions pair well (quant-research ↔ trading, engineering ↔ data).
  const adjacency: Record<string, string[]> = {
    "quant-research": ["trading", "engineering", "data"],
    trading: ["quant-research"],
    engineering: ["data", "product"],
    data: ["engineering", "quant-research"],
    product: ["design", "engineering"],
    design: ["product"],
  };
  const adj = adjacency[jobFunction] || [];
  if (candFunctions.some((f) => adj.includes(f))) return 0.5;
  return 0.1;
}

function techStackOverlap(candStack: string[], jobStack: string[]): number {
  if (jobStack.length === 0) return 0.5;
  const set = new Set(candStack.map((s) => s.toLowerCase()));
  const hits = jobStack.filter((t) => set.has(t.toLowerCase())).length;
  // Score: reward coverage of the job's stack, cap at 1.
  return Math.min(1, hits / Math.max(1, Math.min(jobStack.length, 4)));
}

function compFit(candidate: Candidate, job: Job): number {
  const offered = job.base_max ?? job.base_min ?? 0;
  if (offered === 0) return 0.5; // unknown — neutral
  const floor = candidate.comp_floor_usd;
  if (offered < floor) return 0;
  // Diminishing returns above floor.
  const ratio = offered / floor;
  if (ratio >= 1.5) return 1;
  return 0.5 + (ratio - 1) * 1.0; // 1.0 → 0.5, 1.5 → 1.0
}

function tokenUpsideFit(candidate: Candidate, job: Job): number {
  const tokenPct = job.token_pct_target ?? 0;
  const equityPct = job.carry_or_equity_pct ?? 0;
  const upside = Math.max(tokenPct / 100, equityPct / 100);
  // Weighted by candidate's preference.
  return Math.min(1, upside * 2) * candidate.weight_token_upside + (1 - candidate.weight_token_upside) * 0.5;
}

// Proxy for "team quality": public/verified employers, established stage, or AUM.
function teamQualitySignal(job: Job): number {
  let s = 0.5;
  if (job.employer_verified) s += 0.2;
  if (["public", "series-c", "series-d-plus", "fund", "propshop"].includes(job.stage)) s += 0.2;
  if (job.aum_usd && job.aum_usd >= 1_000_000_000) s += 0.1;
  return Math.min(1, s);
}

export interface StructuredBreakdown {
  domain: number;
  function: number;
  seniority: number;
  tech: number;
  comp: number;
  token: number;
  team: number;
  total: number;
}

export function structuredScore(candidate: Candidate, job: Job): StructuredBreakdown {
  const d = domainFit(candidate.domains_of_interest, job.domain);
  const f = functionFit(candidate.functions, job.function);
  const s = seniorityFit(candidate.seniority_band, job.seniority);
  const t = techStackOverlap(candidate.tech_stack, job.tech_stack);
  const c = compFit(candidate, job);
  const tok = tokenUpsideFit(candidate, job);
  const q = teamQualitySignal(job);

  // Weighted blend. Hard-coded feature weights + candidate's soft weights on comp/domain/team/token.
  const wDomain = 0.20 + 0.10 * candidate.weight_domain_fit;
  const wFunction = 0.10;
  const wSeniority = 0.10;
  const wTech = 0.10;
  const wComp = 0.10 + 0.10 * candidate.weight_comp;
  const wToken = 0.05 + 0.10 * candidate.weight_token_upside;
  const wTeam = 0.05 + 0.10 * candidate.weight_team_quality;
  const sum = wDomain + wFunction + wSeniority + wTech + wComp + wToken + wTeam;

  const total =
    (d * wDomain + f * wFunction + s * wSeniority + t * wTech + c * wComp + tok * wToken + q * wTeam) / sum;

  return { domain: d, function: f, seniority: s, tech: t, comp: c, token: tok, team: q, total };
}

// --- Orchestration --------------------------------------------------------

export interface ComputeMatchOptions {
  useLLM?: boolean; // default true if LLM available
}

export async function computeMatch(
  candidate: Candidate,
  job: Job,
  opts: ComputeMatchOptions = {},
): Promise<MatchScore> {
  const hard = applyHardFilters(candidate, job);
  const breakdown = structuredScore(candidate, job);
  const structured = breakdown.total;

  let llmScore: number | null = null;
  let rationale = "";

  const shouldUseLLM = (opts.useLLM ?? true) && isLLMAvailable() && hard.pass && structured >= 0.4;

  if (shouldUseLLM) {
    const llm = await scoreJobWithClaude(candidate, job);
    if (llm) {
      llmScore = llm.score;
      rationale = llm.rationale;
    }
  }

  if (!rationale) {
    rationale = buildHeuristicRationale(candidate, job, breakdown, hard);
  }

  // Final blended score: 60% structured + 40% LLM (if available); otherwise pure structured.
  const finalScore = hard.pass
    ? llmScore != null
      ? 0.6 * structured + 0.4 * llmScore
      : structured
    : 0;

  return {
    job_id: job.id,
    candidate_id: candidate.id,
    score: Number(finalScore.toFixed(4)),
    structured_score: Number(structured.toFixed(4)),
    llm_score: llmScore,
    hard_filter_pass: hard.pass,
    rationale,
    failed_filters: hard.failed,
    computed_at: new Date().toISOString(),
  };
}

function buildHeuristicRationale(
  candidate: Candidate,
  job: Job,
  b: StructuredBreakdown,
  hard: HardFilterResult,
): string {
  if (!hard.pass) {
    return `Filtered out: ${hard.failed.join(", ")}.`;
  }
  const parts: string[] = [];
  if (b.domain >= 0.9) parts.push(`direct domain match (${job.domain})`);
  else if (b.domain >= 0.5) parts.push(`adjacent domain`);
  if (b.seniority >= 0.75) parts.push(`seniority aligns`);
  if (b.tech >= 0.5) parts.push(`tech stack overlap`);
  if (b.comp >= 0.8) parts.push(`comp well above floor`);
  else if (b.comp >= 0.5) parts.push(`comp meets floor`);
  if (b.token >= 0.7 && candidate.weight_token_upside >= 0.6) parts.push(`material token upside`);
  if (b.team >= 0.8) parts.push(`established employer`);
  const body = parts.length ? parts.join("; ") : "weak structural fit";
  return `${body}. Score ${(b.total * 100).toFixed(0)}/100 (heuristic, no LLM).`;
}

export async function computeAllMatches(candidateId: string, opts: ComputeMatchOptions = {}): Promise<MatchScore[]> {
  const candidate = getCandidate(candidateId);
  if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);
  const jobs = listJobs({ openOnly: true });
  const results: MatchScore[] = [];
  for (const job of jobs) {
    const m = await computeMatch(candidate, job, opts);
    upsertMatch(m);
    results.push(m);
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

export async function scoreSingle(candidateId: string, jobId: string, opts: ComputeMatchOptions = {}): Promise<MatchScore> {
  const candidate = getCandidate(candidateId);
  const job = getJob(jobId);
  if (!candidate || !job) throw new Error(`Not found: candidate=${candidateId} job=${jobId}`);
  const m = await computeMatch(candidate, job, opts);
  upsertMatch(m);
  return m;
}

// --- Precision floor ------------------------------------------------------

// Per-candidate threshold: the floor below which we do not send a match.
// We're deliberately conservative — better silence than noise.
export function precisionFloorFor(candidate: Candidate): number {
  // Start at 0.65, adjust lightly based on candidate's signaled pickiness (comp weight).
  const base = 0.65;
  const adjust = (candidate.weight_comp - 0.5) * 0.1;
  return Math.max(0.55, Math.min(0.8, base + adjust));
}

export function applyPrecisionFloor(matches: MatchScore[], candidate: Candidate): MatchScore[] {
  const floor = precisionFloorFor(candidate);
  return matches.filter((m) => m.hard_filter_pass && m.score >= floor);
}
