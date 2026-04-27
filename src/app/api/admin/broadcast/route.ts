// Admin API for the Telegram broadcast settings.
//   GET    -> { chatId, source: "db" | "env" | null, botTokenPresent: boolean }
//   POST   -> { chatId } body to save
//   DELETE -> clear the DB-stored chat id (env var fallback still applies)
// All admin-only.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  BROADCAST_CHAT_ID_KEY,
  getBroadcastChatId,
} from "@/lib/telegram";
import { getSetting, setSetting, deleteSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

async function guard(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  const fromDb = await getSetting(BROADCAST_CHAT_ID_KEY);
  const fromEnv = process.env.TELEGRAM_BROADCAST_CHAT_ID?.trim() || null;
  const chatId = fromDb || fromEnv;
  return NextResponse.json({
    chatId,
    source: fromDb ? "db" : fromEnv ? "env" : null,
    botTokenPresent: !!process.env.TELEGRAM_BOT_TOKEN,
  });
}

const SaveSchema = z.object({
  chatId: z.string().trim().min(1).max(64),
});

export async function POST(req: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  await setSetting(BROADCAST_CHAT_ID_KEY, parsed.data.chatId);
  const effective = await getBroadcastChatId();
  return NextResponse.json({ ok: true, chatId: effective });
}

export async function DELETE() {
  const blocked = await guard();
  if (blocked) return blocked;
  await deleteSetting(BROADCAST_CHAT_ID_KEY);
  return NextResponse.json({ ok: true });
}
