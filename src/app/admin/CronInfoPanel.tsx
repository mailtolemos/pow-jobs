"use client";

import { useEffect, useState } from "react";

// Vercel Hobby plan only allows daily cron; for true hourly fetching we
// recommend pointing an external scheduler (cron-job.org is free, no
// signup needed beyond email) at /api/cron/ingest. This panel makes that
// trivial — copy the URL pattern, paste into the scheduler, fill in the
// secret value yourself.

export function CronInfoPanel() {
  const [origin, setOrigin] = useState("https://pow-jobs.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const url = `${origin}/api/cron/ingest?secret=YOUR_CRON_SECRET`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      alert("Copied URL pattern. Replace YOUR_CRON_SECRET with the value of CRON_SECRET on Vercel.");
    } catch {
      alert("Copy failed — select and copy the URL above manually.");
    }
  }

  return (
    <section className="bg-surface border border-line rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-xl font-semibold text-ink">Hourly auto-fetch</h2>
        <span className="text-xs text-muted">
          Vercel Hobby plan caps native cron at daily — use an external scheduler for hourly.
        </span>
      </div>

      <ol className="text-sm text-ink/90 space-y-2 list-decimal pl-5">
        <li>
          Sign up free at{" "}
          <a
            href="https://cron-job.org/en/signup/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-medium"
          >
            cron-job.org
          </a>{" "}
          (or any equivalent — uptimerobot, easycron, etc).
        </li>
        <li>Create a new cron job:</li>
      </ol>

      <div className="mt-3 grid gap-2">
        <Field label="Title">
          <code className="bg-paper border border-line rounded px-2 py-1 text-xs font-mono text-ink/80">
            Pablo Jobs ingest
          </code>
        </Field>
        <Field label="URL">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="bg-paper border border-line rounded px-2 py-1.5 text-xs font-mono text-ink/80 break-all flex-1 min-w-0">
              {url}
            </code>
            <button
              onClick={copy}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-accent/60"
            >
              Copy
            </button>
          </div>
          <div className="text-[11px] text-muted mt-1">
            Replace <code className="bg-amber-100 px-1 rounded">YOUR_CRON_SECRET</code> with the
            value of <code>CRON_SECRET</code> from your Vercel env vars (Settings → Environment
            Variables). Without this, cron-job.org's request will be rejected.
          </div>
        </Field>
        <Field label="Schedule">
          <code className="bg-paper border border-line rounded px-2 py-1 text-xs font-mono text-ink/80">
            Every hour at minute 0
          </code>
        </Field>
        <Field label="Method">
          <code className="bg-paper border border-line rounded px-2 py-1 text-xs font-mono text-ink/80">
            GET
          </code>
        </Field>
      </div>

      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer">Why not native Vercel cron?</summary>
        <p className="mt-2">
          Vercel&rsquo;s Hobby plan limits cron jobs to daily schedules (one run per 24h).
          Pro plan unlocks arbitrary schedules. An external scheduler avoids the upgrade and
          is the standard approach for free-tier hourly tasks.
        </p>
      </details>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}
