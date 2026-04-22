// SQLite schema as a TS string constant so it bundles into Next.js serverless functions.
// Kept in sync with schema.sql (source of truth for CLI tooling).

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title_raw TEXT NOT NULL,
  title_normalized TEXT NOT NULL,
  employer TEXT NOT NULL,
  employer_category TEXT NOT NULL,
  domain TEXT NOT NULL,
  function TEXT NOT NULL,
  seniority TEXT NOT NULL,
  tech_stack TEXT NOT NULL,
  description TEXT NOT NULL,
  base_min INTEGER,
  base_max INTEGER,
  bonus_pct_target REAL,
  token_pct_target REAL,
  carry_or_equity_pct REAL,
  vesting_years REAL,
  cliff_months INTEGER,
  location TEXT NOT NULL,
  remote_policy TEXT NOT NULL,
  jurisdiction_required TEXT NOT NULL,
  visa_sponsored INTEGER NOT NULL,
  regulated INTEGER NOT NULL,
  stage TEXT NOT NULL,
  team_size_band TEXT,
  aum_usd INTEGER,
  source_url TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  date_posted TEXT NOT NULL,
  date_last_seen TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1,
  employer_verified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_jobs_open ON jobs(is_open, domain);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  identity_mode TEXT NOT NULL,
  headline TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  current_role TEXT NOT NULL,
  current_employer TEXT NOT NULL,
  education TEXT NOT NULL,
  linkedin_url TEXT,
  github_url TEXT,
  farcaster_handle TEXT,
  wallet_address TEXT,
  domains_of_interest TEXT NOT NULL,
  functions TEXT NOT NULL,
  seniority_band TEXT NOT NULL,
  tech_stack TEXT NOT NULL,
  comp_floor_usd INTEGER NOT NULL,
  jurisdiction_ok TEXT NOT NULL,
  remote_policy_ok TEXT NOT NULL,
  visa_needed INTEGER NOT NULL,
  max_regulated_ok INTEGER NOT NULL,
  weight_comp REAL NOT NULL,
  weight_domain_fit REAL NOT NULL,
  weight_team_quality REAL NOT NULL,
  weight_token_upside REAL NOT NULL,
  dealbreakers TEXT NOT NULL,
  saved_job_ids TEXT NOT NULL,
  dismissed_job_ids TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  job_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  score REAL NOT NULL,
  structured_score REAL NOT NULL,
  llm_score REAL,
  hard_filter_pass INTEGER NOT NULL,
  rationale TEXT NOT NULL,
  failed_filters TEXT NOT NULL,
  computed_at TEXT NOT NULL,
  PRIMARY KEY (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_cand ON matches(candidate_id, score DESC);

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interactions_cand ON interactions(candidate_id, created_at DESC);
`;
