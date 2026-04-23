// Weekly digest email renderer. Produces inline-styled HTML that looks OK in most clients.

import type { Candidate, Job, MatchScore } from "./types";

export interface DigestInput {
  candidate: Candidate;
  items: Array<{ match: MatchScore; job: Job }>;
  weekOf: string; // ISO date string
  thresholdUsed: number;
}

function fmtComp(job: Job): string {
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
  if (job.base_min && job.base_max) return `${fmt(job.base_min)}–${fmt(job.base_max)} base`;
  if (job.base_min) return `${fmt(job.base_min)}+ base`;
  if (job.base_max) return `up to ${fmt(job.base_max)} base`;
  return "Comp not disclosed";
}

function fmtExtras(job: Job): string {
  const parts: string[] = [];
  if (job.bonus_pct_target) parts.push(`${job.bonus_pct_target}% target bonus`);
  if (job.token_pct_target) parts.push(`${job.token_pct_target}% token comp`);
  if (job.carry_or_equity_pct) parts.push(`${job.carry_or_equity_pct}% equity/carry`);
  return parts.join(" · ");
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDigestHTML(input: DigestInput): string {
  const { candidate, items, weekOf, thresholdUsed } = input;

  if (items.length === 0) {
    return renderSilenceHTML(candidate, weekOf, thresholdUsed);
  }

  const cards = items
    .slice(0, 5)
    .map(({ match, job }) => {
      const scorePct = Math.round(match.score * 100);
      return `
      <div style="border: 1px solid #E5E5E0; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div style="font-size: 16px; font-weight: 600; color: #0B1220;">${escapeHTML(job.title_raw)}</div>
            <div style="font-size: 14px; color: #5A6578; margin-top: 2px;">${escapeHTML(job.employer)} · ${escapeHTML(job.location)} · ${escapeHTML(job.remote_policy)}</div>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #B88A42; background: #FBF1DC; padding: 4px 10px; border-radius: 999px; white-space: nowrap;">${scorePct}% match</div>
        </div>
        <div style="font-size: 13px; color: #0B1220; margin: 10px 0 6px;">${escapeHTML(fmtComp(job))}${fmtExtras(job) ? ` · ${escapeHTML(fmtExtras(job))}` : ""}</div>
        <div style="font-size: 13px; color: #5A6578; line-height: 1.5; margin-bottom: 12px;">
          <strong style="color: #0B1220;">Why:</strong> ${escapeHTML(match.rationale)}
        </div>
        <a href="${escapeHTML(job.source_url)}" style="display: inline-block; font-size: 13px; font-weight: 600; color: #ffffff; background: #B88A42; padding: 8px 14px; border-radius: 8px; text-decoration: none;">View role</a>
      </div>`;
    })
    .join("");

  const sentCount = Math.min(items.length, 5);
  const totalQualified = items.length;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your weekly Pablo Jobs digest</title></head>
<body style="margin: 0; padding: 0; background: #FAFAF7; font-family: -apple-system, 'Segoe UI', Roboto, Inter, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
    <div style="font-size: 11px; letter-spacing: 0.1em; color: #5A6578; text-transform: uppercase; margin-bottom: 8px;">Pablo Jobs · Week of ${escapeHTML(weekOf.slice(0, 10))}</div>
    <h1 style="font-size: 22px; font-weight: 700; color: #0B1220; margin: 0 0 6px;">${sentCount} ${sentCount === 1 ? "match" : "matches"} worth your time, ${escapeHTML(candidate.display_name)}.</h1>
    <p style="font-size: 14px; color: #5A6578; margin: 0 0 24px; line-height: 1.5;">We scored every open role against your profile. Showing ${sentCount} of ${totalQualified} that cleared your precision floor (${Math.round(thresholdUsed * 100)}%). No noise.</p>
    ${cards}
    <div style="border-top: 1px solid #E5E5E0; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #8A94A6;">
      You're receiving this because you opted in to weekly matches. <a href="#" style="color: #B88A42;">Update preferences</a> · <a href="#" style="color: #B88A42;">Pause for 4 weeks</a> · <a href="#" style="color: #B88A42;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
}

function renderSilenceHTML(candidate: Candidate, weekOf: string, threshold: number): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>No matches this week</title></head>
<body style="margin: 0; padding: 0; background: #FAFAF7; font-family: -apple-system, 'Segoe UI', Roboto, Inter, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
    <div style="font-size: 11px; letter-spacing: 0.1em; color: #5A6578; text-transform: uppercase; margin-bottom: 8px;">Pablo Jobs · Week of ${escapeHTML(weekOf.slice(0, 10))}</div>
    <h1 style="font-size: 22px; font-weight: 700; color: #0B1220; margin: 0 0 12px;">Nothing cleared your bar this week, ${escapeHTML(candidate.display_name)}.</h1>
    <p style="font-size: 14px; color: #5A6578; line-height: 1.6; margin: 0 0 20px;">
      We scored every new role that came in — none crossed your precision floor of ${Math.round(threshold * 100)}%. We'd rather send silence than noise.
    </p>
    <p style="font-size: 14px; color: #5A6578; line-height: 1.6; margin: 0 0 20px;">
      Want more? Broaden your filters, lower your comp floor, or expand your jurisdictions — we'll pick up the signal.
    </p>
    <a href="#" style="display: inline-block; font-size: 13px; font-weight: 600; color: #ffffff; background: #B88A42; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Adjust preferences</a>
  </div>
</body>
</html>`;
}
