// Workable Job Board public API.
// Docs: undocumented but stable; it's what apply.workable.com uses internally.
// URL patterns we accept:
//   https://apply.workable.com/<slug>
//   https://apply.workable.com/<slug>/
//   https://<slug>.workable.com/...
//
// API: https://apply.workable.com/api/v3/accounts/<slug>/jobs?limit=100&offset=N
// Returns { results: [...], total: N }, paginated. We follow pagination
// until we've seen everything or hit a hard cap.

import type { IncomingJob } from "./types";
import { htmlToText } from "../html-strip";

export function detectWorkableSlug(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host === "apply.workable.com" || host === "www.apply.workable.com") {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? decodeURIComponent(seg) : null;
    }
    if (host.endsWith(".workable.com")) {
      const sub = host.replace(/\.workable\.com$/, "");
      if (sub && sub !== "apply" && sub !== "www") return sub;
    }
    return null;
  } catch {
    return null;
  }
}

interface WkJob {
  id: string;
  shortcode: string;
  title: string;
  url?: string;
  application_url?: string;
  location?: { city?: string; country?: string; region?: string; remote?: boolean };
  department?: string;
  workplace?: "remote" | "hybrid" | "on_site";
  employment_type?: string;
  description?: string; // HTML
  benefits?: string; // HTML
  requirements?: string; // HTML
  published_on?: string;
  created_at?: string;
}

interface WkResponse {
  results?: WkJob[];
  total?: number;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10; // hard cap so a runaway board can't burn the time budget

function locStr(j: WkJob): string {
  const loc = j.location;
  if (!loc) return j.workplace === "remote" ? "Remote" : "Unknown";
  const parts = [loc.city, loc.region, loc.country].filter(Boolean);
  if (loc.remote || j.workplace === "remote") parts.push("Remote");
  return parts.join(", ") || "Remote";
}

function remoteHint(j: WkJob): "remote" | "hybrid" | "onsite" | null {
  if (j.workplace === "remote" || j.location?.remote) return "remote";
  if (j.workplace === "hybrid") return "hybrid";
  if (j.workplace === "on_site") return "onsite";
  return null;
}

export async function fetchWorkable(sourceUrl: string, employerGuess?: string): Promise<IncomingJob[]> {
  const slug = detectWorkableSlug(sourceUrl);
  if (!slug) throw new Error(`Not a Workable URL: ${sourceUrl}`);
  const employer = employerGuess?.trim() || slug;
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  const accumulator: WkJob[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const url = `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(slug)}/jobs?limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "pow-jobs-ingest/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      // Page 0 failure is fatal; later page failure is a soft stop.
      if (page === 0) throw new Error(`Workable API ${res.status}: ${url}`);
      break;
    }
    const data = (await res.json().catch(() => ({}))) as WkResponse;
    const batch = data.results ?? [];
    accumulator.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return accumulator.map<IncomingJob>((j) => {
    const description = [j.description, j.requirements, j.benefits].filter(Boolean).join("\n\n");
    const text = description ? htmlToText(description) : null;
    const url =
      j.url ??
      j.application_url ??
      `https://apply.workable.com/${slug}/j/${j.shortcode}`;
    return {
      external_id: `workable_${safeSlug}_${j.shortcode || j.id}`,
      source_channel: "workable",
      source_url: url,
      employer,
      title: j.title,
      location: locStr(j),
      remote_hint: remoteHint(j),
      department: j.department ?? null,
      team: null,
      employment_type: j.employment_type ?? null,
      description_html: description || null,
      description_text: text,
      comp_min: null,
      comp_max: null,
      comp_currency: null,
      date_posted: j.published_on || j.created_at || null,
    };
  });
}
