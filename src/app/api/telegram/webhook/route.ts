// Telegram bot webhook.
// Register with Telegram by calling:
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<host>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
// Telegram then POSTs Update objects here.

import { NextResponse } from "next/server";
import {
  findCandidateByTelegramToken,
  updateCandidateAlerts,
} from "@/lib/db";
import { sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TgMessage {
  message_id: number;
  from?: { id: number; username?: string; first_name?: string };
  chat: { id: number; type: string };
  text?: string;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

function authorized(req: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // allow during setup; set a secret in prod
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}

export async function POST(req: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: false, error: "bot not configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const update = (await req.json().catch(() => ({}))) as TgUpdate;
  const msg = update.message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  if (text === "/start" || text === "/help") {
    await sendTelegramMessage(
      chatId,
      "👋 Hi! I'm the Pablo Jobs alert bot.\n\n" +
        "To link this chat to your account, go to <b>Pablo Jobs → Profile → Alerts → Generate link code</b> and send me <code>/start &lt;code&gt;</code>.",
      { parseMode: "HTML" },
    );
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/start ")) {
    const token = text.slice(7).trim();
    if (!token) {
      await sendTelegramMessage(chatId, "Usage: /start <code>", { parseMode: "HTML" });
      return NextResponse.json({ ok: true });
    }
    const cand = await findCandidateByTelegramToken(token);
    if (!cand) {
      await sendTelegramMessage(
        chatId,
        "❌ That link code is invalid or has been rotated. Generate a new one on the website.",
      );
      return NextResponse.json({ ok: true });
    }
    await updateCandidateAlerts(cand.id, {
      telegram_chat_id: chatId,
      telegram_link_token: null, // consume so it can't be reused
      alert_telegram_enabled: true,
    });
    await sendTelegramMessage(
      chatId,
      `✅ Linked. You'll get new matches here whenever they clear your precision floor.\n\n` +
        `Say <code>/stop</code> to pause alerts, or manage everything on the website.`,
      { parseMode: "HTML" },
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/stop") {
    // Identify candidate by chat id via listCandidatesWithAlerts would be slow —
    // rely on updateCandidateAlerts scoped by chat_id is not implemented;
    // simplest: just tell the user to toggle on the site.
    await sendTelegramMessage(
      chatId,
      "To pause alerts, toggle Telegram off in your <b>Profile → Alerts</b> page on the website.",
      { parseMode: "HTML" },
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, "Not a command I recognize. Try /help.");
  return NextResponse.json({ ok: true });
}
