// Recruitee public Job Board API.
// Endpoint: https://<slug>.recruitee.com/api/offers/  (returns full list)
// URL patterns we accept:
//   https://<slug>.recruitee.com/
//   https://careers.<domain>/  (when CNAMEd to recruitee — we try recruitee
//                                first via the slug from the URL)

import type { IncomingJob } from "./types";
import { htmlToText } from "../html-strip";

export function detectRecruiteeSlug(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host.endsWith(".recruitee.com")) {
      const sub = host.replace(/\.recruitee\.com$/, "");
      if (sub && sub !== "www") return sub;
    }
    return null;
  } catch {
    return null;
  }
}

interface RtOffer {
  id: number;
  slug: string;
  title: string;
  status?: string;
  city?: string;
  country?: string;
  location?: string;
  remote?: boolean;
  department?: string;
  employment_type_code?: string;
  description?: string; // HTML
  requirements?: string; // HTML
  careers_url?: string;
  url?: string;
  created_at?: string;
}

interface RtResponse {
  offers?: RtOffer[];
}

export async function fetchRecruitee(sourceUrl: string, employerGuess?: string): Promise<IncomingJob[]> {
  const slug = detectRecruiteeSlug(sourceUrl);
  if (!slug) throw new Error(`Not a Recruitee URL: ${sourceUrl}`);
  const employer = employerGuess?.trim() || slug;
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  const apiUrl = `https://${slug}.recruitee.com/api/offers/`;
  const res = await fetch(apiUrl, {
    headers: { accept: "application/json", "user-agent": "pow-jobs-ingest/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Recruitee API ${res.status}: ${apiUrl}`);
  const data = (await res.json().catch(() => ({}))) as RtResponse;
  const offers = (data.offers ?? []).filter((o) => !o.status || o.status === "published");

  return offers.map<IncomingJob>((o) => {
    const description = [o.description, o.requirements].filter(Boolean).join("\n\n");
    const text = description ? htmlToText(description) : null;
    const loc =
      o.location ?? [o.city, o.country].filter(Boolean).join(", ") ?? "Remote";
    const url = o.careers_url || o.url || `https://${slug}.recruitee.com/o/${o.slug}`;
    return {
      external_id: `recruitee_${safeSlug}_${o.id}`,
      source_channel: "recruitee",
      source_url: url,
      employer,
      title: o.title,
      location: loc || "Remote",
      remote_hint: o.remote ? "remote" : null,
      department: o.department ?? null,
      team: null,
      employment_type: o.employment_type_code ?? null,
      description_html: description || null,
      description_text: text,
      comp_min: null,
      comp_max: null,
      comp_currency: null,
      date_posted: o.created_at ?? null,
    };
  });
}
