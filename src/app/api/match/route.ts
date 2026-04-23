import { NextResponse } from "next/server";
import { getCandidate, getJob } from "@/lib/db";
import { computeAllMatches, applyPrecisionFloor, precisionFloorFor } from "@/lib/matching";
import { isLLMAvailable, currentProvider, currentModel } from "@/lib/llm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/match  { candidateId?, useLLM?, applyFloor? }
// If candidateId is not provided, uses the signed-in user's candidate profile.
// Demo personas require an explicit candidateId (and do not require auth).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  let candidateId = String(body.candidateId || "");
  const useLLM = body.useLLM !== false;
  const applyFloor = body.applyFloor !== false;

  if (!candidateId) {
    const user = await getSessionUser();
    if (user?.candidate_id) candidateId = user.candidate_id;
  }

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId required (or sign in)" }, { status: 400 });
  }

  const candidate = await getCandidate(candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "candidate not found" }, { status: 404 });
  }

  const all = await computeAllMatches(candidateId, { useLLM });
  const kept = applyFloor ? applyPrecisionFloor(all, candidate) : all;

  const enriched = (
    await Promise.all(
      kept.map(async (m) => {
        const job = await getJob(m.job_id);
        return job ? { match: m, job } : null;
      }),
    )
  ).filter((x): x is { match: (typeof kept)[number]; job: NonNullable<Awaited<ReturnType<typeof getJob>>> } => x !== null);

  return NextResponse.json({
    threshold: precisionFloorFor(candidate),
    llmAvailable: isLLMAvailable(),
    llmProvider: currentProvider(),
    llmModel: currentModel(),
    totalScored: all.length,
    totalKept: kept.length,
    totalHardFiltered: all.filter((m) => !m.hard_filter_pass).length,
    matches: enriched,
  });
}
