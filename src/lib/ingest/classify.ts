// Classify an IncomingJob into PoW Jobs' opinionated Job shape.
// Uses Claude when available to infer domain/seniority/tech_stack/etc.,
// and falls back to crude heuristics so ingest never fully blocks on LLM.

import Anthropic from "@anthropic-ai/sdk";
import type { IncomingJob } from "./types";
import type {
  Job,
  Domain,
  SeniorityBand,
  RemotePolicy,
  Jurisdiction,
  CompanyStage,
  Function as JobFunction,
} from "../types";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function client(): Anthropic | null {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _client = new Anthropic({ apiKey: key });
  return _client;
}

const ALL_DOMAINS: Domain[] = [
  "crypto:defi", "crypto:infra", "crypto:l1", "crypto:l2", "crypto:application",
  "crypto:analytics", "crypto:trading", "crypto:security",
  "finance:systematic", "finance:discretionary", "finance:macro", "finance:credit",
  "finance:equities", "finance:fi", "finance:hft", "finance:prop", "finance:hedgefund",
  "finance:banking", "fintech",
];
const ALL_FUNCTIONS: JobFunction[] = [
  "engineering", "quant-research", "trading", "product", "design",
  "ops", "business", "legal-compliance", "data",
];
const ALL_SENIORITY: SeniorityBand[] = [
  "ic1", "ic2", "ic3", "ic4", "ic5", "ic6", "ic7",
  "m1", "m2", "m3", "m4", "m5",
];
const ALL_STAGES: CompanyStage[] = [
  "seed", "series-a", "series-b", "series-c", "series-d-plus",
  "public", "dao", "fund", "propshop",
];

// --- Heuristic fallback -----------------------------------------------------

function guessDomain(title: string, dept: string | null): Domain {
  const s = `${title} ${dept ?? ""}`.toLowerCase();
  if (/defi|amm|lending|stable/.test(s)) return "crypto:defi";
  if (/protocol|validator|consensus|l1|rollup|l2/.test(s)) return "crypto:l1";
  if (/bridge|infra|node|rpc|indexer/.test(s)) return "crypto:infra";
  if (/trading|mev|hft|market[- ]making|quant/.test(s) && /crypto|defi|onchain/.test(s)) return "crypto:trading";
  if (/security|audit/.test(s)) return "crypto:security";
  if (/analytics|dashboard|reporting/.test(s)) return "crypto:analytics";
  if (/hedge\s*fund/.test(s)) return "finance:hedgefund";
  if (/prop/.test(s)) return "finance:prop";
  if (/hft|low[- ]latency/.test(s)) return "finance:hft";
  if (/systematic|quant/.test(s)) return "finance:systematic";
  if (/crypto|web3|onchain|blockchain/.test(s)) return "crypto:application";
  return "crypto:application";
}

function guessFunction(title: string, dept: string | null): JobFunction {
  const s = `${title} ${dept ?? ""}`.toLowerCase();
  if (/quant|research/.test(s)) return "quant-research";
  if (/trader|execution|market[- ]making/.test(s)) return "trading";
  if (/engineer|developer|sre|devops|security/.test(s)) return "engineering";
  if (/designer|design/.test(s)) return "design";
  if (/product manager|pm\b|product/.test(s)) return "product";
  if (/data\b|analytics|ml/.test(s)) return "data";
  if (/legal|compliance|counsel/.test(s)) return "legal-compliance";
  if (/ops|operations|people|hr|finance|recruit/.test(s)) return "ops";
  if (/bd|sales|growth|marketing/.test(s)) return "business";
  return "engineering";
}

function guessSeniority(title: string): SeniorityBand {
  const s = title.toLowerCase();
  if (/vp|head of|director/.test(s)) return "m4";
  if (/principal|staff/.test(s)) return "ic6";
  if (/senior|sr\.?/.test(s)) return "ic5";
  if (/lead/.test(s)) return "ic5";
  if (/junior|jr\.?|associate|intern|entry/.test(s)) return "ic2";
  if (/manager|eng manager/.test(s)) return "m2";
  return "ic4";
}

function guessRemotePolicy(loc: string, hint: IncomingJob["remote_hint"]): RemotePolicy {
  if (hint === "remote") return "remote-global";
  if (hint === "hybrid") return "hybrid";
  if (hint === "onsite") return "onsite";
  const s = loc.toLowerCase();
  if (/remote/.test(s)) return "remote-global";
  if (/hybrid/.test(s)) return "hybrid";
  return "onsite";
}

function guessJurisdiction(loc: string): Jurisdiction {
  const s = loc.toLowerCase();
  if (/us|united states|new york|san francisco|sf\b|nyc|seattle|boston|chicago|austin/.test(s)) return "us";
  if (/eu\b|europe|london|uk\b|united kingdom|berlin|paris|amsterdam|dublin|porto|lisbon|madrid/.test(s)) return "eu";
  if (/apac|asia|singapore|tokyo|hong\s*kong|seoul/.test(s)) return "apac";
  if (/latam|mexico|brazil|argentina|colombia/.test(s)) return "latam";
  return "global";
}

function heuristicClassify(inc: IncomingJob): Partial<Job> {
  return {
    domain: guessDomain(inc.title, inc.department),
    function: guessFunction(inc.title, inc.department),
    seniority: guessSeniority(inc.title),
    tech_stack: [],
    employer_category: "Crypto protocol",
    stage: "series-a",
    remote_policy: guessRemotePolicy(inc.location, inc.remote_hint),
    jurisdiction_required: guessJurisdiction(inc.location),
  };
}

// --- Claude-backed classification -------------------------------------------

const SYSTEM = `You classify a single job posting into a strict JSON schema used by a crypto+finance jobs board called PoW Jobs. Return JSON ONLY, no prose.

Schema (all fields required, use null only where marked nullable):
{
  "domain": one of [${ALL_DOMAINS.map((d) => `"${d}"`).join(", ")}],
  "function": one of [${ALL_FUNCTIONS.map((f) => `"${f}"`).join(", ")}],
  "seniority": one of [${ALL_SENIORITY.map((s) => `"${s}"`).join(", ")}],
  "tech_stack": string[] (short canonical names like "Rust", "Solidity", "Python", "Kubernetes"),
  "employer_category": short human label like "Crypto protocol", "Prop shop", "Hedge fund", "Fintech",
  "stage": one of [${ALL_STAGES.map((s) => `"${s}"`).join(", ")}],
  "remote_policy": one of ["onsite","hybrid","remote-regional","remote-global"],
  "jurisdiction_required": one of ["us","eu","uk","apac","latam","global"],
  "visa_sponsored": boolean,
  "regulated": boolean (true if role works under MiFID/SEC/FCA/etc.),
  "base_min_usd": integer|null,
  "base_max_usd": integer|null,
  "token_pct_target": number|null (e.g. 30 meaning 30% of total comp in tokens; infer from language),
  "carry_or_equity_pct": number|null,
  "team_size_band": one of ["1-10","10-50","50-200","200+"]|null,
  "summary": string (2-3 sentence plain-English description)
}

Be conservative: if unsure of comp, set null. If the role isn't crypto or finance at all, still pick the closest domain.`;

interface LLMClassification {
  domain: Domain;
  function: JobFunction;
  seniority: SeniorityBand;
  tech_stack: string[];
  employer_category: string;
  stage: CompanyStage;
  remote_policy: RemotePolicy;
  jurisdiction_required: Jurisdiction;
  visa_sponsored: boolean;
  regulated: boolean;
  base_min_usd: number | null;
  base_max_usd: number | null;
  token_pct_target: number | null;
  carry_or_equity_pct: number | null;
  team_size_band: string | null;
  summary: string;
}

async function llmClassify(inc: IncomingJob): Promise<{ data: LLMClassification | null; error: string | null }> {
  const c = client();
  if (!c) return { data: null, error: "ANTHROPIC_API_KEY not set" };
  const descr = (inc.description_text || inc.description_html || "").slice(0, 8000);
  const user = `Employer: ${inc.employer}
Title: ${inc.title}
Department: ${inc.department ?? "—"}
Team: ${inc.team ?? "—"}
Location: ${inc.location}
Employment: ${inc.employment_type ?? "—"}
Posted comp: ${inc.comp_min ?? "?"}–${inc.comp_max ?? "?"} ${inc.comp_currency ?? ""}

Description:
${descr}`;

  try {
    const resp = await c.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    const text = resp.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("");
    // Tolerate markdown fences and leading prose; extract the first {...} block
    let cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    if (!cleaned.startsWith("{")) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) cleaned = m[0];
    }
    try {
      return { data: JSON.parse(cleaned) as LLMClassification, error: null };
    } catch (e) {
      return { data: null, error: `JSON parse failed: ${(e as Error).message}; head=${text.slice(0, 200)}` };
    }
  } catch (e) {
    return { data: null, error: `Claude call failed: ${(e as Error).message}` };
  }
}

// --- Public entrypoint ------------------------------------------------------

export async function classifyIncoming(
  inc: IncomingJob,
): Promise<{ job: Job; llm_used: boolean; llm_error: string | null }> {
  const now = new Date().toISOString();
  const id = inc.external_id;
  const base = heuristicClassify(inc);

  const { data: llm, error: llm_error } = await llmClassify(inc);
  const llm_used = !!llm;

  const description = llm?.summary || (inc.description_text?.slice(0, 2000) ?? inc.title);

  const job: Job = {
    id,
    title_raw: inc.title,
    title_normalized: inc.title.trim(),
    employer: inc.employer,
    employer_category: llm?.employer_category || base.employer_category || "Crypto protocol",
    domain: llm?.domain || (base.domain as Domain),
    function: llm?.function || (base.function as JobFunction),
    seniority: llm?.seniority || (base.seniority as SeniorityBand),
    tech_stack: llm?.tech_stack || (base.tech_stack as string[]) || [],
    description,
    base_min: llm?.base_min_usd ?? inc.comp_min ?? null,
    base_max: llm?.base_max_usd ?? inc.comp_max ?? null,
    bonus_pct_target: null,
    token_pct_target: llm?.token_pct_target ?? null,
    carry_or_equity_pct: llm?.carry_or_equity_pct ?? null,
    vesting_years: null,
    cliff_months: null,
    location: inc.location,
    remote_policy: llm?.remote_policy || (base.remote_policy as RemotePolicy),
    jurisdiction_required: llm?.jurisdiction_required || (base.jurisdiction_required as Jurisdiction),
    visa_sponsored: llm?.visa_sponsored ?? false,
    regulated: llm?.regulated ?? false,
    stage: llm?.stage || (base.stage as CompanyStage),
    team_size_band: llm?.team_size_band ?? null,
    aum_usd: null,
    source_url: inc.source_url,
    source_channel: inc.source_channel,
    date_posted: inc.date_posted || now,
    date_last_seen: now,
    is_open: true,
    employer_verified: false,
  };
  return { job, llm_used, llm_error };
}
