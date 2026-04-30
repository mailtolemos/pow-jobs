// SmartRecruiters public Job Board API.
// Docs: https://developers.smartrecruiters.com/reference/postingapiget
// Endpoint: https://api.smartrecruiters.com/v1/companies/<slug>/postings?limit=100&offset=N
// URL patterns we accept:
//   https://careers.smartrecruiters.com/<slug>
//   https://jobs.smartrecruiters.com/<slug>
//   https://www.smartrecruiters.com/<slug>

import type { IncomingJob } from "./types";

export function detectSmartRecruitersSlug(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (
      host === "careers.smartrecruiters.com" ||
      host === "jobs.smartrecruiters.com" ||
      host === "www.smartrecruiters.com" ||
      host === "smartrecruiters.com"
    ) {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? decodeURIComponent(seg) : null;
    }
    return null;
  } catch {
    return null;
  }
}

interface SrPosting {
  id: string;
  uuid?: string;
  name: string;
  ref?: string;
  releasedDate?: string;
  postingUrl?: string;
  applyUrl?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  department?: { label?: string };
  function?: { label?: string };
  industry?: { label?: string };
  typeOfEmployment?: { label?: string };
}

interface SrResponse {
  offset?: number;
  limit?: number;
  totalFound?: number;
  content?: SrPosting[];
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

function locStr(p: SrPosting): string {
  const loc = p.location;
  if (!loc) return "Unknown";
  const parts = [loc.city, loc.region, loc.country].filter(Boolean);
  if (loc.remote) parts.push("Remote");
  return parts.join(", ") || "Remote";
}

export async function fetchSmartRecruiters(
  sourceUrl: string,
  employerGuess?: string,
): Promise<IncomingJob[]> {
  const slug = detectSmartRecruitersSlug(sourceUrl);
  if (!slug) throw new Error(`Not a SmartRecruiters URL: ${sourceUrl}`);
  const employer = employerGuess?.trim() || slug;
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  const accumulator: SrPosting[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "pow-jobs-ingest/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      if (page === 0) throw new Error(`SmartRecruiters API ${res.status}: ${url}`);
      break;
    }
    const data = (await res.json().catch(() => ({}))) as SrResponse;
    const batch = data.content ?? [];
    accumulator.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return accumulator.map<IncomingJob>((p) => ({
    external_id: `sr_${safeSlug}_${p.id}`,
    source_channel: "smartrecruiters",
    source_url:
      p.postingUrl ??
      `https://careers.smartrecruiters.com/${slug}/${encodeURIComponent(p.id)}`,
    employer,
    title: p.name,
    location: locStr(p),
    remote_hint: p.location?.remote ? "remote" : null,
    department: p.department?.label ?? null,
    team: p.function?.label ?? null,
    employment_type: p.typeOfEmployment?.label ?? null,
    // SmartRecruiters' /postings endpoint returns metadata only; the full
    // description requires a per-posting follow-up call. We skip that to keep
    // the time budget — the LLM classifier still has employer + title + dept
    // + function to work with.
    description_html: null,
    description_text: null,
    comp_min: null,
    comp_max: null,
    comp_currency: null,
    date_posted: p.releasedDate ?? null,
  }));
}
