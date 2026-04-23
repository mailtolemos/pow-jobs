// Core type definitions for Pablo Jobs.
// These mirror the structured schema described in the PRD (Section 6.5).

export type Domain =
  // crypto domains
  | "crypto:defi"
  | "crypto:infra"
  | "crypto:l1"
  | "crypto:l2"
  | "crypto:application"
  | "crypto:analytics"
  | "crypto:trading"
  | "crypto:security"
  // finance domains
  | "finance:systematic"
  | "finance:discretionary"
  | "finance:macro"
  | "finance:credit"
  | "finance:equities"
  | "finance:fi"
  | "finance:hft"
  | "finance:prop"
  | "finance:hedgefund"
  | "finance:banking"
  | "fintech";

export type Function =
  | "engineering"
  | "quant-research"
  | "trading"
  | "product"
  | "design"
  | "ops"
  | "business"
  | "legal-compliance"
  | "data";

export type SeniorityBand =
  | "ic1" | "ic2" | "ic3" | "ic4" | "ic5" | "ic6" | "ic7"
  | "m1" | "m2" | "m3" | "m4" | "m5";

export type RemotePolicy = "onsite" | "hybrid" | "remote-regional" | "remote-global";

export type Jurisdiction = "us" | "eu" | "uk" | "apac" | "latam" | "global";

export type CompanyStage =
  | "seed" | "series-a" | "series-b" | "series-c" | "series-d-plus"
  | "public" | "dao" | "fund" | "propshop";

export interface Job {
  id: string;
  title_raw: string;
  title_normalized: string;
  employer: string;
  employer_category: string; // e.g., "Crypto protocol", "Hedge fund", "Prop shop"
  domain: Domain;
  function: Function;
  seniority: SeniorityBand;
  tech_stack: string[];
  description: string;
  // Comp (all USD)
  base_min: number | null;
  base_max: number | null;
  bonus_pct_target: number | null; // e.g., 50 = 50% of base
  token_pct_target: number | null; // e.g., 30 = 30% of total comp in tokens
  carry_or_equity_pct: number | null;
  vesting_years: number | null;
  cliff_months: number | null;
  // Location & compliance
  location: string;
  remote_policy: RemotePolicy;
  jurisdiction_required: Jurisdiction;
  visa_sponsored: boolean;
  regulated: boolean;
  // Company context
  stage: CompanyStage;
  team_size_band: string | null; // "1-10", "10-50", "50-200", "200+"
  aum_usd: number | null;
  // Provenance
  source_url: string;
  source_channel: string;
  date_posted: string; // ISO
  date_last_seen: string; // ISO
  is_open: boolean;
  employer_verified: boolean;
}

export interface Candidate {
  id: string;
  display_name: string; // pseudonym or real name
  identity_mode: "real" | "pseudonym";
  headline: string; // one-liner self-description
  years_experience: number;
  current_role: string;
  current_employer: string;
  education: string;
  linkedin_url: string | null;
  github_url: string | null;
  farcaster_handle: string | null;
  wallet_address: string | null;
  // Preferences
  domains_of_interest: Domain[];
  functions: Function[];
  seniority_band: SeniorityBand;
  tech_stack: string[];
  // Hard filters
  comp_floor_usd: number;
  jurisdiction_ok: Jurisdiction[];
  remote_policy_ok: RemotePolicy[];
  visa_needed: boolean;
  max_regulated_ok: boolean;
  // Soft preferences (weights 0..1)
  weight_comp: number;
  weight_domain_fit: number;
  weight_team_quality: number;
  weight_token_upside: number;
  // Deal-breakers (free-form negative constraints)
  dealbreakers: string[];
  // Past engagement (for collaborative signal, unused in v1)
  saved_job_ids: string[];
  dismissed_job_ids: string[];
}

export interface MatchScore {
  job_id: string;
  candidate_id: string;
  score: number; // 0..1
  // Breakdown
  structured_score: number;
  llm_score: number | null; // null if no LLM call made
  hard_filter_pass: boolean;
  rationale: string;
  // Which filters failed (empty if passed)
  failed_filters: string[];
  computed_at: string;
}

export interface WeeklyDigest {
  candidate_id: string;
  week_of: string;
  matches: Array<MatchScore & { job: Job }>;
  threshold_used: number;
  would_send: boolean; // false if no match cleared the precision floor
}
