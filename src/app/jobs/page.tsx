import { listJobs } from "@/lib/db";
import { JobsBrowseClient } from "./JobsBrowseClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse jobs — Pablo Jobs",
  description: "Every open role in crypto, fintech, and global finance on Pablo Jobs.",
};

export default async function JobsBrowsePage() {
  const jobs = await listJobs({ openOnly: true });
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">
          Browse jobs
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
          Every open role in crypto &amp; finance.
        </h1>
        <p className="text-muted mt-2 text-sm max-w-2xl">
          The full public catalogue — curated, filterable, updated daily.
          Sign in to get personalized matches scored against your profile.
        </p>
      </div>
      <JobsBrowseClient initial={jobs} />
    </div>
  );
}
