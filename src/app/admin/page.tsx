import { listSources, listJobs, listCandidates, getIngestStats, listRecentIngestRuns } from "@/lib/db";
import { AdminSourcesClient } from "./AdminSourcesClient";
import { BroadcastPanel } from "./BroadcastPanel";
import { CronInfoPanel } from "./CronInfoPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Auth is gated by /admin/layout.tsx.
  const [sources, jobs, candidates, stats, recentRuns] = await Promise.all([
    listSources(),
    listJobs({ openOnly: false }),
    listCandidates(),
    getIngestStats(),
    listRecentIngestRuns(20),
  ]);

  const byDomain: Record<string, number> = {};
  for (const j of jobs) byDomain[j.domain] = (byDomain[j.domain] || 0) + 1;
  const activeSources = sources.filter((s) => s.active).length;
  const fmtRel = (iso: string | null): string => {
    if (!iso) return "never";
    const ms = Date.now() - Date.parse(iso);
    if (Number.isNaN(ms) || ms < 0) return "-";
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Sources & job boards</h1>
        <p className="text-muted mt-1 text-sm">
          Manage the catalogue of upstream job sources that feed the ingest pipeline.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-4">
        <Stat label="Active sources" value={`${activeSources} / ${sources.length}`} />
        <Stat label="Jobs in DB" value={jobs.length.toString()} />
        <Stat label="Candidates" value={candidates.length.toString()} />
        <Stat label="Distinct domains" value={Object.keys(byDomain).length.toString()} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Stat
          label="Last cron tick"
          value={fmtRel(stats.most_recent_source_check_at)}
          hint="When any source was last checked. Should be < 5min if cron-job.org is wired up."
        />
        <Stat
          label="Jobs touched (24h)"
          value={stats.jobs_added_24h.toString()}
          hint="Roles created or refreshed in the last day. 0 means cron isn't running OR all sources are quiet."
        />
        <Stat
          label="Jobs touched (7d)"
          value={stats.jobs_added_7d.toString()}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <BroadcastPanel />
        <CronInfoPanel />
      </div>

      {/* Recent cron heartbeat — quickest way to confirm cron-job.org is
          actually pinging us, and what each tick is doing. If this list
          stops growing, cron is broken (not the broadcast). */}
      <section className="bg-surface border border-line rounded-xl p-4 mb-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <h2 className="text-xl font-semibold text-ink">Recent cron ticks</h2>
          <span className="text-xs text-muted">
            Last {recentRuns.length} runs · newest first
          </span>
        </div>
        {recentRuns.length === 0 ? (
          <div className="text-sm text-muted">
            No runs yet. Once cron-job.org pings the URL above, ticks will show up here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left py-1.5 pr-3 font-medium">When</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Mode</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Source</th>
                  <th className="text-right py-1.5 pr-3 font-medium">Created</th>
                  <th className="text-right py-1.5 pr-3 font-medium">Updated</th>
                  <th className="text-right py-1.5 pr-3 font-medium">Broadcast</th>
                  <th className="text-right py-1.5 pr-3 font-medium">Errors</th>
                  <th className="text-right py-1.5 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((r) => (
                  <tr key={r.id} className="border-t border-line/60">
                    <td className="py-1.5 pr-3 text-muted text-xs">{fmtRel(r.ran_at)}</td>
                    <td className="py-1.5 pr-3 text-xs">{r.mode}</td>
                    <td className="py-1.5 pr-3 text-xs truncate max-w-[160px]" title={r.source_id ?? ""}>
                      {r.source_id ?? "-"}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-xs font-medium text-ink">
                      {r.created || ""}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-xs text-muted">{r.updated || ""}</td>
                    <td className="py-1.5 pr-3 text-right text-xs text-emerald-700">
                      {r.broadcast_sent || ""}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-xs">
                      {r.errors > 0 ? (
                        <span className="text-rose-700 font-medium" title={r.error_text ?? ""}>
                          {r.errors}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="py-1.5 text-right text-xs text-muted">
                      {(r.duration_ms / 1000).toFixed(1)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdminSourcesClient initial={sources} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-4" title={hint}>
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div className="text-2xl font-bold text-ink mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted mt-1 leading-snug">{hint}</div>}
    </div>
  );
}
