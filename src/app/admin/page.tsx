import { listJobs, listCandidates } from "@/lib/db";
import { JobCard } from "@/components/JobCard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const jobs = listJobs({ openOnly: false });
  const candidates = listCandidates();

  const byDomain: Record<string, number> = {};
  for (const j of jobs) byDomain[j.domain] = (byDomain[j.domain] || 0) + 1;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Admin</h1>
        <p className="text-neutral-600 mt-1">Raw data browser for the demo dataset.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Stat label="Jobs" value={jobs.length.toString()} />
        <Stat label="Candidates" value={candidates.length.toString()} />
        <Stat label="Distinct domains" value={Object.keys(byDomain).length.toString()} />
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-ink mb-3">Candidates</h2>
        <div className="grid gap-3">
          {candidates.map((c) => (
            <div key={c.id} className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-ink">
                    {c.display_name}{" "}
                    <span className="text-xs uppercase tracking-wider text-neutral-500 ml-1">
                      {c.identity_mode}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-600">{c.headline}</div>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  <div>{c.seniority_band.toUpperCase()}</div>
                  <div>${(c.comp_floor_usd / 1000).toFixed(0)}k floor</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                Domains: {c.domains_of_interest.join(", ")}
              </div>
              {c.dealbreakers.length > 0 && (
                <div className="mt-1 text-xs text-amber-800">
                  Dealbreakers: {c.dealbreakers.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-3">All jobs ({jobs.length})</h2>
        <div className="grid gap-3">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="text-3xl font-bold text-ink mt-1">{value}</div>
    </div>
  );
}
