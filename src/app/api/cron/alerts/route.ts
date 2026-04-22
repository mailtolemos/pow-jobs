// Daily alert runner — triggered by Vercel Cron (see vercel.json) or called manually.
// Security: requires either the x-vercel-cron header (set by Vercel's cron infra) or
// a matching CRON_SECRET bearer token.

import { NextResponse } from "next/server";
import { dispatchAlertsForAllUsers } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds

function authorized(req: Request): boolean {
  // Vercel's cron stamps this header on every scheduled invocation.
  if (req.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // if unset, allow (dev / preview)
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const frequency = (url.searchParams.get("frequency") as "daily" | "weekly" | "realtime" | null) ?? "daily";
  const dryRun = url.searchParams.get("dryRun") === "1";
  const forceCandidateId = url.searchParams.get("candidateId") ?? undefined;
  const started = Date.now();
  const report = await dispatchAlertsForAllUsers({ frequency, dryRun, forceCandidateId });
  const duration_ms = Date.now() - started;
  return NextResponse.json({ ok: true, duration_ms, ...report });
}

export async function POST(req: Request) {
  return GET(req);
}
