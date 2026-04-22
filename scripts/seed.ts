// Seed the local SQLite DB with demo jobs and candidates.
// Usage: npm run seed

import { upsertJob, upsertCandidate, listJobs, listCandidates } from "../src/lib/db";
import { SEED_JOBS, SEED_CANDIDATES } from "../src/lib/seed-data";

function main() {
  console.log(`[seed] inserting ${SEED_JOBS.length} jobs...`);
  for (const j of SEED_JOBS) upsertJob(j);

  console.log(`[seed] inserting ${SEED_CANDIDATES.length} candidates...`);
  for (const c of SEED_CANDIDATES) upsertCandidate(c);

  const jobsCount = listJobs({ openOnly: false }).length;
  const candsCount = listCandidates().length;
  console.log(`[seed] done. jobs=${jobsCount} candidates=${candsCount}`);
}

main();
