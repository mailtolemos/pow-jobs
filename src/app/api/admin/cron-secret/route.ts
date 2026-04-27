// Admin: read or generate the cron secret used by /api/cron/ingest.
// Secret lives in the DB settings table (preferred) or process.env.CRON_SECRET
// (legacy fallback). The admin UI consumes this so it can render a
// fully-copy-pasteable cron-job.org URL — no env-var spelunking required.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/db";
import { CRON_SECRET_KEY } from "@/lib/cron";

export const dynamic = "force-dynamic";

async function guard(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

function generateSecret(): string {
  // 32 bytes hex = 64 chars; URL-safe.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// GET: return the effective secret + its source. Generates one if missing
// so the URL panel can always be copy-pasteable. Admin-only — the secret
// is only ever exposed to authenticated admins.
export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;

  const fromDb = await getSetting(CRON_SECRET_KEY);
  const fromEnv = process.env.CRON_SECRET?.trim() || null;

  if (fromDb && fromDb.trim()) {
    return NextResponse.json({ secret: fromDb.trim(), source: "db" });
  }
  if (fromEnv) {
    return NextResponse.json({ secret: fromEnv, source: "env" });
  }
  // Auto-provision on first read so the cron is configurable out of the box.
  const fresh = generateSecret();
  await setSetting(CRON_SECRET_KEY, fresh);
  return NextResponse.json({ secret: fresh, source: "db", generated: true });
}

// POST: rotate the secret. Useful if you suspect leakage or want to break
// existing cron-job.org configs without redeploying.
export async function POST() {
  const blocked = await guard();
  if (blocked) return blocked;
  const next = generateSecret();
  await setSetting(CRON_SECRET_KEY, next);
  return NextResponse.json({ secret: next, source: "db", rotated: true });
}
