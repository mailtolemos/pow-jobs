// Postgres schema — idempotent DDL that can be safely re-run on every cold start
// or via `npm run migrate`. Uses Neon-compatible types (jsonb, timestamptz, text).

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
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
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
  visa_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  regulated BOOLEAN NOT NULL DEFAULT FALSE,
  stage TEXT NOT NULL,
  team_size_band TEXT,
  aum_usd BIGINT,
  source_url TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  date_posted TIMESTAMPTZ NOT NULL,
  date_last_seen TIMESTAMPTZ NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  employer_verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_jobs_open ON jobs(is_open, domain);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer);
CREATE INDEX IF NOT EXISTS idx_jobs_date_posted ON jobs(date_posted DESC);

-- Users: one row per authenticated account. Candidate profile lives in the
-- candidates table and points back via user_id. Demo personas have user_id = NULL.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  identity_mode TEXT NOT NULL,
  headline TEXT NOT NULL,
  years_experience INTEGER NOT NULL DEFAULT 0,
  "current_role" TEXT NOT NULL DEFAULT '',
  current_employer TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT,
  github_url TEXT,
  farcaster_handle TEXT,
  wallet_address TEXT,
  domains_of_interest JSONB NOT NULL DEFAULT '[]'::jsonb,
  functions JSONB NOT NULL DEFAULT '[]'::jsonb,
  seniority_band TEXT NOT NULL DEFAULT 'ic4',
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
  comp_floor_usd INTEGER NOT NULL DEFAULT 0,
  jurisdiction_ok JSONB NOT NULL DEFAULT '[]'::jsonb,
  remote_policy_ok JSONB NOT NULL DEFAULT '[]'::jsonb,
  visa_needed BOOLEAN NOT NULL DEFAULT FALSE,
  max_regulated_ok BOOLEAN NOT NULL DEFAULT TRUE,
  weight_comp REAL NOT NULL DEFAULT 0.5,
  weight_domain_fit REAL NOT NULL DEFAULT 0.5,
  weight_team_quality REAL NOT NULL DEFAULT 0.5,
  weight_token_upside REAL NOT NULL DEFAULT 0.3,
  dealbreakers JSONB NOT NULL DEFAULT '[]'::jsonb,
  saved_job_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  dismissed_job_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Alert config
  alert_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  alert_telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  alert_frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily' | 'weekly' | 'realtime'
  telegram_chat_id TEXT,
  telegram_link_token TEXT,
  profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  onboarded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_user ON candidates(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_telegram_link ON candidates(telegram_link_token) WHERE telegram_link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_telegram_chat ON candidates(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS matches (
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  structured_score REAL NOT NULL,
  llm_score REAL,
  hard_filter_pass BOOLEAN NOT NULL,
  rationale TEXT NOT NULL,
  failed_filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_cand ON matches(candidate_id, score DESC);

CREATE TABLE IF NOT EXISTS interactions (
  id BIGSERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'view' | 'save' | 'dismiss' | 'click'
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_cand ON interactions(candidate_id, created_at DESC);

-- Magic-link tokens: one-time, short-lived, consumed on verify.
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  redirect_to TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_expires ON magic_link_tokens(expires_at);

-- Dedup for outbound alerts so the cron doesn't re-send the same job.
CREATE TABLE IF NOT EXISTS sent_alerts (
  id BIGSERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'email' | 'telegram'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sent_alerts_uniq
  ON sent_alerts(candidate_id, job_id, channel);
`;
