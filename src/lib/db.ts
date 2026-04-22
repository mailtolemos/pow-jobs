import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Job, Candidate, MatchScore } from "./types";
import { SCHEMA_SQL } from "./schema";

// Pick a writable DB path. On Vercel/Lambda the working directory is read-only —
// only /tmp is writable. Override with DATABASE_PATH if you want.
function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "/tmp/pow-jobs.db";
  }
  return path.join(process.cwd(), "data", "pow-jobs.db");
}

let _db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  // WAL mode is faster but requires filesystem locking; some mounts (e.g. FUSE) don't support it.
  try {
    db.pragma("journal_mode = WAL");
  } catch {
    // Fall back to default rollback journal; fine for a demo/dev scale.
  }
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  _db = db;

  // Auto-seed on first access if the DB is empty. Keeps serverless deploys
  // working out-of-the-box — every cold start gets its own /tmp DB.
  maybeSeed(db);

  return db;
}

function maybeSeed(db: Database.Database): void {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM jobs").get() as { count: number };
  if (count > 0) return;
  // Lazy require to avoid circular imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SEED_JOBS, SEED_CANDIDATES } = require("./seed-data") as typeof import("./seed-data");
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  for (const j of SEED_JOBS) upsertJob(j);
  for (const c of SEED_CANDIDATES) upsertCandidate(c);
}

// --- Row <-> object conversion --------------------------------------------

const boolToInt = (b: boolean) => (b ? 1 : 0);
const intToBool = (i: number) => i === 1;
const arrToJson = (a: unknown[]) => JSON.stringify(a);
const jsonToArr = <T>(s: string) => JSON.parse(s) as T[];

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title_raw: row.title_raw as string,
    title_normalized: row.title_normalized as string,
    employer: row.employer as string,
    employer_category: row.employer_category as string,
    domain: row.domain as Job["domain"],
    function: row.function as Job["function"],
    seniority: row.seniority as Job["seniority"],
    tech_stack: jsonToArr<string>(row.tech_stack as string),
    description: row.description as string,
    base_min: row.base_min as number | null,
    base_max: row.base_max as number | null,
    bonus_pct_target: row.bonus_pct_target as number | null,
    token_pct_target: row.token_pct_target as number | null,
    carry_or_equity_pct: row.carry_or_equity_pct as number | null,
    vesting_years: row.vesting_years as number | null,
    cliff_months: row.cliff_months as number | null,
    location: row.location as string,
    remote_policy: row.remote_policy as Job["remote_policy"],
    jurisdiction_required: row.jurisdiction_required as Job["jurisdiction_required"],
    visa_sponsored: intToBool(row.visa_sponsored as number),
    regulated: intToBool(row.regulated as number),
    stage: row.stage as Job["stage"],
    team_size_band: row.team_size_band as string | null,
    aum_usd: row.aum_usd as number | null,
    source_url: row.source_url as string,
    source_channel: row.source_channel as string,
    date_posted: row.date_posted as string,
    date_last_seen: row.date_last_seen as string,
    is_open: intToBool(row.is_open as number),
    employer_verified: intToBool(row.employer_verified as number),
  };
}

function rowToCandidate(row: Record<string, unknown>): Candidate {
  return {
    id: row.id as string,
    display_name: row.display_name as string,
    identity_mode: row.identity_mode as Candidate["identity_mode"],
    headline: row.headline as string,
    years_experience: row.years_experience as number,
    current_role: row.current_role as string,
    current_employer: row.current_employer as string,
    education: row.education as string,
    linkedin_url: row.linkedin_url as string | null,
    github_url: row.github_url as string | null,
    farcaster_handle: row.farcaster_handle as string | null,
    wallet_address: row.wallet_address as string | null,
    domains_of_interest: jsonToArr<Candidate["domains_of_interest"][number]>(row.domains_of_interest as string),
    functions: jsonToArr<Candidate["functions"][number]>(row.functions as string),
    seniority_band: row.seniority_band as Candidate["seniority_band"],
    tech_stack: jsonToArr<string>(row.tech_stack as string),
    comp_floor_usd: row.comp_floor_usd as number,
    jurisdiction_ok: jsonToArr<Candidate["jurisdiction_ok"][number]>(row.jurisdiction_ok as string),
    remote_policy_ok: jsonToArr<Candidate["remote_policy_ok"][number]>(row.remote_policy_ok as string),
    visa_needed: intToBool(row.visa_needed as number),
    max_regulated_ok: intToBool(row.max_regulated_ok as number),
    weight_comp: row.weight_comp as number,
    weight_domain_fit: row.weight_domain_fit as number,
    weight_team_quality: row.weight_team_quality as number,
    weight_token_upside: row.weight_token_upside as number,
    dealbreakers: jsonToArr<string>(row.dealbreakers as string),
    saved_job_ids: jsonToArr<string>(row.saved_job_ids as string),
    dismissed_job_ids: jsonToArr<string>(row.dismissed_job_ids as string),
  };
}

// --- Queries --------------------------------------------------------------

export function listJobs(opts: { openOnly?: boolean } = {}): Job[] {
  const db = getDB();
  const sql = opts.openOnly !== false
    ? "SELECT * FROM jobs WHERE is_open = 1 ORDER BY date_posted DESC"
    : "SELECT * FROM jobs ORDER BY date_posted DESC";
  return db.prepare(sql).all().map((r) => rowToJob(r as Record<string, unknown>));
}

export function getJob(id: string): Job | null {
  const db = getDB();
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToJob(row) : null;
}

export function listCandidates(): Candidate[] {
  const db = getDB();
  return db.prepare("SELECT * FROM candidates").all().map((r) => rowToCandidate(r as Record<string, unknown>));
}

export function getCandidate(id: string): Candidate | null {
  const db = getDB();
  const row = db.prepare("SELECT * FROM candidates WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToCandidate(row) : null;
}

export function upsertJob(j: Job): void {
  const db = getDB();
  const cols = [
    "id","title_raw","title_normalized","employer","employer_category","domain","function","seniority",
    "tech_stack","description","base_min","base_max","bonus_pct_target","token_pct_target",
    "carry_or_equity_pct","vesting_years","cliff_months","location","remote_policy","jurisdiction_required",
    "visa_sponsored","regulated","stage","team_size_band","aum_usd","source_url","source_channel",
    "date_posted","date_last_seen","is_open","employer_verified",
  ];
  const placeholders = cols.map(() => "?").join(", ");
  const stmt = db.prepare(`INSERT OR REPLACE INTO jobs (${cols.join(", ")}) VALUES (${placeholders})`);
  stmt.run(
    j.id, j.title_raw, j.title_normalized, j.employer, j.employer_category, j.domain, j.function, j.seniority,
    arrToJson(j.tech_stack), j.description, j.base_min, j.base_max, j.bonus_pct_target, j.token_pct_target,
    j.carry_or_equity_pct, j.vesting_years, j.cliff_months, j.location, j.remote_policy, j.jurisdiction_required,
    boolToInt(j.visa_sponsored), boolToInt(j.regulated), j.stage, j.team_size_band, j.aum_usd, j.source_url,
    j.source_channel, j.date_posted, j.date_last_seen, boolToInt(j.is_open), boolToInt(j.employer_verified),
  );
}

export function upsertCandidate(c: Candidate): void {
  const db = getDB();
  const cols = [
    "id","display_name","identity_mode","headline","years_experience","current_role","current_employer",
    "education","linkedin_url","github_url","farcaster_handle","wallet_address","domains_of_interest",
    "functions","seniority_band","tech_stack","comp_floor_usd","jurisdiction_ok","remote_policy_ok",
    "visa_needed","max_regulated_ok","weight_comp","weight_domain_fit","weight_team_quality",
    "weight_token_upside","dealbreakers","saved_job_ids","dismissed_job_ids",
  ];
  const placeholders = cols.map(() => "?").join(", ");
  const stmt = db.prepare(`INSERT OR REPLACE INTO candidates (${cols.join(", ")}) VALUES (${placeholders})`);
  stmt.run(
    c.id, c.display_name, c.identity_mode, c.headline, c.years_experience, c.current_role, c.current_employer,
    c.education, c.linkedin_url, c.github_url, c.farcaster_handle, c.wallet_address,
    arrToJson(c.domains_of_interest), arrToJson(c.functions), c.seniority_band, arrToJson(c.tech_stack),
    c.comp_floor_usd, arrToJson(c.jurisdiction_ok), arrToJson(c.remote_policy_ok),
    boolToInt(c.visa_needed), boolToInt(c.max_regulated_ok),
    c.weight_comp, c.weight_domain_fit, c.weight_team_quality, c.weight_token_upside,
    arrToJson(c.dealbreakers), arrToJson(c.saved_job_ids), arrToJson(c.dismissed_job_ids),
  );
}

export function upsertMatch(m: MatchScore): void {
  const db = getDB();
  db.prepare(
    `INSERT OR REPLACE INTO matches
     (job_id, candidate_id, score, structured_score, llm_score, hard_filter_pass, rationale, failed_filters, computed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    m.job_id, m.candidate_id, m.score, m.structured_score, m.llm_score,
    boolToInt(m.hard_filter_pass), m.rationale, arrToJson(m.failed_filters), m.computed_at,
  );
}

export function getMatchesForCandidate(candidateId: string, limit = 50): MatchScore[] {
  const db = getDB();
  const rows = db.prepare(
    `SELECT * FROM matches
     WHERE candidate_id = ? AND hard_filter_pass = 1
     ORDER BY score DESC LIMIT ?`
  ).all(candidateId, limit) as Record<string, unknown>[];
  return rows.map((r) => ({
    job_id: r.job_id as string,
    candidate_id: r.candidate_id as string,
    score: r.score as number,
    structured_score: r.structured_score as number,
    llm_score: r.llm_score as number | null,
    hard_filter_pass: intToBool(r.hard_filter_pass as number),
    rationale: r.rationale as string,
    failed_filters: jsonToArr<string>(r.failed_filters as string),
    computed_at: r.computed_at as string,
  }));
}

export function recordInteraction(candidateId: string, jobId: string, kind: string, reason?: string): void {
  const db = getDB();
  db.prepare(
    "INSERT INTO interactions (candidate_id, job_id, kind, reason, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(candidateId, jobId, kind, reason || null, new Date().toISOString());
}
