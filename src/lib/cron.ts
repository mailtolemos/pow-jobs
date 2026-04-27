// Shared cron config — kept out of any route.ts file because Next.js's
// route handlers have constraints on what symbols they can re-export.

import { getSetting } from "./db";

export const CRON_SECRET_KEY = "cron_secret";

// Resolve the cron secret with priority: settings table > env var.
// Returns null if neither is configured.
export async function getEffectiveCronSecret(): Promise<string | null> {
  try {
    const fromDb = await getSetting(CRON_SECRET_KEY);
    if (fromDb && fromDb.trim()) return fromDb.trim();
  } catch {
    // settings table may not exist yet; fall through
  }
  return process.env.CRON_SECRET?.trim() || null;
}
