// Admin: run the cron tick right now. This is what the "Run cron now"
// button on /admin calls — bypasses the secret gate (we re-check admin
// session) so you can confirm cron behaviour without hitting cron-job.org.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listSources, recordIngestRun } from "@/lib/db";
import { ingestSource } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIME_BUDGET_MS = 50_000;
const MAX_SOURCES_PER_TICK = 6;

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sources = (await listSources()).filter((s) => s.active);
  if (sources.length === 0) {
    return NextResponse.json({ ok: true, message: "no active sources", processed: 0 });
  }

  const queue = [...sources].sort((a, b) => {
    const at = a.last_checked_at ? Date.parse(a.last_checked_at) : 0;
    const bt = b.last_checked_at ? Date.parse(b.last_checked_at) : 0;
    return at - bt;
  });

  const started = Date.now();
  const results: Array<{ id: string; created: number; broadcast_sent: number; errors: number }> = [];
  let totalCreated = 0;
  let totalBroadcast = 0;

  for (const s of queue) {
    if (results.length >= MAX_SOURCES_PER_TICK) break;
    if (Date.now() - started > TIME_BUDGET_MS - 4000) break;
    try {
      const r = await ingestSource(s);
      results.push({
        id: s.id,
        created: r.created,
        broadcast_sent: r.broadcast_sent,
        errors: r.errors.length,
      });
      totalCreated += r.created;
      totalBroadcast += r.broadcast_sent;
      await recordIngestRun({
        source_id: s.id,
        mode: "manual",
        fetched: r.fetched,
        created: r.created,
        updated: r.updated,
        skipped: r.skipped,
        broadcast_sent: r.broadcast_sent,
        errors: r.errors.length,
        duration_ms: r.duration_ms,
        error_text: r.errors[0] ?? null,
      }).catch(() => undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: s.id, created: 0, broadcast_sent: 0, errors: 1 });
      await recordIngestRun({
        source_id: s.id,
        mode: "manual",
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        broadcast_sent: 0,
        errors: 1,
        duration_ms: 0,
        error_text: msg,
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    total_created: totalCreated,
    total_broadcast: totalBroadcast,
    duration_ms: Date.now() - started,
    results,
  });
}
