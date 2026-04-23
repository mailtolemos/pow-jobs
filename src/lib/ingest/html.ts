// Generic HTML career-page fallback.
// For career pages without a well-known ATS, we fetch the HTML, strip it to
// visible text, and ask Claude to extract a list of role postings. This is
// intentionally best-effort: we won't hit every custom site, but it covers
// enough ground to be useful.

import Anthropic from "@anthropic-ai/sdk";
import type { IncomingJob } from "./types";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function client(): Anthropic | null {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _client = new Anthropic({ apiKey: key });
  return _client;
}

function stripToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "$2 [$1]")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

export async function fetchHtmlCareerPage(sourceUrl: string, employerGuess?: string): Promise<IncomingJob[]> {
  const c = client();
  if (!c) throw new Error("Generic HTML fallback requires ANTHROPIC_API_KEY to be set");
  const res = await fetch(sourceUrl, {
    headers: {
      accept: "text/html",
      "user-agent":
        "Mozilla/5.0 (compatible; pow-jobs-ingest/1.0; +https://pow-jobs.vercel.app)",
    },
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTML fetch ${res.status}: ${sourceUrl}`);
  const html = await res.text();
  const text = stripToText(html).slice(0, 60000); // cap prompt size

  const employer = employerGuess?.trim() || hostnameOf(sourceUrl);

  const system = `You extract open roles from a company's public career page. Return a strict JSON object with shape:
{"jobs": [{"title": string, "url": string (absolute), "location": string, "department": string|null}]}
Only include real, currently-listed roles. Every department, every team. Skip generic "apply" links, newsletter CTAs, and non-role entries. No prose.`;

  const user = `Career page URL: ${sourceUrl}
Employer guess: ${employer}

Page text (whitespace-normalized):
${text}`;

  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  const raw = resp.content
    .filter((b) => b.type === "text")
    .map((b) => ("text" in b ? b.text : ""))
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  let parsed: { jobs?: Array<{ title?: string; url?: string; location?: string; department?: string | null }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const origin = (() => {
    try {
      return new URL(sourceUrl).origin;
    } catch {
      return "";
    }
  })();

  return (parsed.jobs ?? [])
    .filter((j) => j.title && j.url)
    .map<IncomingJob>((j) => {
      let absolute = j.url as string;
      if (absolute && !/^https?:\/\//i.test(absolute)) {
        absolute = absolute.startsWith("/") ? `${origin}${absolute}` : `${origin}/${absolute}`;
      }
      const ext = `html_${hostnameOf(sourceUrl)}_${Buffer.from(absolute).toString("base64url").slice(0, 24)}`;
      return {
        external_id: ext,
        source_channel: "html",
        source_url: absolute,
        employer,
        title: (j.title || "").trim(),
        location: (j.location || "Remote").trim(),
        remote_hint: null,
        department: j.department ?? null,
        team: null,
        employment_type: null,
        description_html: null,
        description_text: null,
        comp_min: null,
        comp_max: null,
        comp_currency: null,
        date_posted: null,
      };
    });
}
