// Cron: ingest every active source.
// Triggered by Vercel Cron; optionally gated by CRON_SECRET header/query so
// only Vercel's scheduler can invoke it in production.

import { NextResponse } from "next/server";
import { listSources } from "@/lib/db";
import { ingestSource } from "@/lib/ingest";
import { getEffectiveCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Round-robin one source per cron tick.
//
// Why: cron-job.org's free-tier timeout is 30s, and Vercel Hobby caps each
// function at 60s. A full batch of 30+ sources (with Groq rate-limit waits)
// reliably exceeds both. By processing the SINGLE oldest-checked active
// source per tick and returning immediately, we keep every tick under the
// timeout. Schedule cron-job.org at every 1 minute (free), and 30 sources
// cycle through every 30 minutes — much faster than waiting for the next
// batch run.
//
// `?source=<id>` overrides the round-robin and forces a specific source.
// `?all=1` falls back to the legacy "process every source" behavior, useful
// for manual cron-job.org test runs after a long pause.
async function isAuthorized(req: Request): Promise<boolean> {
  const secret = await getEffectiveCronSecret();
  if (!secret) return true; // no gate configured, allow (dev-friendly)
  const url = new URL(req.url);
  const qs = url.searchParams.get("secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return qs === secret || bearer === secret;
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const explicitId = url.searchParams.get("source");
  const all = url.searchParams.get("all") === "1";

  const active = (await listSources()).filter((s) => s.active);
  if (active.length === 0) return NextResponse.json({ ok: true, message: "no active sources" });

  // One-shot mode for ad-hoc / hourly / batch usage.
  if (all) {
    let processed = 0;
    const out: Array<{ id: string; ok: boolean; created: number; errors: number }> = [];
    for (const s of active) {
      try {
        const r = await ingestSource(s);
        out.push({ id: s.id, ok: true, created: r.created, errors: r.errors.length });
        processed += 1;
      } catch (e) {
        out.push({ id: s.id, ok: false, created: 0, errors: 1 });
        processed += 1;
        // continue to next source — never let one bad source kill the loop
        void e;
      }
    }
    return NextResponse.json({ mode: "all", processed, results: out });
  }

  // Round-robin mode (default). Pick the source with the oldest
  // last_checked_at (NULL counts as oldest), or the explicit one.
  const target = explicitId
    ? active.find((s) => s.id === explicitId)
    : pickOldest(active);

  if (!target) {
    return NextResponse.json({ ok: true, message: "no source matched" }, { status: 404 });
  }

  try {
    const result = await ingestSource(target);
    return NextResponse.json({
      mode: "round-robin",
      source: { id: target.id, name: target.name, url: target.url },
      result: {
        fetched: result.fetched,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        llm_classified: result.llm_classified,
        broadcast_sent: result.broadcast_sent,
        errors: result.errors.length,
        duration_ms: result.duration_ms,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        mode: "round-robin",
        source: { id: target.id, name: target.name },
        error: (e as Error).message,
      },
      { status: 500 },
    );
  }
}

function pickOldest<T extends { last_checked_at: string | null }>(list: T[]): T | undefined {
  if (list.length === 0) return undefined;
  let oldest = list[0];
  let oldestTs = oldest.last_checked_at ? Date.parse(oldest.last_checked_at) : 0;
  for (const s of list.slice(1)) {
    const ts = s.last_checked_at ? Date.parse(s.last_checked_at) : 0;
    if (ts < oldestTs) {
      oldest = s;
      oldestTs = ts;
    }
  }
  return oldest;
}
