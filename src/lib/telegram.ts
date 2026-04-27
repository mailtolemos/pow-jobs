// Minimal Telegram Bot API wrapper. Only what we need: sendMessage.

const API_BASE = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts: { parseMode?: "Markdown" | "HTML"; disablePreview?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };
  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: opts.parseMode ?? "HTML",
        disable_web_page_preview: opts.disablePreview ?? false,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.description ?? `http ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// -------- Broadcast channel --------
// Every time a new role is ingested, we optionally fan it out to a public
// Telegram channel so followers can see it immediately. Separate from the
// per-candidate alerts — that stays personal, this is a broadcast feed.
//
// Chat id resolution:
//   1. settings table key="telegram_broadcast_chat_id"  (set from /admin)
//   2. process.env.TELEGRAM_BROADCAST_CHAT_ID            (Vercel env var)
// Bot token is always env-only since it's a secret.

import type { Job } from "./types";
import { getSetting } from "./db";

export const BROADCAST_CHAT_ID_KEY = "telegram_broadcast_chat_id";

export async function getBroadcastChatId(): Promise<string | null> {
  try {
    const fromDb = await getSetting(BROADCAST_CHAT_ID_KEY);
    if (fromDb && fromDb.trim()) return fromDb.trim();
  } catch {
    // settings table may not exist on first cold start — fall through
  }
  const env = process.env.TELEGRAM_BROADCAST_CHAT_ID?.trim();
  return env || null;
}

export async function isBroadcastConfigured(): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false;
  const chatId = await getBroadcastChatId();
  return !!chatId;
}

function fmtComp(job: Job): string | null {
  if (job.base_min == null && job.base_max == null) return null;
  const k = (v: number | null) => (v == null ? "?" : `$${Math.round(v / 1000)}k`);
  if (job.base_min != null && job.base_max != null && job.base_min !== job.base_max) {
    return `${k(job.base_min)}–${k(job.base_max)}`;
  }
  return k(job.base_max ?? job.base_min);
}

export function buildBroadcastMessage(job: Job): string {
  const lines: string[] = [];
  lines.push(`<b>💼 ${escapeHTML(job.title_raw)}</b>`);
  lines.push(`<b>${escapeHTML(job.employer)}</b> · ${escapeHTML(job.location)}`);
  const meta: string[] = [];
  meta.push(job.seniority.toUpperCase());
  meta.push(job.domain);
  meta.push(job.remote_policy);
  if (job.department) meta.push(job.department);
  lines.push(`<i>${escapeHTML(meta.join(" · "))}</i>`);
  const comp = fmtComp(job);
  if (comp) lines.push(`💰 ${comp}`);
  if (job.tech_stack.length > 0) {
    lines.push(`🛠️ ${escapeHTML(job.tech_stack.slice(0, 6).join(", "))}`);
  }
  const firstLine = (job.description || "").split("\n").find((l) => l.trim().length > 30);
  if (firstLine) {
    const trimmed = firstLine.trim().slice(0, 240);
    lines.push("");
    lines.push(escapeHTML(trimmed) + (firstLine.length > 240 ? "…" : ""));
  }
  lines.push("");
  lines.push(`<a href="${escapeHTML(job.source_url)}">Apply →</a>`);
  return lines.join("\n");
}

// Fire-and-forget broadcast. Never throws. Caller shouldn't block ingest on
// this — a failed Telegram post must not take down the main upsert path.
export async function broadcastJob(job: Job): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN env var not set" };
  }
  const chatId = await getBroadcastChatId();
  if (!chatId) {
    return { ok: false, error: "no broadcast chat id configured (set in /admin or env)" };
  }
  const text = buildBroadcastMessage(job);
  return sendTelegramMessage(chatId, text, { parseMode: "HTML", disablePreview: false });
}

// Send a fixed test message to the configured broadcast chat. Used by the
// "Send test broadcast" button in /admin so admins can verify their setup
// without having to ingest a fresh job first.
export async function broadcastTestMessage(): Promise<{ ok: boolean; error?: string; chatId?: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN env var not set" };
  }
  const chatId = await getBroadcastChatId();
  if (!chatId) {
    return { ok: false, error: "no broadcast chat id configured" };
  }
  const text = `<b>✅ Pablo Jobs broadcast test</b>\nThis chat is wired up. New roles will land here automatically.\n<i>${new Date().toISOString()}</i>`;
  const res = await sendTelegramMessage(chatId, text, { parseMode: "HTML" });
  return { ...res, chatId };
}
