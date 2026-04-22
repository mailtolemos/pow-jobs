// POST /api/auth/signin  { email, redirectTo? }
// Creates a magic-link token, emails it, returns { ok, devPreviewUrl? }.
// In dev mode (no RESEND_API_KEY) the response includes the magic URL so the
// developer can click it directly — production behavior requires clicking email.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createMagicLinkToken } from "@/lib/db";
import { sendMail, renderMagicLinkEmail, isMailerAvailable, getAppUrl } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email().max(254),
  redirectTo: z.string().startsWith("/").optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }
  const { email, redirectTo } = parsed.data;

  const token = await createMagicLinkToken(email, redirectTo ?? null, 15);
  const url = `${getAppUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`;

  const { subject, html, text } = renderMagicLinkEmail({ url, email });
  const send = await sendMail({ to: email, subject, html, text });

  if (!send.ok) {
    return NextResponse.json({ ok: false, error: send.error }, { status: 500 });
  }

  // Surface the link to the developer when running without Resend.
  const devPreviewUrl = !isMailerAvailable() ? url : undefined;
  return NextResponse.json({ ok: true, devPreviewUrl });
}
