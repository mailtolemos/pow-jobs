// Seed the Postgres DB with demo jobs and candidates. Safe to re-run.
// Usage: DATABASE_URL=postgres://... npm run seed

import { upsertJob, upsertCandidate, listJobs, listCandidates, ensureSchema } from "../src/lib/db";
import { SEED_JOBS, SEED_CANDIDATES } from "../src/lib/seed-data";

async function main() {
  await ensureSchema();
  console.log(`[seed] inserting ${SEED_JOBS.length} jobs...`);
  for (const j of SEED_JOBS) await upsertJob(j);

  console.log(`[seed] inserting ${SEED_CANDIDATES.length} demo candidates...`);
  for (const c of SEED_CANDIDATES) await upsertCandidate(c, null);

  const jobs = await listJobs({ openOnly: false });
  const cands = await listCandidates();
  console.log(`[seed] done. jobs=${jobs.length} candidates=${cands.length}`);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
