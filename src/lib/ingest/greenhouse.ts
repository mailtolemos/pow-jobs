// Greenhouse Job Board public API.
// Docs: https://developers.greenhouse.io/job-board.html
// Endpoint: https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
// URL patterns we accept:
//   https://boards.greenhouse.io/{token}
//   https://boards.greenhouse.io/embed/job_board?for={token}
//   https://{token}.greenhouse.io/...

import type { IncomingJob } from "./types";

export function detectGreenhouseToken(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host === "boards.greenhouse.io" || host === "boards.eu.greenhouse.io") {
      const q = u.searchParams.get("for");
      if (q) return q;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg && seg !== "embed") return seg;
      return null;
    }
    if (host.endsWith(".greenhouse.io")) {
      const sub = host.replace(/\.greenhouse\.io$/, "");
      if (sub && sub !== "boards" && sub !== "boards.eu") return sub;
    }
    return null;
  } catch {
    return null;
  }
}

interface GhOffice {
  name?: string;
  location?: string;
}
interface GhDept {
  name?: string;
}
interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  offices?: GhOffice[];
  departments?: GhDept[];
  updated_at?: string;
  first_published?: string;
  content?: string; // HTML
}

function remoteHint(loc: string): "remote" | "hybrid" | "onsite" | null {
  const s = loc.toLowerCase();
  if (/remote/.test(s) && /hybrid/.test(s)) return "hybrid";
  if (/remote/.test(s)) return "remote";
  if (/hybrid/.test(s)) return "hybrid";
  if (/office|onsite|on-site/.test(s)) return "onsite";
  return null;
}

function stripHtml(html: string): string {
  // Simple HTML→text for description. Good enough for LLM classification.
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
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

export async function fetchGreenhouse(sourceUrl: string, employerGuess?: string): Promise<IncomingJob[]> {
  const token = detectGreenhouseToken(sourceUrl);
  if (!token) throw new Error(`Not a Greenhouse URL: ${sourceUrl}`);
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const res = await fetch(apiUrl, {
    headers: { accept: "application/json", "user-agent": "pow-jobs-ingest/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Greenhouse API ${res.status}: ${apiUrl}`);
  const data = (await res.json()) as { jobs?: GhJob[] };
  const employer = employerGuess?.trim() || token;
  return (data.jobs ?? []).map<IncomingJob>((j) => {
    const loc = j.location?.name || (j.offices ?? []).map((o) => o.name || o.location).filter(Boolean).join("; ") || "Remote";
    const dept = (j.departments ?? []).map((d) => d.name).filter(Boolean).join(", ") || null;
    const html = j.content || "";
    const text = html ? stripHtml(html) : null;
    return {
      external_id: `gh_${token}_${j.id}`,
      source_channel: "greenhouse",
      source_url: j.absolute_url,
      employer,
      title: j.title,
      location: loc,
      remote_hint: remoteHint(loc),
      department: dept,
      team: null,
      employment_type: null,
      description_html: html || null,
      description_text: text,
      comp_min: null,
      comp_max: null,
      comp_currency: null,
      date_posted: j.first_published || j.updated_at || null,
    };
  });
}
