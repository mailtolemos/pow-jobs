// Unified LLM client used for:
//   - Match scoring (scoreJobWithClaude — kept name for API compat)
//   - Ingest classification (chatJSON in src/lib/ingest/classify.ts)
//
// Provider resolution order:
//   1. GROQ_API_KEY → Groq Cloud (free tier; OpenAI-compatible chat completions)
//   2. ANTHROPIC_API_KEY → Anthropic Claude
//   3. Neither → null (callers fall back to heuristics)
//
// To switch providers, just set/unset the corresponding env var on Vercel and
// redeploy. Model per provider can be overridden via GROQ_MODEL / CLAUDE_MODEL.

import Anthropic from "@anthropic-ai/sdk";
import type { Candidate, Job } from "./types";

// ---------- Provider plumbing ---------------------------------------------

export type LLMProvider = "groq" | "anthropic" | "none";

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

export function currentProvider(): LLMProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

export function isLLMAvailable(): boolean {
  return currentProvider() !== "none";
}

export function currentModel(): string | null {
  switch (currentProvider()) {
    case "groq":
      return GROQ_MODEL;
    case "anthropic":
      return CLAUDE_MODEL;
    default:
      return null;
  }
}

// Single entry point: chat with a system prompt + user prompt, return raw text.
// Providers handle their own quirks; we just normalize to a string response.
export interface ChatOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export async function chat(opts: ChatOptions): Promise<string | null> {
  const provider = currentProvider();
  if (provider === "groq") return chatGroq(opts);
  if (provider === "anthropic") return chatAnthropic(opts);
  return null;
}

// Convenience: chat and parse the first {...} JSON block. Returns null on any
// failure (missing key, network error, unparseable response). Callers should
// treat null as "LLM unavailable" and fall back.
export async function chatJSON<T = unknown>(opts: ChatOptions): Promise<{ data: T | null; error: string | null }> {
  try {
    const text = await chat(opts);
    if (text === null) return { data: null, error: "no LLM provider configured" };
    // Strip markdown fences and extract the first {...} block.
    let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    if (!cleaned.startsWith("{")) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) cleaned = m[0];
    }
    try {
      return { data: JSON.parse(cleaned) as T, error: null };
    } catch (e) {
      return { data: null, error: `JSON parse failed: ${(e as Error).message}; head=${text.slice(0, 200)}` };
    }
  } catch (e) {
    return { data: null, error: `LLM call failed: ${(e as Error).message}` };
  }
}

// ---------- Groq (OpenAI-compatible) --------------------------------------

async function chatGroq(opts: ChatOptions): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.2,
    // Ask Groq to emit JSON when possible; harmless for prose prompts.
    response_format: { type: "json_object" as const },
  };
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Groq ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq: empty choice content");
  return content;
}

// ---------- Anthropic ------------------------------------------------------

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

async function chatAnthropic(opts: ChatOptions): Promise<string> {
  const c = anthropicClient();
  const resp = await c.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.2,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  return resp.content
    .filter((b) => b.type === "text")
    .map((b) => ("text" in b ? b.text : ""))
    .join("");
}

// ---------- Match scoring --------------------------------------------------

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

// Name kept for API compatibility; now provider-agnostic.
export async function scoreJobWithClaude(
  candidate: Candidate,
  job: Job,
): Promise<LLMScore | null> {
  if (!isLLMAvailable()) return null;
  try {
    const { data, error } = await chatJSON<{ score: number; rationale: string }>({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(candidate, job),
      maxTokens: 400,
    });
    if (!data) {
      if (error) console.warn(`[llm] match score failed for ${job.id}: ${error}`);
      return null;
    }
    const score = Math.max(0, Math.min(1, Number(data.score)));
    const rationale = String(data.rationale || "");
    return { score, rationale };
  } catch (err) {
    console.warn(`[llm] scoreJobWithClaude failed for job ${job.id}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
