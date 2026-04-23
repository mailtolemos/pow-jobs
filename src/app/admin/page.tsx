import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listSources, listJobs, listCandidates } from "@/lib/db";
import { AdminSourcesClient } from "./AdminSourcesClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/admin");
  if (!user.is_admin) redirect("/");

  const [sources, jobs, candidates] = await Promise.all([
    listSources(),
    listJobs({ openOnly: false }),
    listCandidates(),
  ]);

  const byDomain: Record<string, number> = {};
  for (const j of jobs) byDomain[j.domain] = (byDomain[j.domain] || 0) + 1;
  const activeSources = sources.filter((s) => s.active).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-accent font-semibold">Admin</div>
        <h1 className="text-3xl font-bold text-ink mt-1">Sources & job boards</h1>
        <p className="text-neutral-600 mt-1 text-sm">
          Signed in as <span className="font-medium">{user.email}</span>. Manage the catalogue of
          upstream job sources that feed the ingest pipeline.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat label="Active sources" value={`${activeSources} / ${sources.length}`} />
        <Stat label="Jobs in DB" value={jobs.length.toString()} />
        <Stat label="Candidates" value={candidates.length.toString()} />
        <Stat label="Distinct domains" value={Object.keys(byDomain).length.toString()} />
      </div>

      <AdminSourcesClient initial={sources} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="text-2xl font-bold text-ink mt-1">{value}</div>
    </div>
  );
}
