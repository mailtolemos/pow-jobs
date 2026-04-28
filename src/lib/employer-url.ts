// Derive a "company-level" URL from a job's source so the employer name in
// the UI links to the company's full board, not the single role.
//
// Examples
//   ashby     https://jobs.ashbyhq.com/coinbase/abc123  → https://jobs.ashbyhq.com/coinbase
//   greenhouse https://boards.greenhouse.io/coinbase/jobs/12345 → https://boards.greenhouse.io/coinbase
//   lever     https://jobs.lever.co/coinbase/abc123 → https://jobs.lever.co/coinbase

import type { Job } from "./types";

export function employerBoardUrl(job: Pick<Job, "source_channel" | "source_url" | "employer">): string | null {
  const url = job.source_url || "";
  try {
    const u = new URL(url);
    const ch = (job.source_channel || "").toLowerCase();
    const segs = u.pathname.split("/").filter(Boolean);
    if (ch === "ashby" || u.hostname.includes("ashbyhq.com")) {
      // first segment after / is the slug
      if (segs[0]) return `https://jobs.ashbyhq.com/${segs[0]}`;
    }
    if (ch === "greenhouse" || u.hostname.includes("greenhouse.io")) {
      if (segs[0]) return `https://boards.greenhouse.io/${segs[0]}`;
    }
    if (ch === "lever" || u.hostname.includes("lever.co")) {
      if (segs[0]) return `https://jobs.lever.co/${segs[0]}`;
    }
    // Fallback: protocol + host (homepage of whatever the source URL was on).
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}
