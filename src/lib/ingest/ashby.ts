// Ashby public job-board API fetcher.
// Docs: https://developers.ashbyhq.com/reference/publicjobpostinglist
// The public endpoint is: https://api.ashbyhq.com/posting-api/job-board/{slug}
// where {slug} is the Ashby org slug. URL patterns we accept:
//   https://jobs.ashbyhq.com/{slug}
//   https://jobs.ashbyhq.com/{slug}/...
//   https://api.ashbyhq.com/posting-api/job-board/{slug}
//   {slug}.ashbyhq.com

import type { IncomingJob } from "./types";

// Safely decode a URL path segment. Path segments can contain %-escapes
// (e.g. "Solana%20Foundation" for an org slug with a space), and we must
// decode to the raw slug before re-encoding in the API URL — otherwise the
// % gets double-encoded to %25.
function decodeSeg(seg: string | undefined): string | null {
  if (!seg) return null;
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

export function detectAshbySlug(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host === "jobs.ashbyhq.com") {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return decodeSeg(seg);
    }
    if (host === "api.ashbyhq.com") {
      // /posting-api/job-board/{slug}
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.indexOf("job-board");
      return i >= 0 ? decodeSeg(parts[i + 1]) : null;
    }
    if (host.endsWith(".ashbyhq.com")) {
      return host.split(".")[0];
    }
    return null;
  } catch {
    return null;
  }
}

interface AshbyJob {
  id: string;
  title: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }>;
  isListed?: boolean;
  isRemote?: boolean;
  descriptionHtml?: string;
  descriptionPlain?: string;
  jobUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  compensation?: {
    compensationTierSummary?: string;
    summaryComponents?: Array<{
      minValue?: number;
      maxValue?: number;
      currencyCode?: string;
      compensationType?: string;
      interval?: string;
    }>;
  };
}

interface AshbyBoardResponse {
  jobs?: AshbyJob[];
}

// Best-effort remote policy classification from Ashby strings
function remoteHint(j: AshbyJob): "remote" | "hybrid" | "onsite" | null {
  if (j.isRemote) return "remote";
  const s = `${j.location ?? ""} ${(j.secondaryLocations ?? []).map((x) => x.location).join(" ")}`.toLowerCase();
  if (/remote/.test(s) && /hybrid/.test(s)) return "hybrid";
  if (/remote/.test(s)) return "remote";
  if (/hybrid/.test(s)) return "hybrid";
  if (/office|onsite|on-site/.test(s)) return "onsite";
  return null;
}

function pickBaseComp(j: AshbyJob): { min: number | null; max: number | null; currency: string | null } {
  const comps = j.compensation?.summaryComponents ?? [];
  const base = comps.find(
    (c) => (c.compensationType ?? "").toLowerCase() === "salary" && (c.interval ?? "").toLowerCase().includes("year"),
  );
  if (base) {
    return {
      min: base.minValue ?? null,
      max: base.maxValue ?? null,
      currency: base.currencyCode ?? null,
    };
  }
  return { min: null, max: null, currency: null };
}

export async function fetchAshby(sourceUrl: string, employerGuess?: string): Promise<IncomingJob[]> {
  const slug = detectAshbySlug(sourceUrl);
  if (!slug) throw new Error(`Not an Ashby URL: ${sourceUrl}`);

  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`;
  const res = await fetch(apiUrl, {
    headers: { accept: "application/json", "user-agent": "pow-jobs-ingest/1.0" },
    // Vercel edge/runtime: avoid Next's fetch cache for live data
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Ashby API ${res.status}: ${apiUrl}`);
  const data = (await res.json()) as AshbyBoardResponse;
  const jobs = data.jobs ?? [];

  const employer = employerGuess?.trim() || slug;
  return jobs
    .filter((j) => j.isListed !== false)
    .map<IncomingJob>((j) => {
      const comp = pickBaseComp(j);
      const locs = [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)]
        .filter(Boolean)
        .join("; ");
      // Sanitize slug for the id since raw slug may contain spaces or punctuation.
      const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
      return {
        external_id: `ashby_${safeSlug}_${j.id}`,
        source_channel: "ashby",
        source_url: j.jobUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
        employer,
        title: (j.title || "").trim(),
        location: locs || "Remote",
        remote_hint: remoteHint(j),
        department: j.department || null,
        team: j.team || null,
        employment_type: j.employmentType || null,
        description_html: j.descriptionHtml || null,
        description_text: j.descriptionPlain || null,
        comp_min: comp.min,
        comp_max: comp.max,
        comp_currency: comp.currency,
        date_posted: j.publishedAt || j.updatedAt || null,
      };
    });
}
