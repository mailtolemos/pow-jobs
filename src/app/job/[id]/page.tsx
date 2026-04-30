// Per-job canonical page. Two jobs to do here:
//   1. Render a clean, share-friendly job detail page (Google + Telegram +
//      Twitter all preview these).
//   2. Emit JobPosting JSON-LD so Google Jobs can pick the role up.
//
// We deliberately keep this page server-rendered + dynamic so /sitemap.xml
// links resolve immediately for newly approved roles without a build step.

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getJob } from "@/lib/db";
import { getAppUrl } from "@/lib/mailer";
import { htmlToSnippet, htmlToText } from "@/lib/html-strip";
import { employerBoardUrl } from "@/lib/employer-url";
import { SiteFooter } from "@/components/SiteFooter";
import { TelegramCTA } from "@/components/TelegramCTA";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const job = await getJob(params.id);
  if (!job || (job.status && job.status !== "approved") || !job.is_open) {
    return { title: "Job not found · ProWo" };
  }
  const title = `${job.title_raw} at ${job.employer} · ProWo`;
  const desc = htmlToSnippet(job.description, 160) || `${job.title_raw} role at ${job.employer}.`;
  const url = `${getAppUrl()}/job/${encodeURIComponent(job.id)}`;
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: "ProWo",
      type: "article",
      images: [{ url: `${getAppUrl()}/logo-mark.svg`, width: 480, height: 600, alt: "ProWo" }],
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
      site: "@ProWoJobs",
    },
  };
}

function fmtComp(job: Job): string | null {
  if (job.base_min == null && job.base_max == null) return null;
  const k = (v: number | null) => (v == null ? "?" : `$${Math.round(v / 1000)}k`);
  if (job.base_min != null && job.base_max != null && job.base_min !== job.base_max) {
    return `${k(job.base_min)}–${k(job.base_max)}`;
  }
  return k(job.base_max ?? job.base_min);
}

// Map ProWo's remote_policy onto schema.org JobPosting fields.
function jobLocationType(job: Job): string | undefined {
  if (job.remote_policy === "remote-global" || job.remote_policy === "remote-regional") {
    return "TELECOMMUTE";
  }
  return undefined;
}

function buildJsonLd(job: Job, canonical: string): Record<string, unknown> {
  const description = htmlToText(job.description) || job.title_raw;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title_raw,
    description,
    identifier: { "@type": "PropertyValue", name: job.employer, value: job.id },
    datePosted: job.date_posted,
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.employer,
      sameAs: employerBoardUrl(job) ?? undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location },
    },
    url: canonical,
    directApply: true,
  };
  const remoteType = jobLocationType(job);
  if (remoteType) ld.jobLocationType = remoteType;
  if (job.base_min != null || job.base_max != null) {
    ld.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.base_min ?? job.base_max,
        maxValue: job.base_max ?? job.base_min,
        unitText: "YEAR",
      },
    };
  }
  if (job.benefits) ld.jobBenefits = job.benefits;
  return ld;
}

export default async function JobDetailPage({ params }: Params) {
  const job = await getJob(params.id);
  if (!job) notFound();
  // Only public, approved, open roles get a canonical detail page.
  if (job.status && job.status !== "approved") notFound();
  if (!job.is_open) notFound();

  const canonical = `${getAppUrl()}/job/${encodeURIComponent(job.id)}`;
  const comp = fmtComp(job);
  const board = employerBoardUrl(job);
  const cleanDescription = htmlToText(job.description);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
      {/* JobPosting JSON-LD for Google Jobs / rich results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(job, canonical)) }}
      />

      <nav className="text-xs text-muted mb-4">
        <Link href="/jobs" className="hover:text-ink underline">
          Browse jobs
        </Link>
        <span className="mx-2">/</span>
        <span>{job.employer}</span>
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">{job.title_raw}</h1>
      <div className="text-muted mt-2 text-sm">
        {board ? (
          <a
            href={board}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink hover:text-accent hover:underline"
          >
            {job.employer}
          </a>
        ) : (
          <span className="font-semibold text-ink">{job.employer}</span>
        )}
        <span className="mx-2 text-line">·</span>
        <span>{job.location}</span>
        <span className="mx-2 text-line">·</span>
        <span className="capitalize">{job.remote_policy.replace(/-/g, " ")}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        <Tag>{job.domain}</Tag>
        <Tag>{job.function}</Tag>
        <Tag>{job.seniority.toUpperCase()}</Tag>
        {job.department && <Tag muted>{job.department}</Tag>}
        {job.regulated && <Tag tone="warn">regulated</Tag>}
        {job.tech_stack.slice(0, 8).map((t) => (
          <Tag key={t} muted>
            {t}
          </Tag>
        ))}
      </div>

      <div className="mt-6 bg-surface border border-line rounded-xl p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Compensation</div>
          <div className="text-ink font-semibold">
            {comp ? `${comp} base / year (USD)` : "Not disclosed"}
          </div>
          {(job.token_pct_target || job.carry_or_equity_pct) && (
            <div className="text-xs text-muted mt-1">
              {job.token_pct_target ? `${job.token_pct_target}% tokens` : null}
              {job.token_pct_target && job.carry_or_equity_pct ? " · " : ""}
              {job.carry_or_equity_pct ? `${job.carry_or_equity_pct}% equity` : null}
            </div>
          )}
        </div>
        {job.benefits && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Benefits</div>
            <div className="text-ink/90 text-sm">{job.benefits}</div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={job.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-accent text-white font-semibold rounded-lg hover:bg-accent2 transition shadow-soft"
        >
          Apply on {new URL(job.source_url).hostname.replace(/^www\./, "")}
        </a>
        <TelegramCTA variant="button" label="Get more like this" />
      </div>

      <div className="prose prose-sm max-w-none mt-8 text-ink/90 whitespace-pre-line leading-relaxed">
        {cleanDescription || job.title_raw}
      </div>

      <SiteFooter contactSubject={`ProWo · job ${job.id}`} />
    </div>
  );
}

function Tag({
  children,
  muted = false,
  tone,
}: {
  children: React.ReactNode;
  muted?: boolean;
  tone?: "warn";
}) {
  const cls =
    tone === "warn"
      ? "bg-amber-100 text-amber-900"
      : muted
        ? "bg-paper border border-line text-muted"
        : "bg-line/60 text-ink/90";
  return (
    <span className={`text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>
      {children}
    </span>
  );
}
