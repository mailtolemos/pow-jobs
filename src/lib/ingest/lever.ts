// Lever public postings API.
// Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
// URL patterns we accept:
//   https://jobs.lever.co/{slug}
//   https://jobs.lever.co/{slug}/...
//   https://api.lever.co/v0/postings/{slug}

import type { IncomingJob } from "./types";

export function detectLeverSlug(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host === "jobs.lever.co") {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg || null;
    }
    if (host === "api.lever.co") {
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.indexOf("postings");
      return i >= 0 ? parts[i + 1] || null : null;
    }
    return null;
  } catch {
    return null;
  }
}

interface LeverPosting {
  id: string;
  text: string;
  categories?: {
    team?: string;
    department?: string;
    commitment?: string;
    location?: string;
    allLocations?: string[];
  };
  hostedUrl: string;
  descriptionPlain?: string;
  description?: string;
  additionalPlain?: string;
  createdAt?: number;
}

function remoteHint(loc: string): "remote" | "hybrid" | "onsite" | null {
  const s = loc.toLowerCase();
  if (/remote/.test(s) && /hybrid/.test(s)) return "hybrid";
  if (/remote/.test(s)) return "remote";
  if (/hybrid/.test(s)) return "hybrid";
  if (/office|onsite|on-site/.test(s)) return "onsite";
  return null;
}

export async function fetchLever(sourceUrl: string, employerGuess?: string): Promise<IncomingJob[]> {
  const slug = detectLeverSlug(sourceUrl);
  if (!slug) throw new Error(`Not a Lever URL: ${sourceUrl}`);
  const apiUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const res = await fetch(apiUrl, {
    headers: { accept: "application/json", "user-agent": "pow-jobs-ingest/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Lever API ${res.status}: ${apiUrl}`);
  const data = (await res.json()) as LeverPosting[];
  const employer = employerGuess?.trim() || slug;
  return (data ?? []).map<IncomingJob>((j) => {
    const cat = j.categories ?? {};
    const loc = cat.location || (cat.allLocations ?? []).join("; ") || "Remote";
    const body = [j.descriptionPlain, j.additionalPlain].filter(Boolean).join("\n\n");
    return {
      external_id: `lever_${slug}_${j.id}`,
      source_channel: "lever",
      source_url: j.hostedUrl,
      employer,
      title: j.text,
      location: loc,
      remote_hint: remoteHint(loc),
      department: cat.department || null,
      team: cat.team || null,
      employment_type: cat.commitment || null,
      description_html: j.description || null,
      description_text: body || null,
      comp_min: null,
      comp_max: null,
      comp_currency: null,
      date_posted: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    };
  });
}
