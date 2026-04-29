// Admin: bulk-insert the curated tech / AI / IT seed list.
// Idempotent — sources are matched by URL; duplicates are skipped.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listSources, createSource } from "@/lib/db";
import { TECH_SEED_SOURCES } from "@/lib/seeds/tech-sources";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const existing = await listSources();
  const known = new Set(existing.map((s) => s.url.trim().toLowerCase()));

  let added = 0;
  const skipped: string[] = [];
  const errors: Array<{ name: string; error: string }> = [];

  for (const seed of TECH_SEED_SOURCES) {
    if (known.has(seed.url.trim().toLowerCase())) {
      skipped.push(seed.name);
      continue;
    }
    try {
      await createSource({
        name: seed.name,
        url: seed.url,
        kind: seed.kind,
        active: true,
        notes: seed.notes ?? "",
      });
      added += 1;
    } catch (e) {
      errors.push({ name: seed.name, error: (e as Error).message });
    }
  }

  return NextResponse.json({
    added,
    skipped: skipped.length,
    skipped_names: skipped,
    errors,
    total_in_seed: TECH_SEED_SOURCES.length,
  });
}
