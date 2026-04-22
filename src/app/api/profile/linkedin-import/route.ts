// POST /api/profile/linkedin-import  { text, linkedin_url? }
// Extracts structured profile suggestions from pasted LinkedIn About/Experience text.
// Uses Claude if ANTHROPIC_API_KEY is set; otherwise runs a heuristic fallback.

import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Input = z.object({
  text: z.string().min(20).max(12_000),
  linkedin_url: z.string().url().max(300).nullable().optional(),
});

const ExtractSchema = z.object({
  headline: z.string().optional(),
  current_role: z.string().optional(),
  current_employer: z.string().optional(),
  years_experience: z.number().optional(),
  seniority_band: z
    .enum(["ic1", "ic2", "ic3", "ic4", "ic5", "ic6", "ic7", "m1", "m2", "m3", "m4", "m5"])
    .optional(),
  education: z.string().optional(),
  domains_of_interest: z.array(z.string()).optional(),
  functions: z.array(z.string()).optional(),
  tech_stack: z.array(z.string()).optional(),
});

const SYSTEM = `You extract structured data from copy-pasted LinkedIn profiles.
Return ONLY a JSON object matching this shape (all fields optional, omit if not confident):
{
  "headline": string (<= 200 chars, action-oriented),
  "current_role": string,
  "current_employer": string,
  "years_experience": integer,
  "seniority_band": "ic1"|"ic2"|"ic3"|"ic4"|"ic5"|"ic6"|"ic7"|"m1"|"m2"|"m3"|"m4"|"m5",
  "education": string,
  "domains_of_interest": string[] — pick from: "crypto:defi","crypto:infra","crypto:l1","crypto:l2","crypto:application","crypto:analytics","crypto:trading","crypto:security","finance:systematic","finance:discretionary","finance:macro","finance:credit","finance:equities","finance:fi","finance:hft","finance:prop","finance:hedgefund","finance:banking","fintech",
  "functions": string[] — pick from: "engineering","quant-research","trading","product","design","ops","business","legal-compliance","data",
  "tech_stack": string[] — languages, frameworks, tools as short tokens (e.g., "Rust","Solidity","Python","kdb+")
}
Be conservative. Only include a field if evidence is clear. No markdown, no commentary.`;

async function callClaude(text: string): Promise<unknown | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: "user", content: `LinkedIn paste:\n\n${text}\n\nReturn JSON only.` }],
    });
    const body = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const m = body.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function heuristicExtract(text: string): Record<string, unknown> {
  const t = text;
  const lower = t.toLowerCase();
  const patch: Record<string, unknown> = {};

  // Grab a plausible headline: first non-empty short-ish line
  const firstLine = t
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.length > 10 && s.length < 220);
  if (firstLine) patch.headline = firstLine;

  // Years of experience: look for "X years" or "X YoE"
  const yearsMatch = lower.match(/(\d{1,2})\s*(?:\+\s*)?(?:years?|yoe|yrs)/);
  if (yearsMatch) patch.years_experience = Math.min(60, parseInt(yearsMatch[1], 10));

  // Seniority heuristic
  const seniorityMap: Array<[string, string[]]> = [
    ["m5", ["vp ", "vice president", "svp"]],
    ["m4", ["director of", "sr. director", "senior director"]],
    ["m3", ["director"]],
    ["m2", ["senior manager", "sr. manager", "sr manager"]],
    ["m1", ["manager", "team lead"]],
    ["ic7", ["distinguished"]],
    ["ic6", ["principal"]],
    ["ic5", ["staff engineer", "staff researcher"]],
    ["ic4", ["senior engineer", "senior software", "sr engineer", "senior researcher"]],
    ["ic3", ["software engineer ii", "engineer ii"]],
    ["ic2", ["engineer i", "software engineer i"]],
    ["ic1", ["junior"]],
  ];
  for (const [band, keywords] of seniorityMap) {
    if (keywords.some((k) => lower.includes(k))) {
      patch.seniority_band = band;
      break;
    }
  }

  // Tech stack — tokens mentioned literally
  const candidates = [
    "Rust", "Solidity", "Python", "Java", "Go", "Scala", "Haskell", "OCaml",
    "C++", "C#", "JAX", "PyTorch", "TensorFlow", "kdb+", "kdb", "q", "R",
    "SQL", "PostgreSQL", "Redis", "Kafka", "Foundry", "Hardhat", "Ethers",
    "Viem", "React", "Next.js", "TypeScript", "JavaScript", "Node.js",
    "AWS", "GCP", "Kubernetes", "Docker", "Terraform",
  ];
  const stack: string[] = [];
  for (const tok of candidates) {
    const rx = new RegExp(`(?<![A-Za-z0-9])${tok.replace(/[+.]/g, "\\$&")}(?![A-Za-z0-9])`, "i");
    if (rx.test(t)) stack.push(tok);
  }
  if (stack.length) patch.tech_stack = stack;

  // Domains — keyword hits
  const domainHits: Array<[string, string[]]> = [
    ["crypto:defi", ["defi", "liquidity", "amm", "perp"]],
    ["crypto:infra", ["mev", "rollup", "validator", "execution client", "sequencer"]],
    ["crypto:l1", ["layer 1", "l1 protocol"]],
    ["crypto:l2", ["layer 2", "rollup"]],
    ["crypto:trading", ["market making", "mm desk", "maker-taker"]],
    ["crypto:security", ["smart contract audit", "formal verification"]],
    ["crypto:analytics", ["on-chain analytics", "dune"]],
    ["finance:systematic", ["systematic", "quant fund", "signal research"]],
    ["finance:hft", ["hft", "high-frequency", "market microstructure"]],
    ["finance:discretionary", ["discretionary", "long/short"]],
    ["finance:macro", ["global macro"]],
    ["finance:credit", ["credit strategy", "credit trader"]],
    ["finance:equities", ["equity research", "equities trader"]],
    ["finance:prop", ["prop shop", "proprietary trading"]],
    ["finance:hedgefund", ["hedge fund"]],
    ["finance:banking", ["investment banking", "ib analyst"]],
    ["fintech", ["fintech"]],
  ];
  const domains: string[] = [];
  for (const [d, keywords] of domainHits) {
    if (keywords.some((k) => lower.includes(k))) domains.push(d);
  }
  if (domains.length) patch.domains_of_interest = domains;

  // Functions
  const fns: string[] = [];
  if (/\b(engineer|engineering|software|developer)\b/.test(lower)) fns.push("engineering");
  if (/\b(quant(?!itative)|quantitative researcher|quant research)\b/.test(lower)) fns.push("quant-research");
  if (/\b(trader|trading desk|market maker)\b/.test(lower)) fns.push("trading");
  if (/\bproduct manager\b/.test(lower)) fns.push("product");
  if (/\bdesigner\b/.test(lower)) fns.push("design");
  if (/\bdata (engineer|scientist|analyst)\b/.test(lower)) fns.push("data");
  if (fns.length) patch.functions = Array.from(new Set(fns));

  return patch;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "need at least a few sentences of text" }, { status: 400 });

  const extracted = (await callClaude(parsed.data.text)) ?? heuristicExtract(parsed.data.text);
  const safe = ExtractSchema.safeParse(extracted);
  if (!safe.success) {
    return NextResponse.json({ ok: false, error: "extractor returned malformed data" }, { status: 500 });
  }

  const patch: Record<string, unknown> = { ...safe.data };
  if (parsed.data.linkedin_url) patch.linkedin_url = parsed.data.linkedin_url;

  return NextResponse.json({ ok: true, patch });
}
