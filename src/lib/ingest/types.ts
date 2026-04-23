// Normalized shape that ATS-specific fetchers emit before classification.
// We stay lossy-but-structured: we capture what the source gave us directly,
// then a classifier (LLM-backed) fills in PoW Jobs' opinionated fields
// (domain, seniority, stage, tech_stack, comp) for the final Job shape.

export interface IncomingJob {
  // Stable per-source id (used to build the final jobs.id)
  external_id: string;
  // Source provenance
  source_channel: string; // "ashby" | "greenhouse" | "lever" | "html" | "rss"
  source_url: string; // canonical URL of THIS role (not the board)
  // What the board told us
  employer: string;
  title: string;
  location: string;
  remote_hint: "remote" | "hybrid" | "onsite" | null;
  department: string | null;
  team: string | null;
  employment_type: string | null; // "FullTime" | "Contract" | etc
  description_html: string | null;
  description_text: string | null;
  // Comp (if the board exposed it)
  comp_min: number | null;
  comp_max: number | null;
  comp_currency: string | null;
  // Posting dates
  date_posted: string | null; // ISO
}

export interface IngestResult {
  source_id: string;
  fetched: number; // total returned by upstream
  created: number; // new in our DB
  updated: number; // existing ids refreshed
  skipped: number; // e.g. non-english, or filtered
  errors: string[];
  duration_ms: number;
}
