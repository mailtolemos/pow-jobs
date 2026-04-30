// Generic HTML career-page fallback.
// For career pages without a well-known ATS, we fetch the HTML, strip it to
// visible text, and ask the configured LLM to extract a list of role postings.
// Provider resolution (Groq > Anthropic) lives in ../llm; this file only asks
// for extraction.

import type { IncomingJob } from "./types";
import { chatJSON, isLLMAvailable } from "../llm";

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

// Detect pages where the interesting content is rendered client-side. If we
// see almost no visible text, virtually no anchors, or classic SPA markers,
// we can't extract roles from the static HTML and we tell the user plainly
// instead of silently returning zero jobs.
function looksLikeSPA(html: string, text: string): string | null {
  const textLen = text.length;
  const anchorCount = (html.match(/<a\b/gi) ?? []).length;
  const jobHintCount = (text.match(/(?:apply|role|engineer|manager|lead|analyst|director|research)/gi) ?? []).length;
  if (textLen < 600) return `only ${textLen} chars of visible text`;
  if (anchorCount < 5) return `only ${anchorCount} links in the HTML`;
  if (jobHintCount < 2) return "no obvious role keywords in the static HTML";
  // React / Next / Vue root markers present AND very little prose → almost
  // certainly JS-rendered.
  if (/<div[^>]+id="(?:__next|root|app)"/i.test(html) && textLen < 3000) {
    return "JS-rendered root with little static content";
  }
  return null;
}

// Walk paginated career pages: when we see rel="next" or a recognisable
// "?page=N" / "/page/N/" link in the HTML, follow up to N more pages and
// concatenate their text. This is a best-effort fix for boards that
// paginate without JS — Workday-style SPAs still need their own adapter
// (and we already throw a helpful error for those).
const MAX_PAGES = 5;
const PAGE_TIMEOUT_MS = 12_000;

async function fetchHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: {
        accept: "text/html",
        "user-agent":
          "Mozilla/5.0 (compatible; pow-jobs-ingest/1.0; +https://pow-jobs.vercel.app)",
      },
      cache: "no-store",
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTML fetch ${r.status}: ${url}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

function findNextPageUrl(html: string, current: string): string | null {
  // Common shapes for a "next page" link in static HTML.
  const patterns = [
    /<link\s+rel=["']next["']\s+href=["']([^"']+)["']/i,
    /<a\s+[^>]*rel=["']next["'][^>]*href=["']([^"']+)["']/i,
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']next["']/i,
    /<a\s+[^>]*aria-label=["'](?:next|next page)["'][^>]*href=["']([^"']+)["']/i,
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*aria-label=["'](?:next|next page)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) {
      try {
        return new URL(m[1], current).toString();
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export async function fetchHtmlCareerPage(sourceUrl: string, employerGuess?: string): Promise<IncomingJob[]> {
  if (!isLLMAvailable()) {
    throw new Error(
      "Generic HTML fallback requires an LLM: set GROQ_API_KEY (free) or ANTHROPIC_API_KEY on Vercel and redeploy",
    );
  }
  let firstHtml: string;
  try {
    firstHtml = await fetchHtml(sourceUrl);
  } catch (e) {
    throw new Error(`HTML fetch failed: ${(e as Error).message}`);
  }
  // Follow up to MAX_PAGES of pagination, accumulating the visible text from
  // each page so the LLM extractor can see roles spread across multiple pages.
  const visited = new Set<string>([sourceUrl]);
  const accumulator: string[] = [stripToText(firstHtml)];
  let currentHtml = firstHtml;
  let currentUrl = sourceUrl;
  for (let i = 0; i < MAX_PAGES - 1; i += 1) {
    const next = findNextPageUrl(currentHtml, currentUrl);
    if (!next || visited.has(next)) break;
    visited.add(next);
    try {
      const h = await fetchHtml(next);
      accumulator.push(stripToText(h));
      currentHtml = h;
      currentUrl = next;
    } catch {
      // One bad page shouldn't kill the rest of the ingest.
      break;
    }
  }
  const html = firstHtml;
  // Cap the LLM input — multi-page accumulation can grow fast, and Groq has
  // strict TPM limits.
  const text = accumulator.join("\n\n").slice(0, 36000);

  // SPA early-return: if the static HTML doesn't have real content, give the
  // user an actionable message instead of silently spending an LLM call that
  // comes back with zero jobs.
  const spaReason = looksLikeSPA(html, text);
  if (spaReason) {
    throw new Error(
      `This looks like a JS-rendered career page (${spaReason}). The static HTML has no listings to extract — try pointing at the company's Ashby/Greenhouse/Lever board URL instead.`,
    );
  }

  const employer = employerGuess?.trim() || hostnameOf(sourceUrl);

  const system = `You extract open roles from a company's public career page. Return a strict JSON object with shape:
{"jobs": [{"title": string, "url": string (absolute), "location": string, "department": string|null}]}
Only include real, currently-listed roles. Every department, every team. Skip generic "apply" links, newsletter CTAs, and non-role entries. No prose.`;

  const user = `Career page URL: ${sourceUrl}
Employer guess: ${employer}

Page text (whitespace-normalized):
${text}`;

  const { data, error } = await chatJSON<{
    jobs?: Array<{ title?: string; url?: string; location?: string; department?: string | null }>;
  }>({ system, user, maxTokens: 4096 });

  if (!data) {
    throw new Error(error || "HTML extractor: LLM returned no usable JSON");
  }
  if (!data.jobs || data.jobs.length === 0) {
    throw new Error(
      "LLM extracted no roles from the static HTML — the page may be JS-rendered, have moved, or require login. Try the company's direct ATS URL (Ashby/Greenhouse/Lever).",
    );
  }

  const origin = (() => {
    try {
      return new URL(sourceUrl).origin;
    } catch {
      return "";
    }
  })();

  return (data.jobs ?? [])
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
