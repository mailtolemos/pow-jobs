// Send a test message to the configured broadcast chat. Surfaces the exact
// Telegram API error inline so admins can diagnose without spelunking logs.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { broadcastTestMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const result = await broadcastTestMessage();
  return NextResponse.json(result);
}
