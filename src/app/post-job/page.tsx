// /post-job — the ONLY page a "company" account ever sees inside the app.
// Candidate accounts get a friendly nudge to either switch to a hiring
// account or stay on /feed. Anonymous visitors are sent to sign in.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";
import type { Job } from "@/lib/types";
import { PostJobClient } from "./PostJobClient";
import { TelegramCTA } from "@/components/TelegramCTA";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post a job · ProWo",
  description: "Submit a role. Reviewed by a human, then matched to candidates.",
};

interface PendingRow {
  id: string;
  title: string;
  employer: string;
  status: NonNullable<Job["status"]>;
  submitted_at: string | null;
}

async function listMySubmissions(userId: string): Promise<PendingRow[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, title_raw AS title, employer, status, submitted_at
    FROM jobs
    WHERE submitted_by_user_id = ${userId}
    ORDER BY submitted_at DESC NULLS LAST
    LIMIT 50
  `) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    employer: r.employer as string,
    status: ((r.status as string) ?? "pending") as PendingRow["status"],
    submitted_at: r.submitted_at ? new Date(r.submitted_at as string).toISOString() : null,
  }));
}

export default async function PostJobPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?as=company&next=/post-job");
  }

  // Candidate-typed accounts can post too, but we surface a banner inviting
  // them to convert their account so the rest of /feed gets out of the way.
  const isCompany = user.account_type === "company";

  const mine = await listMySubmissions(user.id);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">
          Post a job
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
          Submit a role for review.
        </h1>
        <p className="text-muted mt-2 text-sm max-w-2xl">
          Your submission lands in our moderation queue. Once approved (usually within 24h), the role
          goes live in the public catalogue and is matched against candidate profiles. We&rsquo;ll email
          you when status changes.
        </p>
      </div>

      {!isCompany && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-3">
          <span className="text-base mt-0.5" aria-hidden>ℹ︎</span>
          <div>
            You&rsquo;re signed in as a candidate account. You can still submit roles, but if you&rsquo;re
            here for hiring you may prefer a dedicated company account. Sign out and use
            {" "}
            <Link href="/signin?as=company&next=/post-job" className="underline font-semibold">
              the &ldquo;I&rsquo;m hiring&rdquo; flow
            </Link>{" "}
            with your work email.
          </div>
        </div>
      )}

      <PostJobClient submitterEmail={user.email} />

      {/* Once a role is approved, every candidate in the broadcast channel
          sees it instantly — surface the channel here so submitters know
          where their listing will land. */}
      <div className="mt-8">
        <TelegramCTA
          variant="banner"
          label="Approved roles broadcast in real time."
        />
      </div>

      {mine.length > 0 && (
        <div className="mt-12">
          <div className="text-sm font-semibold text-ink mb-3">Your submissions</div>
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Employer</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-2.5 text-ink">{row.title}</td>
                    <td className="px-4 py-2.5 text-muted">{row.employer}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">
                      {row.submitted_at
                        ? new Date(row.submitted_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: NonNullable<Job["status"]> }) {
  const styles: Record<NonNullable<Job["status"]>, string> = {
    approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    rejected: "bg-rose-100 text-rose-800 border-rose-300",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
