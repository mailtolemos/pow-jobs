// Run idempotent schema migrations against the configured DATABASE_URL.
// Usage: DATABASE_URL=postgres://... npm run migrate

import { ensureSchema } from "../src/lib/db";

async function main() {
  console.log("[migrate] applying schema...");
  await ensureSchema();
  console.log("[migrate] done.");
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
