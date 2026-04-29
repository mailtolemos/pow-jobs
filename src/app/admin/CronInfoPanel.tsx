"use client";

import { useEffect, useState } from "react";

// Hourly auto-fetch via cron-job.org. The panel auto-fetches the cron
// secret from the DB (or generates one on first read) so the URL is fully
// copy-pasteable — no env-var fishing.

interface CronSecret {
  secret: string;
  source: "db" | "env";
  generated?: boolean;
  rotated?: boolean;
}

export function CronInfoPanel() {
  const [origin, setOrigin] = useState("https://pow-jobs.vercel.app");
  const [data, setData] = useState<CronSecret | null>(null);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/cron-secret", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function rotate() {
    if (!confirm("Rotate the cron secret? Any existing cron-job.org configs using the old value will start failing. Update them with the new URL after.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/cron-secret", { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
      setMsg("Rotated. Update the URL in your cron-job.org config below.");
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const fullUrl = data
    ? `${origin}/api/cron/ingest?secret=${encodeURIComponent(data.secret)}`
    : `${origin}/api/cron/ingest?secret=…loading…`;
  const maskedUrl = data
    ? `${origin}/api/cron/ingest?secret=${data.secret.slice(0, 4)}…${data.secret.slice(-4)}`
    : fullUrl;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setMsg("Copied. Paste into cron-job.org's URL field.");
    } catch {
      setMsg("Copy failed. Select + copy the revealed URL manually.");
    }
  }

  return (
    <section className="bg-surface border border-line rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-xl font-semibold text-ink">Hourly auto-fetch</h2>
        <span className="text-xs text-muted">
          Free hourly cron via an external scheduler. No Vercel upgrade needed.
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
          (just an email, no card).
        </li>
        <li>After login, click <b>Create cronjob</b> in the top-right.</li>
        <li>
          Fill in the form with the values below. <b>Common</b> tab on the right covers
          everything you need.
        </li>
      </ol>

      <div className="mt-4 grid gap-2.5">
        <Field label="Title">
          <code className="bg-paper border border-line rounded px-2 py-1 text-xs font-mono text-ink/80">
            ProWo ingest
          </code>
        </Field>

        <Field label="URL (paste this exactly)">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="bg-paper border border-line rounded px-2 py-1.5 text-xs font-mono text-ink/80 break-all flex-1 min-w-0">
              {reveal ? fullUrl : maskedUrl}
            </code>
            <button
              onClick={() => setReveal((v) => !v)}
              disabled={!data}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {reveal ? "Hide" : "Reveal"}
            </button>
            <button
              onClick={copy}
              disabled={!data}
              className="rounded-lg bg-accent text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Copy URL
            </button>
          </div>
          <div className="text-[11px] text-muted mt-1">
            Includes the secret already, just click <b>Copy URL</b> and paste into
            cron-job.org. {data?.source === "db" && data.generated && "Auto-generated and saved on first load."}{" "}
            <button
              onClick={rotate}
              disabled={busy}
              className="underline hover:text-ink disabled:opacity-50"
            >
              Rotate secret
            </button>
            {data && (
              <span className="ml-2 text-[10px] uppercase tracking-wider px-1 rounded bg-line/60 text-ink/70">
                from {data.source}
              </span>
            )}
          </div>
        </Field>

        <Field label="Schedule">
          <div className="text-xs text-ink/90">
            Pick{" "}
            <code className="bg-paper border border-line rounded px-1.5 py-0.5 text-[11px] font-mono">
              Every 2 minutes
            </code>{" "}
            (cron-job.org free tier supports this).
          </div>
          <div className="text-[11px] text-muted mt-1">
            Each tick processes the single source with the oldest{" "}
            <code>last_checked_at</code> and claims it up-front to prevent
            overlapping ticks from double-processing. With 60 sources, you cycle
            through every ~2 hours: fast enough for fresh roles, slow enough
            to comfortably stay under Groq rate limits.
          </div>
        </Field>

        <Field label="Method">
          <code className="bg-paper border border-line rounded px-2 py-1 text-xs font-mono text-ink/80">
            GET
          </code>{" "}
          <span className="text-[11px] text-muted">(default, no change needed)</span>
        </Field>

        <Field label="Notifications">
          <span className="text-xs text-muted">
            Optional. cron-job.org can email you on failures. Leave at default if you don&rsquo;t care.
          </span>
        </Field>

        <Field label="Click">
          <span className="text-xs text-ink/90">
            <b>Create</b>. Done. Your cron history will start populating after the next top-of-hour.
          </span>
        </Field>
      </div>

      {msg && (
        <div className="mt-3 text-xs rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-900">
          {msg}
        </div>
      )}

      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer">Backup + how this interacts with the Vercel daily cron</summary>
        <p className="mt-2">
          Vercel will keep firing the daily cron at 06:00 UTC as a safety net. Both pings hit the
          same <code>/api/cron/ingest</code> endpoint and the per-source dedup logic ensures
          duplicate runs are harmless. If cron-job.org is ever down, your daily fetch still
          happens.
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
