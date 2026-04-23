import { listJobs } from "@/lib/db";
import { AdminJobsClient } from "./AdminJobsClient";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const jobs = await listJobs({ openOnly: false });
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Jobs</h1>
        <p className="text-neutral-600 mt-1 text-sm">
          Every role in the database. Filter, delete, or manually add a job.
        </p>
      </div>
      <AdminJobsClient initial={jobs} />
    </div>
  );
}
