// POST /api/profile/telegram-link → rotates the signed-in user's telegram_link_token.
// The user then sends `/start <token>` to the bot in Telegram, which wires chat_id via webhook.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { getCandidateByUserId, updateCandidateAlerts } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const cand = await getCandidateByUserId(user.id);
  if (!cand) return NextResponse.json({ ok: false, error: "profile missing" }, { status: 404 });

  const token = randomBytes(9).toString("base64url"); // ~12-char short code
  await updateCandidateAlerts(cand.id, { telegram_link_token: token });
  return NextResponse.json({ ok: true, token });
}
