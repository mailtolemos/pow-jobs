import { listJobs } from "@/lib/db";
import { JobsBrowseClient } from "./JobsBrowseClient";
import { TelegramCTA } from "@/components/TelegramCTA";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse jobs · ProWo",
  description:
    "Every open role in tech, AI, crypto, fintech, banking, trading, and global finance on ProWo.",
};

export default async function JobsBrowsePage() {
  const jobs = await listJobs({ openOnly: true });
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">
            Browse jobs
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
            Every open role in tech, crypto &amp; finance.
          </h1>
          <p className="text-muted mt-2 text-sm max-w-2xl">
            The full public catalogue: curated, filterable, updated daily. Sign in to get
            personalized matches scored against your profile.
          </p>
        </div>
        <TelegramCTA variant="button" className="shrink-0" />
      </div>
      <JobsBrowseClient initial={jobs} />
    </div>
  );
}
