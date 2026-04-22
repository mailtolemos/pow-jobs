// Postgres data access layer (Neon serverless driver).
// All functions are async. Row shapes mirror the Job / Candidate / MatchScore types,
// with JSONB columns deserialized into native arrays and timestamps serialized to ISO.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import type { Job, Candidate, MatchScore } from "./types";
import { SCHEMA_SQL } from "./schema";

// --- Client ---------------------------------------------------------------

let _sql: NeonQueryFunction<false, false> | null = null;

export function sql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure a Neon/Postgres connection string in your environment.",
    );
  }
  _sql = neon(url);
  return _sql;
}

// One-time schema init. Safe to call many times (all DDL is IF NOT EXISTS).
let _schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    const s = sql();
    // Neon's http driver does not support multi-statement transactions via
    // tagged-template calls, so split and run statements individually.
    // Strip leading line comments from each statement before filtering, so that
    // a CREATE ... statement preceded by comments still gets executed.
    const stripLeadingComments = (str: string): string =>
      str
        .split("\n")
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim();

    const statements = SCHEMA_SQL.split(/;\s*(?:\n|$)/)
      .map((raw) => stripLeadingComments(raw))
      .filter((stmt) => stmt.length > 0 && /^[A-Z]/i.test(stmt));

    for (const stmt of statements) {
      // Neon's query function is directly callable with a raw SQL string.
      await s(stmt);
    }
  })();
  return _schemaReady;
}

// --- Helpers --------------------------------------------------------------

type Row = Record<string, unknown>;

function toISO(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function asArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T[];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToJob(row: Row): Job {
  return {
    id: row.id as string,
    title_raw: row.title_raw as string,
    title_normalized: row.title_normalized as string,
    employer: row.employer as string,
    employer_category: row.employer_category as string,
    domain: row.domain as Job["domain"],
    function: row.function as Job["function"],
    seniority: row.seniority as Job["seniority"],
    tech_stack: asArr<string>(row.tech_stack),
    description: row.description as string,
    base_min: (row.base_min as number | null) ?? null,
    base_max: (row.base_max as number | null) ?? null,
    bonus_pct_target: (row.bonus_pct_target as number | null) ?? null,
    token_pct_target: (row.token_pct_target as number | null) ?? null,
    carry_or_equity_pct: (row.carry_or_equity_pct as number | null) ?? null,
    vesting_years: (row.vesting_years as number | null) ?? null,
    cliff_months: (row.cliff_months as number | null) ?? null,
    location: row.location as string,
    remote_policy: row.remote_policy as Job["remote_policy"],
    jurisdiction_required: row.jurisdiction_required as Job["jurisdiction_required"],
    visa_sponsored: Boolean(row.visa_sponsored),
    regulated: Boolean(row.regulated),
    stage: row.stage as Job["stage"],
    team_size_band: (row.team_size_band as string | null) ?? null,
    aum_usd: row.aum_usd != null ? Number(row.aum_usd) : null,
    source_url: row.source_url as string,
    source_channel: row.source_channel as string,
    date_posted: toISO(row.date_posted),
    date_last_seen: toISO(row.date_last_seen),
    is_open: Boolean(row.is_open),
    employer_verified: Boolean(row.employer_verified),
  };
}

function rowToCandidate(row: Row): Candidate {
  return {
    id: row.id as string,
    display_name: row.display_name as string,
    identity_mode: row.identity_mode as Candidate["identity_mode"],
    headline: row.headline as string,
    years_experience: row.years_experience as number,
    current_role: row.current_role as string,
    current_employer: row.current_employer as string,
    education: row.education as string,
    linkedin_url: (row.linkedin_url as string | null) ?? null,
    github_url: (row.github_url as string | null) ?? null,
    farcaster_handle: (row.farcaster_handle as string | null) ?? null,
    wallet_address: (row.wallet_address as string | null) ?? null,
    domains_of_interest: asArr<Candidate["domains_of_interest"][number]>(row.domains_of_interest),
    functions: asArr<Candidate["functions"][number]>(row.functions),
    seniority_band: row.seniority_band as Candidate["seniority_band"],
    tech_stack: asArr<string>(row.tech_stack),
    comp_floor_usd: row.comp_floor_usd as number,
    jurisdiction_ok: asArr<Candidate["jurisdiction_ok"][number]>(row.jurisdiction_ok),
    remote_policy_ok: asArr<Candidate["remote_policy_ok"][number]>(row.remote_policy_ok),
    visa_needed: Boolean(row.visa_needed),
    max_regulated_ok: Boolean(row.max_regulated_ok),
    weight_comp: row.weight_comp as number,
    weight_domain_fit: row.weight_domain_fit as number,
    weight_team_quality: row.weight_team_quality as number,
    weight_token_upside: row.weight_token_upside as number,
    dealbreakers: asArr<string>(row.dealbreakers),
    saved_job_ids: asArr<string>(row.saved_job_ids),
    dismissed_job_ids: asArr<string>(row.dismissed_job_ids),
  };
}

// --- Jobs -----------------------------------------------------------------

export async function listJobs(opts: { openOnly?: boolean } = {}): Promise<Job[]> {
  await ensureSchema();
  const s = sql();
  const openOnly = opts.openOnly !== false;
  const rows = openOnly
    ? ((await s`SELECT * FROM jobs WHERE is_open = TRUE ORDER BY date_posted DESC`) as Row[])
    : ((await s`SELECT * FROM jobs ORDER BY date_posted DESC`) as Row[]);
  return rows.map(rowToJob);
}

export async function getJob(id: string): Promise<Job | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM jobs WHERE id = ${id}`) as Row[];
  return rows[0] ? rowToJob(rows[0]) : null;
}

export async function upsertJob(j: Job): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO jobs (
      id, title_raw, title_normalized, employer, employer_category,
      domain, function, seniority, tech_stack, description,
      base_min, base_max, bonus_pct_target, token_pct_target,
      carry_or_equity_pct, vesting_years, cliff_months, location,
      remote_policy, jurisdiction_required, visa_sponsored, regulated,
      stage, team_size_band, aum_usd, source_url, source_channel,
      date_posted, date_last_seen, is_open, employer_verified
    ) VALUES (
      ${j.id}, ${j.title_raw}, ${j.title_normalized}, ${j.employer}, ${j.employer_category},
      ${j.domain}, ${j.function}, ${j.seniority}, ${JSON.stringify(j.tech_stack)}::jsonb, ${j.description},
      ${j.base_min}, ${j.base_max}, ${j.bonus_pct_target}, ${j.token_pct_target},
      ${j.carry_or_equity_pct}, ${j.vesting_years}, ${j.cliff_months}, ${j.location},
      ${j.remote_policy}, ${j.jurisdiction_required}, ${j.visa_sponsored}, ${j.regulated},
      ${j.stage}, ${j.team_size_band}, ${j.aum_usd}, ${j.source_url}, ${j.source_channel},
      ${j.date_posted}, ${j.date_last_seen}, ${j.is_open}, ${j.employer_verified}
    )
    ON CONFLICT (id) DO UPDATE SET
      title_raw = EXCLUDED.title_raw,
      title_normalized = EXCLUDED.title_normalized,
      employer = EXCLUDED.employer,
      employer_category = EXCLUDED.employer_category,
      domain = EXCLUDED.domain,
      function = EXCLUDED.function,
      seniority = EXCLUDED.seniority,
      tech_stack = EXCLUDED.tech_stack,
      description = EXCLUDED.description,
      base_min = EXCLUDED.base_min,
      base_max = EXCLUDED.base_max,
      bonus_pct_target = EXCLUDED.bonus_pct_target,
      token_pct_target = EXCLUDED.token_pct_target,
      carry_or_equity_pct = EXCLUDED.carry_or_equity_pct,
      vesting_years = EXCLUDED.vesting_years,
      cliff_months = EXCLUDED.cliff_months,
      location = EXCLUDED.location,
      remote_policy = EXCLUDED.remote_policy,
      jurisdiction_required = EXCLUDED.jurisdiction_required,
      visa_sponsored = EXCLUDED.visa_sponsored,
      regulated = EXCLUDED.regulated,
      stage = EXCLUDED.stage,
      team_size_band = EXCLUDED.team_size_band,
      aum_usd = EXCLUDED.aum_usd,
      source_url = EXCLUDED.source_url,
      source_channel = EXCLUDED.source_channel,
      date_posted = EXCLUDED.date_posted,
      date_last_seen = EXCLUDED.date_last_seen,
      is_open = EXCLUDED.is_open,
      employer_verified = EXCLUDED.employer_verified
  `;
}

// --- Candidates (incl. demo personas) ------------------------------------

export async function listCandidates(opts: { demoOnly?: boolean } = {}): Promise<Candidate[]> {
  await ensureSchema();
  const s = sql();
  const rows = opts.demoOnly
    ? ((await s`SELECT * FROM candidates WHERE user_id IS NULL ORDER BY display_name`) as Row[])
    : ((await s`SELECT * FROM candidates ORDER BY display_name`) as Row[]);
  return rows.map(rowToCandidate);
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM candidates WHERE id = ${id}`) as Row[];
  return rows[0] ? rowToCandidate(rows[0]) : null;
}

export async function getCandidateByUserId(userId: string): Promise<Candidate | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM candidates WHERE user_id = ${userId}`) as Row[];
  return rows[0] ? rowToCandidate(rows[0]) : null;
}

export async function upsertCandidate(c: Candidate, userId: string | null = null): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO candidates (
      id, user_id, display_name, identity_mode, headline,
      years_experience, "current_role", current_employer, education,
      linkedin_url, github_url, farcaster_handle, wallet_address,
      domains_of_interest, functions, seniority_band, tech_stack,
      comp_floor_usd, jurisdiction_ok, remote_policy_ok, visa_needed, max_regulated_ok,
      weight_comp, weight_domain_fit, weight_team_quality, weight_token_upside,
      dealbreakers, saved_job_ids, dismissed_job_ids
    ) VALUES (
      ${c.id}, ${userId}, ${c.display_name}, ${c.identity_mode}, ${c.headline},
      ${c.years_experience}, ${c.current_role}, ${c.current_employer}, ${c.education},
      ${c.linkedin_url}, ${c.github_url}, ${c.farcaster_handle}, ${c.wallet_address},
      ${JSON.stringify(c.domains_of_interest)}::jsonb, ${JSON.stringify(c.functions)}::jsonb,
      ${c.seniority_band}, ${JSON.stringify(c.tech_stack)}::jsonb,
      ${c.comp_floor_usd}, ${JSON.stringify(c.jurisdiction_ok)}::jsonb,
      ${JSON.stringify(c.remote_policy_ok)}::jsonb,
      ${c.visa_needed}, ${c.max_regulated_ok},
      ${c.weight_comp}, ${c.weight_domain_fit}, ${c.weight_team_quality}, ${c.weight_token_upside},
      ${JSON.stringify(c.dealbreakers)}::jsonb,
      ${JSON.stringify(c.saved_job_ids)}::jsonb,
      ${JSON.stringify(c.dismissed_job_ids)}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      identity_mode = EXCLUDED.identity_mode,
      headline = EXCLUDED.headline,
      years_experience = EXCLUDED.years_experience,
      "current_role" = EXCLUDED."current_role",
      current_employer = EXCLUDED.current_employer,
      education = EXCLUDED.education,
      linkedin_url = EXCLUDED.linkedin_url,
      github_url = EXCLUDED.github_url,
      farcaster_handle = EXCLUDED.farcaster_handle,
      wallet_address = EXCLUDED.wallet_address,
      domains_of_interest = EXCLUDED.domains_of_interest,
      functions = EXCLUDED.functions,
      seniority_band = EXCLUDED.seniority_band,
      tech_stack = EXCLUDED.tech_stack,
      comp_floor_usd = EXCLUDED.comp_floor_usd,
      jurisdiction_ok = EXCLUDED.jurisdiction_ok,
      remote_policy_ok = EXCLUDED.remote_policy_ok,
      visa_needed = EXCLUDED.visa_needed,
      max_regulated_ok = EXCLUDED.max_regulated_ok,
      weight_comp = EXCLUDED.weight_comp,
      weight_domain_fit = EXCLUDED.weight_domain_fit,
      weight_team_quality = EXCLUDED.weight_team_quality,
      weight_token_upside = EXCLUDED.weight_token_upside,
      dealbreakers = EXCLUDED.dealbreakers,
      saved_job_ids = EXCLUDED.saved_job_ids,
      dismissed_job_ids = EXCLUDED.dismissed_job_ids,
      updated_at = NOW()
  `;
}

// Extended profile field set (alerts + onboarding status).
export interface CandidateExtras {
  alert_email_enabled: boolean;
  alert_telegram_enabled: boolean;
  alert_frequency: "daily" | "weekly" | "realtime";
  telegram_chat_id: string | null;
  telegram_link_token: string | null;
  profile_complete: boolean;
}

export async function getCandidateExtras(candidateId: string): Promise<CandidateExtras | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT alert_email_enabled, alert_telegram_enabled, alert_frequency,
           telegram_chat_id, telegram_link_token, profile_complete
    FROM candidates WHERE id = ${candidateId}
  `) as Row[];
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    alert_email_enabled: Boolean(r.alert_email_enabled),
    alert_telegram_enabled: Boolean(r.alert_telegram_enabled),
    alert_frequency: (r.alert_frequency as CandidateExtras["alert_frequency"]) ?? "daily",
    telegram_chat_id: (r.telegram_chat_id as string | null) ?? null,
    telegram_link_token: (r.telegram_link_token as string | null) ?? null,
    profile_complete: Boolean(r.profile_complete),
  };
}

export async function updateCandidateAlerts(
  candidateId: string,
  patch: Partial<CandidateExtras>,
): Promise<void> {
  await ensureSchema();
  const s = sql();
  if (patch.alert_email_enabled !== undefined)
    await s`UPDATE candidates SET alert_email_enabled = ${patch.alert_email_enabled}, updated_at = NOW() WHERE id = ${candidateId}`;
  if (patch.alert_telegram_enabled !== undefined)
    await s`UPDATE candidates SET alert_telegram_enabled = ${patch.alert_telegram_enabled}, updated_at = NOW() WHERE id = ${candidateId}`;
  if (patch.alert_frequency !== undefined)
    await s`UPDATE candidates SET alert_frequency = ${patch.alert_frequency}, updated_at = NOW() WHERE id = ${candidateId}`;
  if (patch.telegram_chat_id !== undefined)
    await s`UPDATE candidates SET telegram_chat_id = ${patch.telegram_chat_id}, updated_at = NOW() WHERE id = ${candidateId}`;
  if (patch.telegram_link_token !== undefined)
    await s`UPDATE candidates SET telegram_link_token = ${patch.telegram_link_token}, updated_at = NOW() WHERE id = ${candidateId}`;
  if (patch.profile_complete !== undefined)
    await s`UPDATE candidates SET profile_complete = ${patch.profile_complete}, onboarded_at = COALESCE(onboarded_at, NOW()), updated_at = NOW() WHERE id = ${candidateId}`;
}

// Create an initial (empty) candidate profile for a newly-signed-up user.
export async function createEmptyCandidateForUser(
  userId: string,
  email: string,
): Promise<Candidate> {
  await ensureSchema();
  const id = `cand_${userId.replace(/^user_/, "")}`;
  const nameFromEmail = email.split("@")[0] || "Member";
  const empty: Candidate = {
    id,
    display_name: nameFromEmail,
    identity_mode: "pseudonym",
    headline: "",
    years_experience: 0,
    current_role: "",
    current_employer: "",
    education: "",
    linkedin_url: null,
    github_url: null,
    farcaster_handle: null,
    wallet_address: null,
    domains_of_interest: [],
    functions: [],
    seniority_band: "ic4",
    tech_stack: [],
    comp_floor_usd: 0,
    jurisdiction_ok: ["global"],
    remote_policy_ok: ["remote-global", "remote-regional", "hybrid"],
    visa_needed: false,
    max_regulated_ok: true,
    weight_comp: 0.5,
    weight_domain_fit: 0.5,
    weight_team_quality: 0.5,
    weight_token_upside: 0.3,
    dealbreakers: [],
    saved_job_ids: [],
    dismissed_job_ids: [],
  };
  await upsertCandidate(empty, userId);
  return empty;
}

// --- Users / Auth ---------------------------------------------------------

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
  is_admin: boolean;
}

function rowToUser(row: Row): UserRow {
  return {
    id: row.id as string,
    email: row.email as string,
    created_at: toISO(row.created_at),
    last_login_at: row.last_login_at ? toISO(row.last_login_at) : null,
    is_admin: Boolean(row.is_admin),
  };
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const normalized = email.trim().toLowerCase();
  const rows = (await sql()`SELECT * FROM users WHERE lower(email) = ${normalized}`) as Row[];
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM users WHERE id = ${id}`) as Row[];
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function upsertUserByEmail(email: string): Promise<UserRow> {
  await ensureSchema();
  const existing = await getUserByEmail(email);
  if (existing) {
    await sql()`UPDATE users SET last_login_at = NOW() WHERE id = ${existing.id}`;
    return { ...existing, last_login_at: new Date().toISOString() };
  }
  const id = newId("user");
  const normalized = email.trim().toLowerCase();
  await sql()`
    INSERT INTO users (id, email, last_login_at)
    VALUES (${id}, ${normalized}, NOW())
  `;
  return {
    id,
    email: normalized,
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    is_admin: false,
  };
}

// --- Magic link tokens ---------------------------------------------------

export interface MagicLinkToken {
  token: string;
  email: string;
  redirect_to: string | null;
  expires_at: string;
  consumed_at: string | null;
}

export async function createMagicLinkToken(
  email: string,
  redirectTo: string | null = null,
  ttlMinutes = 15,
): Promise<string> {
  await ensureSchema();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const normalized = email.trim().toLowerCase();
  await sql()`
    INSERT INTO magic_link_tokens (token, email, redirect_to, expires_at)
    VALUES (${token}, ${normalized}, ${redirectTo}, ${expiresAt})
  `;
  return token;
}

// Atomically consume a token: returns the token row if valid+unused, else null.
export async function consumeMagicLinkToken(token: string): Promise<MagicLinkToken | null> {
  await ensureSchema();
  const rows = (await sql()`
    UPDATE magic_link_tokens
    SET consumed_at = NOW()
    WHERE token = ${token}
      AND consumed_at IS NULL
      AND expires_at > NOW()
    RETURNING token, email, redirect_to, expires_at, consumed_at
  `) as Row[];
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    token: r.token as string,
    email: r.email as string,
    redirect_to: (r.redirect_to as string | null) ?? null,
    expires_at: toISO(r.expires_at),
    consumed_at: toISO(r.consumed_at),
  };
}

// --- Matches --------------------------------------------------------------

export async function upsertMatch(m: MatchScore): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO matches (
      job_id, candidate_id, score, structured_score, llm_score,
      hard_filter_pass, rationale, failed_filters, computed_at
    ) VALUES (
      ${m.job_id}, ${m.candidate_id}, ${m.score}, ${m.structured_score}, ${m.llm_score},
      ${m.hard_filter_pass}, ${m.rationale}, ${JSON.stringify(m.failed_filters)}::jsonb, ${m.computed_at}
    )
    ON CONFLICT (job_id, candidate_id) DO UPDATE SET
      score = EXCLUDED.score,
      structured_score = EXCLUDED.structured_score,
      llm_score = EXCLUDED.llm_score,
      hard_filter_pass = EXCLUDED.hard_filter_pass,
      rationale = EXCLUDED.rationale,
      failed_filters = EXCLUDED.failed_filters,
      computed_at = EXCLUDED.computed_at
  `;
}

export async function getMatchesForCandidate(
  candidateId: string,
  limit = 50,
): Promise<MatchScore[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT * FROM matches
    WHERE candidate_id = ${candidateId} AND hard_filter_pass = TRUE
    ORDER BY score DESC LIMIT ${limit}
  `) as Row[];
  return rows.map((r) => ({
    job_id: r.job_id as string,
    candidate_id: r.candidate_id as string,
    score: r.score as number,
    structured_score: r.structured_score as number,
    llm_score: (r.llm_score as number | null) ?? null,
    hard_filter_pass: Boolean(r.hard_filter_pass),
    rationale: r.rationale as string,
    failed_filters: asArr<string>(r.failed_filters),
    computed_at: toISO(r.computed_at),
  }));
}

// --- Interactions ---------------------------------------------------------

export async function recordInteraction(
  candidateId: string,
  jobId: string,
  kind: string,
  reason?: string,
): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO interactions (candidate_id, job_id, kind, reason)
    VALUES (${candidateId}, ${jobId}, ${kind}, ${reason ?? null})
  `;
}

// --- Alert dedup ---------------------------------------------------------

export async function hasSentAlert(
  candidateId: string,
  jobId: string,
  channel: "email" | "telegram",
): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT 1 FROM sent_alerts
    WHERE candidate_id = ${candidateId} AND job_id = ${jobId} AND channel = ${channel}
    LIMIT 1
  `) as Row[];
  return rows.length > 0;
}

export async function recordSentAlert(
  candidateId: string,
  jobId: string,
  channel: "email" | "telegram",
): Promise<void> {
  await ensureSchema();
  // ON CONFLICT makes this idempotent so the cron can be safely retried.
  await sql()`
    INSERT INTO sent_alerts (candidate_id, job_id, channel)
    VALUES (${candidateId}, ${jobId}, ${channel})
    ON CONFLICT (candidate_id, job_id, channel) DO NOTHING
  `;
}

export async function listCandidatesWithAlerts(): Promise<
  Array<Candidate & CandidateExtras & { user_email: string | null }>
> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT c.*, u.email AS user_email
    FROM candidates c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.user_id IS NOT NULL
      AND c.profile_complete = TRUE
      AND (c.alert_email_enabled = TRUE OR c.alert_telegram_enabled = TRUE)
  `) as Row[];
  return rows.map((r) => {
    const cand = rowToCandidate(r);
    return {
      ...cand,
      alert_email_enabled: Boolean(r.alert_email_enabled),
      alert_telegram_enabled: Boolean(r.alert_telegram_enabled),
      alert_frequency: (r.alert_frequency as CandidateExtras["alert_frequency"]) ?? "daily",
      telegram_chat_id: (r.telegram_chat_id as string | null) ?? null,
      telegram_link_token: (r.telegram_link_token as string | null) ?? null,
      profile_complete: Boolean(r.profile_complete),
      user_email: (r.user_email as string | null) ?? null,
    };
  });
}

// --- Telegram linking ----------------------------------------------------

export async function findCandidateByTelegramToken(token: string): Promise<Candidate | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT * FROM candidates WHERE telegram_link_token = ${token}
  `) as Row[];
  return rows[0] ? rowToCandidate(rows[0]) : null;
}
