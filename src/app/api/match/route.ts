import { NextResponse } from "next/server";
import { getCandidate, getJob } from "@/lib/db";
import { computeAllMatches, applyPrecisionFloor, precisionFloorFor } from "@/lib/matching";
import { isLLMAvailable } from "@/lib/llm";

export const dynamic = "force-dynamic";

// POST /api/match  { candidateId, useLLM?, applyFloor? }
// Returns: { threshold, llmAvailable, matches: [{ match, job }] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const candidateId = String(body.candidateId || "");
  const useLLM = body.useLLM !== false;
  const applyFloor = body.applyFloor !== false;

  const candidate = getCandidate(candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "candidate not found" }, { status: 404 });
  }

  const all = await computeAllMatches(candidateId, { useLLM });
  const kept = applyFloor ? applyPrecisionFloor(all, candidate) : all;

  const enriched = kept
    .map((m) => {
      const job = getJob(m.job_id);
      return job ? { match: m, job } : null;
    })
    .filter((x): x is { match: (typeof kept)[number]; job: NonNullable<ReturnType<typeof getJob>> } => x !== null);

  return NextResponse.json({
    threshold: precisionFloorFor(candidate),
    llmAvailable: isLLMAvailable(),
    totalScored: all.length,
    totalKept: kept.length,
    totalHardFiltered: all.filter((m) => !m.hard_filter_pass).length,
    matches: enriched,
  });
}
