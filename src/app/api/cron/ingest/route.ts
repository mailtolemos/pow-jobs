// Cron: ingest active sources, oldest-first, as many as fit in the time budget.
//
// Why multi-source per tick: when we processed only ONE source per tick, with
// 60+ sources cycling through every ~2 hours, a fresh job posted on a source
// at the back of the queue could wait ~2 hours to be picked up. Bumping to
// "as many as fit in 50s" cycles through everyone in 1-2 ticks, so Telegram
// broadcasts no longer dry up between manual "fetch all" runs.
//
// Each tick:
//   1. Pulls active sources sorted oldest-checked-first.
//   2. Iterates until either the time budget runs out, or N max sources have
//      been processed (caps the per-tick work so a slow source can't starve
//      the next one).
//   3. Records every run in the ingest_runs log so /admin can show a live
//      heartbeat and per-tick numbers.

import { NextResponse } from "next/server";
import { listSources, recordIngestRun } from "@/lib/db";
import { ingestSource } from "@/lib/ingest";
import { getEffectiveCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";
// Vercel Hobby caps function runtime at 60s. We bail at 50s.
export const maxDuration = 60;

const TIME_BUDGET_MS = 50_000;
const MAX_SOURCES_PER_TICK = 6;

async function isAuthorized(req: Request): Promise<boolean> {
  const secret = await getEffectiveCronSecret();
  if (!secret) return true; // no gate configured, allow (dev-friendly)
  const url = new URL(req.url);
  const qs = url.searchParams.get("secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return qs === secret || bearer === secret;
}

interface SourceResult {
  id: string;
  name: string;
  ok: boolean;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  broadcast_sent: number;
  errors: number;
  duration_ms: number;
  error?: string;
}

function pickOldestSorted<T extends { last_checked_at: string | null }>(list: T[]): T[] {
  const byTs = (s: T) => (s.last_checked_at ? Date.parse(s.last_checked_at) : 0);
  return [...list].sort((a, b) => byTs(a) - byTs(b));
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const explicitId = url.searchParams.get("source");
  const all = url.searchParams.get("all") === "1";

  const active = (await listSources()).filter((s) => s.active);
  if (active.length === 0) {
    await recordIngestRun({
      source_id: null,
      mode: "no-sources",
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      broadcast_sent: 0,
      errors: 0,
      duration_ms: 0,
    });
    return NextResponse.json({ ok: true, message: "no active sources" });
  }

  const started = Date.now();
  const results: SourceResult[] = [];

  // Decide which sources to process this tick.
  let queue: typeof active;
  let mode: string;
  if (explicitId) {
    const s = active.find((x) => x.id === explicitId);
    if (!s) return NextResponse.json({ ok: false, message: "no source matched" }, { status: 404 });
    queue = [s];
    mode = "explicit";
  } else if (all) {
    queue = pickOldestSorted(active);
    mode = "all";
  } else {
    // Round-robin "as many as fit" — order oldest-first so every source gets
    // touched as we cycle. The time-budget loop bails as soon as we'd risk
    // exceeding maxDuration.
    queue = pickOldestSorted(active);
    mode = "multi";
  }

  let totalCreated = 0;
  let totalBroadcast = 0;
  for (const s of queue) {
    if (mode === "multi" && results.length >= MAX_SOURCES_PER_TICK) break;
    const remaining = TIME_BUDGET_MS - (Date.now() - started);
    if (mode !== "explicit" && remaining < 4000) break;
    try {
      const r = await ingestSource(s);
      const out: SourceResult = {
        id: s.id,
        name: s.name,
        ok: true,
        fetched: r.fetched,
        created: r.created,
        updated: r.updated,
        skipped: r.skipped,
        broadcast_sent: r.broadcast_sent,
        errors: r.errors.length,
        duration_ms: r.duration_ms,
      };
      if (r.errors.length > 0) out.error = r.errors[0];
      results.push(out);
      totalCreated += r.created;
      totalBroadcast += r.broadcast_sent;
      // Per-source diagnostic row so /admin can render a live tick log.
      await recordIngestRun({
        source_id: s.id,
        mode,
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
      results.push({
        id: s.id,
        name: s.name,
        ok: false,
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        broadcast_sent: 0,
        errors: 1,
        duration_ms: 0,
        error: msg,
      });
      await recordIngestRun({
        source_id: s.id,
        mode,
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
    mode,
    processed: results.length,
    queue_size: queue.length,
    total_created: totalCreated,
    total_broadcast: totalBroadcast,
    duration_ms: Date.now() - started,
    results,
  });
}
