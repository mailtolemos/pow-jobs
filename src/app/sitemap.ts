// Dynamic sitemap — every approved, open job gets its own URL plus the
// handful of static pages we want Google to index. Next.js auto-serves
// this at /sitemap.xml and revalidates at request time (the route is
// dynamic because the underlying job count changes).

import type { MetadataRoute } from "next";
import { listJobs } from "@/lib/db";
import { getAppUrl } from "@/lib/mailer";

export const revalidate = 600; // 10 minutes

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/jobs`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${base}/post-job`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/onboarding`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/signin`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Best-effort: don't fail the sitemap if the DB is briefly unavailable —
  // returning the static set still gives Google something to crawl.
  let jobEntries: MetadataRoute.Sitemap = [];
  try {
    const jobs = await listJobs({ openOnly: true });
    jobEntries = jobs.map((j) => ({
      url: `${base}/job/${encodeURIComponent(j.id)}`,
      lastModified: j.date_last_seen ? new Date(j.date_last_seen) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // Swallow; static entries are enough as a fallback.
  }

  return [...staticEntries, ...jobEntries];
}
