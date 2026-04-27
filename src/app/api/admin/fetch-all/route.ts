// Admin: trigger ingest for every active source in one go. Same engine as
// the hourly cron, just an explicit admin button so you don't have to wait
// for the next scheduled run.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listSources } from "@/lib/db";
import { ingestSource } from "@/lib/ingest";
import type { IngestResult } from "@/lib/ingest/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
      acc.broadcast_sent += r.broadcast_sent;
      acc.errors += r.errors.length;
      return acc;
    },
    { fetched: 0, created: 0, updated: 0, broadcast_sent: 0, errors: 0 },
  );

  return NextResponse.json({ sources: sources.length, totals, results });
}
