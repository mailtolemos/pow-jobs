// Email sender. Uses Resend if RESEND_API_KEY is set; otherwise logs to stdout
// so development works without any external service.

import { Resend } from "resend";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function isMailerAvailable(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || "PoW Jobs <onboarding@resend.dev>";
}

function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pow-jobs.vercel.app";
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  ok: boolean;
  id?: string;
  error?: string;
  // When the mailer is not configured we echo the content so the developer
  // (or Claude) can still observe what would have been sent.
  devPreview?: { to: string; subject: string; html: string };
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const client = getClient();
  if (!client) {
    // Dev mode: log and return the preview.
    console.log(`[mailer:dev] to=${input.to} subject=${JSON.stringify(input.subject)}`);
    console.log(`[mailer:dev] html-length=${input.html.length}`);
    return { ok: true, devPreview: input };
  }
  try {
    const result = await client.emails.send({
      from: getFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) {
      return { ok: false, error: result.error.message ?? String(result.error) };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Plain magic-link email. Simple, professional — matches the brand.
export function renderMagicLinkEmail(opts: { url: string; email: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const safeUrl = opts.url.replace(/"/g, "&quot;");
  const subject = "Sign in to PoW Jobs";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="font-size:11px;letter-spacing:0.12em;color:#5A6578;text-transform:uppercase;margin-bottom:10px;">PoW Jobs</div>
    <h1 style="font-size:22px;font-weight:700;color:#0B1220;margin:0 0 12px;">Your sign-in link</h1>
    <p style="font-size:15px;color:#3A4556;line-height:1.6;margin:0 0 24px;">
      Click the button below to sign in. The link is valid for 15 minutes and can only be used once.
    </p>
    <a href="${safeUrl}" style="display:inline-block;font-size:14px;font-weight:600;color:#ffffff;background:#1F3A5F;padding:12px 22px;border-radius:8px;text-decoration:none;">
      Sign in to PoW Jobs
    </a>
    <p style="font-size:13px;color:#5A6578;line-height:1.6;margin:32px 0 0;">
      Or copy and paste this URL into your browser:<br>
      <span style="word-break:break-all;color:#1F3A5F;">${safeUrl}</span>
    </p>
    <div style="border-top:1px solid #E5E5E0;margin-top:32px;padding-top:16px;font-size:12px;color:#8A94A6;">
      If you didn't request this, you can safely ignore the email. Nothing will happen until you click.
    </div>
  </div>
</body></html>`;
  const text = `Sign in to PoW Jobs\n\nOpen this link to sign in (valid 15 minutes, single use):\n${opts.url}\n\nIf you didn't request this, ignore this email.`;
  return { subject, html, text };
}

export { getAppUrl };
