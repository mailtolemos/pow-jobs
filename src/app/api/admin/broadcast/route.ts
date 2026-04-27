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
  BOT_TOKEN_KEY,
  getBroadcastChatId,
  getBotToken,
} from "@/lib/telegram";
import { getSetting, setSetting, deleteSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

async function guard(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

function maskToken(t: string | null): string | null {
  if (!t) return null;
  // Telegram tokens look like "1234567890:AAAAAA…XXX". Show prefix + last 4.
  const colon = t.indexOf(":");
  if (colon > 0 && t.length > colon + 6) {
    return `${t.slice(0, colon + 3)}…${t.slice(-4)}`;
  }
  return t.length > 8 ? `${t.slice(0, 4)}…${t.slice(-4)}` : "***";
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;

  const chatFromDb = await getSetting(BROADCAST_CHAT_ID_KEY);
  const chatFromEnv = process.env.TELEGRAM_BROADCAST_CHAT_ID?.trim() || null;
  const chatId = chatFromDb || chatFromEnv;

  const tokenFromDb = await getSetting(BOT_TOKEN_KEY);
  const tokenFromEnv = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
  const tokenSource: "db" | "env" | null = tokenFromDb ? "db" : tokenFromEnv ? "env" : null;
  const tokenMask = maskToken(tokenFromDb || tokenFromEnv || null);

  return NextResponse.json({
    chatId,
    chatSource: chatFromDb ? "db" : chatFromEnv ? "env" : null,
    botTokenPresent: !!(tokenFromDb || tokenFromEnv),
    botTokenSource: tokenSource,
    botTokenMask: tokenMask,
  });
}

const SaveSchema = z.object({
  chatId: z.string().trim().max(64).optional(),
  botToken: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  if (parsed.data.chatId) {
    await setSetting(BROADCAST_CHAT_ID_KEY, parsed.data.chatId);
  }
  if (parsed.data.botToken) {
    // Light validation: Telegram bot tokens look like "<digits>:<base64>".
    if (!/^\d{6,12}:[A-Za-z0-9_-]{20,}$/.test(parsed.data.botToken)) {
      return NextResponse.json(
        { error: "bot token doesn't match Telegram's format (digits:characters)" },
        { status: 400 },
      );
    }
    await setSetting(BOT_TOKEN_KEY, parsed.data.botToken);
  }

  return NextResponse.json({
    ok: true,
    chatId: await getBroadcastChatId(),
    botTokenPresent: !!(await getBotToken()),
  });
}

export async function DELETE(req: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  const which = new URL(req.url).searchParams.get("which") ?? "chat";
  if (which === "token") {
    await deleteSetting(BOT_TOKEN_KEY);
  } else {
    await deleteSetting(BROADCAST_CHAT_ID_KEY);
  }
  return NextResponse.json({ ok: true });
}
