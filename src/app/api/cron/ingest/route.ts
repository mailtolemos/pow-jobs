// Cron: ingest every active source.
// Triggered by Vercel Cron; optionally gated by CRON_SECRET header/query so
// only Vercel's scheduler can invoke it in production.

import { NextResponse } from "next/server";
import { listSources, getSetting } from "@/lib/db";
import { ingestSource } from "@/lib/ingest";
import type { IngestResult } from "@/lib/ingest/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const CRON_SECRET_KEY = "cron_secret";

async function getEffectiveCronSecret(): Promise<string | null> {
  try {
    const fromDb = await getSetting(CRON_SECRET_KEY);
    if (fromDb && fromDb.trim()) return fromDb.trim();
  } catch {
    // settings table may not exist yet
  }
  return process.env.CRON_SECRET?.trim() || null;
}

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
  const sources = (await listSources()).filter((s) => s.active);
  const results: IngestResult[] = [];
  for (const s of sources) {
    try {
      results.push(await ingestSource(s));
    } catch (e) {
      results.push({
        source_id: s.id,
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        llm_classified: 0,
        llm_errors: [],
        broadcast_configured: false,
        broadcast_sent: 0,
        broadcast_errors: [],
        errors: [`fatal: ${(e as Error).message}`],
        duration_ms: 0,
      });
    }
  }
  const totals = results.reduce(
    (acc, r) => {
      acc.fetched += r.fetched;
      acc.created += r.created;
      acc.updated += r.updated;
      acc.errors += r.errors.length;
      return acc;
    },
    { fetched: 0, created: 0, updated: 0, errors: 0 },
  );
  return NextResponse.json({ sources: sources.length, totals, results });
}
