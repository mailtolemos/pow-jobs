// Core alert dispatcher. Shared between the cron job and any future
// "send me a test email" admin endpoint.

import type { Candidate, Job, MatchScore } from "./types";
import {
  listCandidatesWithAlerts,
  getJob,
  hasSentAlert,
  recordSentAlert,
  type CandidateExtras,
} from "./db";
import { computeAllMatches, applyPrecisionFloor } from "./matching";
import { sendMail, getAppUrl } from "./mailer";
import { sendTelegramMessage, escapeHTML as escapeTg } from "./telegram";
import { renderDigestHTML } from "./email";

export interface DispatchResult {
  candidate_id: string;
  email_sent: boolean;
  telegram_sent: boolean;
  new_matches: number;
  skipped_reason?: string;
  error?: string;
}

export interface DispatchOptions {
  maxPerUser?: number; // cap per run (default 5)
  dryRun?: boolean;
  frequency?: "daily" | "weekly" | "realtime" | null; // filter; null = all enabled
  forceCandidateId?: string; // for testing
}

function formatJobForTelegram(job: Job, match: MatchScore): string {
  const pct = Math.round(match.score * 100);
  const comp = job.base_min && job.base_max
    ? `$${Math.round(job.base_min / 1000)}k–$${Math.round(job.base_max / 1000)}k`
    : "comp not disclosed";
  const tokenNote = job.token_pct_target ? `, ${job.token_pct_target}% token` : "";
  const url = job.source_url;
  return (
    `<b>${escapeTg(job.title_raw)}</b> — <i>${escapeTg(job.employer)}</i>\n` +
    `${escapeTg(job.location)} · ${escapeTg(job.remote_policy)}\n` +
    `${escapeTg(comp)}${escapeTg(tokenNote)}\n` +
    `<b>${pct}% match</b>: ${escapeTg(match.rationale)}\n\n` +
    (url ? `<a href="${escapeTg(url)}">View role</a>` : "")
  );
}

export async function dispatchAlertsForCandidate(
  candidate: Candidate & CandidateExtras & { user_email: string | null },
  opts: DispatchOptions = {},
): Promise<DispatchResult> {
  const result: DispatchResult = {
    candidate_id: candidate.id,
    email_sent: false,
    telegram_sent: false,
    new_matches: 0,
  };

  if (!candidate.profile_complete) {
    result.skipped_reason = "profile_incomplete";
    return result;
  }

  // Score & filter fresh.
  const all = await computeAllMatches(candidate.id, { useLLM: false });
  const qualified = applyPrecisionFloor(all, candidate);

  // Dedup against previously sent alerts per channel.
  const cap = opts.maxPerUser ?? 5;
  const emailCandidates = candidate.alert_email_enabled ? qualified.slice(0, cap * 3) : [];
  const tgCandidates = candidate.alert_telegram_enabled && candidate.telegram_chat_id
    ? qualified.slice(0, cap * 3)
    : [];

  const emailFresh: Array<{ match: MatchScore; job: Job }> = [];
  for (const m of emailCandidates) {
    if (emailFresh.length >= cap) break;
    const already = await hasSentAlert(candidate.id, m.job_id, "email");
    if (already) continue;
    const job = await getJob(m.job_id);
    if (!job) continue;
    emailFresh.push({ match: m, job });
  }

  const tgFresh: Array<{ match: MatchScore; job: Job }> = [];
  for (const m of tgCandidates) {
    if (tgFresh.length >= cap) break;
    const already = await hasSentAlert(candidate.id, m.job_id, "telegram");
    if (already) continue;
    const job = await getJob(m.job_id);
    if (!job) continue;
    tgFresh.push({ match: m, job });
  }

  result.new_matches = emailFresh.length + tgFresh.length;

  if (opts.dryRun) {
    return result;
  }

  // --- Email ---
  if (candidate.alert_email_enabled && candidate.user_email && emailFresh.length > 0) {
    const html = renderDigestHTML({
      candidate,
      items: emailFresh,
      weekOf: new Date().toISOString(),
      thresholdUsed: 0.65,
    });
    const subject =
      emailFresh.length === 1
        ? `1 match worth your time — ${emailFresh[0].job.title_raw}`
        : `${emailFresh.length} matches worth your time`;
    const send = await sendMail({
      to: candidate.user_email,
      subject,
      html,
    });
    if (send.ok) {
      result.email_sent = true;
      for (const { match } of emailFresh) {
        await recordSentAlert(candidate.id, match.job_id, "email");
      }
    } else {
      result.error = (result.error ? result.error + "; " : "") + `email: ${send.error}`;
    }
  }

  // --- Telegram ---
  if (candidate.alert_telegram_enabled && candidate.telegram_chat_id && tgFresh.length > 0) {
    const header =
      tgFresh.length === 1
        ? "<b>1 new role</b> worth your time:\n\n"
        : `<b>${tgFresh.length} new roles</b> worth your time:\n\n`;
    const separator = "\n\n— — — — —\n\n";
    const body = tgFresh.map(({ match, job }) => formatJobForTelegram(job, match)).join(separator);
    const footer = `\n\n<i>Sent by Pablo Jobs · <a href="${getAppUrl()}/profile">manage alerts</a></i>`;
    const tg = await sendTelegramMessage(candidate.telegram_chat_id, header + body + footer, {
      parseMode: "HTML",
      disablePreview: true,
    });
    if (tg.ok) {
      result.telegram_sent = true;
      for (const { match } of tgFresh) {
        await recordSentAlert(candidate.id, match.job_id, "telegram");
      }
    } else {
      result.error = (result.error ? result.error + "; " : "") + `telegram: ${tg.error}`;
    }
  }

  return result;
}

export async function dispatchAlertsForAllUsers(
  opts: DispatchOptions = {},
): Promise<{ total: number; sent: DispatchResult[] }> {
  const candidates = await listCandidatesWithAlerts();
  const sent: DispatchResult[] = [];
  for (const cand of candidates) {
    if (opts.forceCandidateId && cand.id !== opts.forceCandidateId) continue;
    if (opts.frequency && cand.alert_frequency !== opts.frequency) continue;
    const r = await dispatchAlertsForCandidate(cand, opts);
    sent.push(r);
  }
  return { total: candidates.length, sent };
}
