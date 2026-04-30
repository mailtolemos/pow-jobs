// Robots.txt — Next.js App Router auto-serves this from /robots.txt.
// We allow indexing of every public page and explicitly block the user
// area, admin, and API endpoints (which would otherwise leak via search).

import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/mailer";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/jobs", "/job/", "/onboarding", "/post-job", "/signin"],
        disallow: ["/admin", "/api", "/profile", "/feed", "/email-preview"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
