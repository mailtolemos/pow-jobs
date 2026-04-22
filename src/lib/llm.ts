// Claude API wrapper for LLM-as-judge job scoring.
// Falls back to null if no API key is configured — caller must handle.

import Anthropic from "@anthropic-ai/sdk";
import type { Candidate, Job } from "./types";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export function isLLMAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface LLMScore {
  score: number; // 0..1
  rationale: string;
}

const SYSTEM_PROMPT = `You are a senior recruiter specializing in finance and crypto roles. Given a candidate profile and a job, you return a strict JSON object scoring the match.

You consider:
- Domain fit: does the job's domain (e.g., crypto:defi, finance:systematic) align with the candidate's stated interests?
- Seniority fit: is the role at the right level?
- Tech/skill overlap: does the candidate's stack match what's required?
- Team/employer quality relative to candidate's background
- Compensation alignment vs. candidate's floor
- Dealbreakers: respect any explicit negative constraints
- Token/equity alignment with weight_token_upside
- Pseudonymous candidates should not be penalized for lacking a legal name

You are PRECISE, not generous. A score of 0.9+ should be rare and means "this is one of the best matches possible for this candidate." 0.7-0.9 is a strong match worth sending. 0.5-0.7 is mediocre. Below 0.5 is a weak match.

Output strictly JSON of form {"score": <float 0..1>, "rationale": "<2-3 sentence explanation>"}. No other text.`;

function buildUserPrompt(candidate: Candidate, job: Job): string {
  const candSummary = {
    headline: candidate.headline,
    years_experience: candidate.years_experience,
    current_role: candidate.current_role,
    current_employer: candidate.current_employer,
    seniority: candidate.seniority_band,
    domains_of_interest: candidate.domains_of_interest,
    functions: candidate.functions,
    tech_stack: candidate.tech_stack,
    comp_floor_usd: candidate.comp_floor_usd,
    jurisdiction_ok: candidate.jurisdiction_ok,
    remote_policy_ok: candidate.remote_policy_ok,
    weights: {
      comp: candidate.weight_comp,
      domain_fit: candidate.weight_domain_fit,
      team_quality: candidate.weight_team_quality,
      token_upside: candidate.weight_token_upside,
    },
    dealbreakers: candidate.dealbreakers,
  };

  const jobSummary = {
    title: job.title_raw,
    employer: job.employer,
    employer_category: job.employer_category,
    domain: job.domain,
    function: job.function,
    seniority: job.seniority,
    tech_stack: job.tech_stack,
    description: job.description,
    comp: {
      base_min: job.base_min,
      base_max: job.base_max,
      bonus_pct_target: job.bonus_pct_target,
      token_pct_target: job.token_pct_target,
      carry_or_equity_pct: job.carry_or_equity_pct,
    },
    location: job.location,
    remote_policy: job.remote_policy,
    jurisdiction_required: job.jurisdiction_required,
    regulated: job.regulated,
    stage: job.stage,
  };

  return `CANDIDATE:
${JSON.stringify(candSummary, null, 2)}

JOB:
${JSON.stringify(jobSummary, null, 2)}

Return JSON only.`;
}

export async function scoreJobWithClaude(
  candidate: Candidate,
  job: Job,
): Promise<LLMScore | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(candidate, job) }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Robust JSON extraction (in case model wraps in markdown fences).
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as { score: number; rationale: string };
    const score = Math.max(0, Math.min(1, Number(parsed.score)));
    const rationale = String(parsed.rationale || "");
    return { score, rationale };
  } catch (err) {
    console.warn(`[llm] scoreJobWithClaude failed for job ${job.id}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
