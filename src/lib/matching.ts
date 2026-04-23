// Hybrid matching engine.
// Pipeline: hard filters → structured score → (optional) LLM score → blended final.

import type { Candidate, Job, MatchScore } from "./types";
import { getJob, listJobs, getCandidate, getAllCachedMatches, upsertMatch } from "./db";
import { scoreJobWithClaude, isLLMAvailable } from "./llm";

// --- Hard filters ---------------------------------------------------------

export interface HardFilterResult {
  pass: boolean;
  failed: string[];
}

// Functions are sometimes near-equivalent; respect those as "acceptable" even
// when the candidate picked a neighbor. Keeps results sharp without feeling
// overly strict. E.g. a Head of People with function=ops can still see
// business roles that are operationally adjacent.
const FUNCTION_ADJACENCY: Record<string, string[]> = {
  engineering: ["data"],
  data: ["engineering", "quant-research"],
  "quant-research": ["data", "trading"],
  trading: ["quant-research"],
  ops: ["business", "legal-compliance"],
  business: ["ops"],
  "legal-compliance": ["ops"],
  product: ["design", "engineering"],
  design: ["product"],
};

function functionMatches(candidateFns: string[], jobFn: string): boolean {
  if (candidateFns.length === 0) return true; // unconstrained
  if (candidateFns.includes(jobFn)) return true;
  for (const cf of candidateFns) {
    if ((FUNCTION_ADJACENCY[cf] ?? []).includes(jobFn)) return true;
  }
  return false;
}

function domainMatches(candidateDomains: string[], jobDomain: string): boolean {
  if (candidateDomains.length === 0) return true;
  if (candidateDomains.includes(jobDomain)) return true;
  // Prefix match: crypto:* accepts any crypto:*, finance:* accepts any finance:*.
  // If the candidate selected ANY domain with this prefix, let adjacent
  // crypto/finance roles through — they're still in the same world.
  const jobPrefix = jobDomain.split(":")[0];
  if (!jobPrefix) return false;
  return candidateDomains.some((d) => d.startsWith(`${jobPrefix}:`));
}

export function applyHardFilters(candidate: Candidate, job: Job): HardFilterResult {
  const failed: string[] = [];

  // Compensation floor. We use base_max (optimistic) vs. floor; if base_max is null, accept.
  if (job.base_max != null && candidate.comp_floor_usd > 0 && job.base_max < candidate.comp_floor_usd) {
    failed.push("comp_floor");
  }

  // Jurisdiction — candidate must be allowed in the job's required jurisdiction.
  if (job.jurisdiction_required !== "global") {
    if (!candidate.jurisdiction_ok.includes(job.jurisdiction_required)) {
      failed.push("jurisdiction");
    }
  }

  // Remote policy compatibility.
  if (candidate.remote_policy_ok.length > 0 && !candidate.remote_policy_ok.includes(job.remote_policy)) {
    failed.push("remote_policy");
  }

  // Function fit — hard reject if the candidate picked functions and this job
  // sits outside the candidate's chosen + adjacent set. Stops "Head of People"
  // seeing Rust engineer roles.
  if (!functionMatches(candidate.functions as string[], job.function)) {
    failed.push("function_mismatch");
  }

  // Domain fit — hard reject if the candidate picked domains and this job
  // isn't in the list (prefix-level adjacent is ok, so crypto:defi candidates
  // still see crypto:infra roles).
  if (!domainMatches(candidate.domains_of_interest as string[], job.domain)) {
    failed.push("domain_mismatch");
  }

  if (candidate.visa_needed && !job.visa_sponsored) {
    failed.push("visa");
  }

  if (job.regulated && !candidate.max_regulated_ok) {
    failed.push("regulated_not_ok");
  }

  const haystack = `${job.employer} ${job.stage} ${job.domain} ${job.employer_category} ${job.description}`.toLowerCase();
  for (const db of candidate.dealbreakers) {
    const needle = db.toLowerCase().trim();
    if (!needle) continue;
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
  if (candDomains.length === 0) return 0.4; // no preferences yet → neutral
  if (candDomains.includes(jobDomain)) return 1;
  const jobFamily = jobDomain.split(":")[0];
  const anyFamily = candDomains.some((d) => d.split(":")[0] === jobFamily);
  if (anyFamily) return 0.6;
  return 0.15;
}

function functionFit(candFunctions: string[], jobFunction: string): number {
  if (candFunctions.length === 0) return 0.4;
  if (candFunctions.includes(jobFunction)) return 1;
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
  if (candStack.length === 0) return 0.3;
  const set = new Set(candStack.map((s) => s.toLowerCase()));
  const hits = jobStack.filter((t) => set.has(t.toLowerCase())).length;
  return Math.min(1, hits / Math.max(1, Math.min(jobStack.length, 4)));
}

function compFit(candidate: Candidate, job: Job): number {
  const offered = job.base_max ?? job.base_min ?? 0;
  const floor = candidate.comp_floor_usd;
  if (floor <= 0) return 0.6; // user hasn't set a floor → mild preference for well-paying roles
  if (offered === 0) return 0.5;
  if (offered < floor) return 0;
  const ratio = offered / floor;
  if (ratio >= 1.5) return 1;
  return 0.5 + (ratio - 1) * 1.0;
}

function tokenUpsideFit(candidate: Candidate, job: Job): number {
  const tokenPct = job.token_pct_target ?? 0;
  const equityPct = job.carry_or_equity_pct ?? 0;
  const upside = Math.max(tokenPct / 100, equityPct / 100);
  return Math.min(1, upside * 2) * candidate.weight_token_upside + (1 - candidate.weight_token_upside) * 0.5;
}

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
  useLLM?: boolean;
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

// Cache-aware two-stage scoring.
//
// Stage 0: read cached matches from the DB. If a (candidate, job) pair was
//   scored recently enough AND the job hasn't changed since, reuse the cached
//   score. This makes 2nd+ /feed loads effectively instant.
// Stage 1: structured pass on jobs that are either missing a cache entry or
//   whose cache entry is stale. Cheap, no LLM.
// Stage 2: promote the top-K unresolved jobs to LLM refinement, with a
//   global time budget so we never exceed Vercel's 60s cap.
const LLM_TOP_K = 6;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const LLM_BUDGET_MS = 45_000;

function isCacheFresh(cached: MatchScore, job: Job): boolean {
  const cachedAt = Date.parse(cached.computed_at);
  if (Number.isNaN(cachedAt)) return false;
  if (Date.now() - cachedAt > CACHE_TTL_MS) return false;
  // Invalidate if job has been updated since we last scored it.
  const seenAt = Date.parse(job.date_last_seen);
  if (!Number.isNaN(seenAt) && seenAt > cachedAt) return false;
  return true;
}

export async function computeAllMatches(
  candidateId: string,
  opts: ComputeMatchOptions = {},
): Promise<MatchScore[]> {
  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);
  const jobs = await listJobs({ openOnly: true });
  const cached = await getAllCachedMatches(candidateId);
  const cacheMap = new Map(cached.map((m) => [m.job_id, m]));
  const wantLLM = (opts.useLLM ?? true) && isLLMAvailable();

  // Stage 0 + 1: for each job, return cached score if fresh; otherwise
  // compute the structured-only score.
  const firstPass: Array<{ job: Job; m: MatchScore; fromCache: boolean; hasLLMScore: boolean }> = [];
  for (const job of jobs) {
    const cachedMatch = cacheMap.get(job.id);
    if (cachedMatch && isCacheFresh(cachedMatch, job)) {
      firstPass.push({
        job,
        m: cachedMatch,
        fromCache: true,
        hasLLMScore: cachedMatch.llm_score != null,
      });
      continue;
    }
    const m = await computeMatch(candidate, job, { ...opts, useLLM: false });
    firstPass.push({ job, m, fromCache: false, hasLLMScore: false });
  }
  firstPass.sort((a, b) => b.m.score - a.m.score);

  // Stage 2: promote top-K passing jobs to LLM refinement, but only for ones
  // that don't already have a recent LLM score. Respect a global time budget.
  const startBudget = Date.now();
  const promoted = new Set<string>();
  if (wantLLM) {
    let count = 0;
    for (const { job, m, hasLLMScore } of firstPass) {
      if (count >= LLM_TOP_K) break;
      if (!m.hard_filter_pass) continue;
      if (m.score < 0.4) continue;
      if (hasLLMScore) continue; // cached LLM score is fine
      promoted.add(job.id);
      count += 1;
    }
  }

  const finals: MatchScore[] = [];
  for (const { job, m, fromCache } of firstPass) {
    const within = Date.now() - startBudget < LLM_BUDGET_MS;
    if (promoted.has(job.id) && within) {
      const refined = await computeMatch(candidate, job, { ...opts, useLLM: true });
      upsertMatch(refined).catch(() => {});
      finals.push(refined);
    } else {
      if (!fromCache) upsertMatch(m).catch(() => {});
      finals.push(m);
    }
  }
  finals.sort((a, b) => b.score - a.score);
  return finals;
}

export async function scoreSingle(
  candidateId: string,
  jobId: string,
  opts: ComputeMatchOptions = {},
): Promise<MatchScore> {
  const candidate = await getCandidate(candidateId);
  const job = await getJob(jobId);
  if (!candidate || !job) throw new Error(`Not found: candidate=${candidateId} job=${jobId}`);
  const m = await computeMatch(candidate, job, opts);
  await upsertMatch(m);
  return m;
}

// --- Precision floor ------------------------------------------------------

export function precisionFloorFor(candidate: Candidate): number {
  const base = 0.65;
  const adjust = (candidate.weight_comp - 0.5) * 0.1;
  return Math.max(0.55, Math.min(0.8, base + adjust));
}

export function applyPrecisionFloor(matches: MatchScore[], candidate: Candidate): MatchScore[] {
  const floor = precisionFloorFor(candidate);
  return matches.filter((m) => m.hard_filter_pass && m.score >= floor);
}
