// Cron health endpoint — public, returns minimal status so the admin UI
// (and you, with curl) can answer "is the cron route reachable?" without
// leaking the secret. Distinct from /api/cron/ingest so admins can hit
// this freely without triggering work or fighting the auth gate.

import { NextResponse } from "next/server";
import { getEffectiveCronSecret } from "@/lib/cron";
import { listRecentIngestRuns, listSources } from "@/lib/db";
import { isBroadcastConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  const [secret, runs, sources, broadcast] = await Promise.all([
    getEffectiveCronSecret().catch(() => null),
    listRecentIngestRuns(1).catch(() => []),
    listSources().catch(() => []),
    isBroadcastConfigured().catch(() => false),
  ]);

  const lastRun = runs[0] ?? null;
  const minutesSinceLast = lastRun
    ? Math.round((Date.now() - Date.parse(lastRun.ran_at)) / 60_000)
    : null;
  const activeSources = sources.filter((s) => s.active).length;

  return NextResponse.json({
    ok: true,
    secret_configured: Boolean(secret),
    broadcast_configured: broadcast,
    active_sources: activeSources,
    last_run_at: lastRun?.ran_at ?? null,
    minutes_since_last_run: minutesSinceLast,
    last_run_summary: lastRun
      ? {
          mode: lastRun.mode,
          source_id: lastRun.source_id,
          created: lastRun.created,
          broadcast_sent: lastRun.broadcast_sent,
          errors: lastRun.errors,
          duration_ms: lastRun.duration_ms,
        }
      : null,
    server_now: new Date().toISOString(),
  });
}
