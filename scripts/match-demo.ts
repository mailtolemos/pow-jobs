// Compute matches for every seeded candidate and print the top results.
// Usage: npm run match-demo [candidateId]
//
// If ANTHROPIC_API_KEY is set, uses Claude as the LLM judge in a hybrid score.
// Otherwise falls back to pure structured scoring and a heuristic rationale.

import { listCandidates, getCandidate, getJob } from "../src/lib/db";
import { computeAllMatches, applyPrecisionFloor, precisionFloorFor } from "../src/lib/matching";
import { isLLMAvailable } from "../src/lib/llm";

async function runForCandidate(candidateId: string) {
  const candidate = getCandidate(candidateId);
  if (!candidate) {
    console.error(`[match-demo] candidate not found: ${candidateId}`);
    return;
  }
  const threshold = precisionFloorFor(candidate);

  console.log("\n" + "=".repeat(72));
  console.log(`Candidate: ${candidate.display_name} (${candidate.id})`);
  console.log(`  headline: ${candidate.headline}`);
  console.log(`  interests: ${candidate.domains_of_interest.join(", ")}`);
  console.log(`  comp floor: $${candidate.comp_floor_usd.toLocaleString()}`);
  console.log(`  precision floor: ${(threshold * 100).toFixed(0)}%`);
  console.log("=".repeat(72));

  const all = await computeAllMatches(candidateId);
  const kept = applyPrecisionFloor(all, candidate);
  const dropped = all.filter((m) => !m.hard_filter_pass);

  console.log(`\n→ ${all.length} jobs scored, ${kept.length} cleared precision floor, ${dropped.length} hard-filtered out.\n`);

  const topToShow = kept.slice(0, 5);
  if (topToShow.length === 0) {
    console.log("  (no matches cleared the precision floor — silence is correct here)\n");
  }
  for (const m of topToShow) {
    const job = getJob(m.job_id);
    if (!job) continue;
    const scorePct = (m.score * 100).toFixed(0);
    const structPct = (m.structured_score * 100).toFixed(0);
    const llmPart = m.llm_score != null ? ` (struct ${structPct} + LLM ${(m.llm_score * 100).toFixed(0)})` : " (structured only)";
    console.log(`  [${scorePct}%]${llmPart} ${job.title_raw} — ${job.employer}`);
    console.log(`         ${m.rationale}\n`);
  }

  if (dropped.length > 0) {
    const sample = dropped.slice(0, 3);
    console.log(`  hard-filter sample (${dropped.length} total):`);
    for (const m of sample) {
      const job = getJob(m.job_id);
      if (!job) continue;
      console.log(`    - ${job.employer} / ${job.title_raw}: ${m.failed_filters.join(", ")}`);
    }
    console.log("");
  }
}

async function main() {
  console.log(`[match-demo] LLM available: ${isLLMAvailable() ? "yes (Claude)" : "no (heuristic fallback)"}`);

  const argId = process.argv[2];
  const candidates = argId ? [{ id: argId }] : listCandidates();
  if (candidates.length === 0) {
    console.error("[match-demo] no candidates found — did you run `npm run seed`?");
    process.exit(1);
  }
  for (const c of candidates) {
    await runForCandidate(c.id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
