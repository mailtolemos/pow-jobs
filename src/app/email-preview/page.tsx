import { getCandidate, getJob, listCandidates } from "@/lib/db";
import { computeAllMatches, applyPrecisionFloor, precisionFloorFor } from "@/lib/matching";
import { renderDigestHTML } from "@/lib/email";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { c?: string; silence?: string };
}

export default async function EmailPreviewPage({ searchParams }: Props) {
  const candidates = await listCandidates({ demoOnly: true });
  const activeId = searchParams.c || candidates[0]?.id;
  const silence = searchParams.silence === "1";

  if (!activeId) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-neutral-600">No candidates in the database — run <code>npm run seed</code>.</div>
      </div>
    );
  }

  const candidate = await getCandidate(activeId);
  if (!candidate) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-neutral-600">Candidate not found.</div>
      </div>
    );
  }
  const threshold = precisionFloorFor(candidate);

  // Use structured-only scoring here so the email preview is deterministic and doesn't hit the API.
  const all = await computeAllMatches(activeId, { useLLM: false });
  const kept = silence ? [] : applyPrecisionFloor(all, candidate);
  const items = (
    await Promise.all(
      kept.slice(0, 5).map(async (m) => {
        const job = await getJob(m.job_id);
        return job ? { match: m, job } : null;
      }),
    )
  ).filter((x): x is { match: (typeof kept)[number]; job: NonNullable<Awaited<ReturnType<typeof getJob>>> } => x !== null);

  const html = renderDigestHTML({
    candidate,
    items,
    weekOf: new Date().toISOString(),
    thresholdUsed: threshold,
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Weekly digest preview</h1>
        <p className="text-neutral-600 mt-1">Rendered HTML of what the candidate actually receives.</p>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {candidates.map((c) => (
          <Link
            key={c.id}
            href={`/email-preview?c=${c.id}${silence ? "&silence=1" : ""}`}
            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
              c.id === activeId
                ? "bg-accent text-white border-accent"
                : "bg-white text-ink border-neutral-300 hover:border-neutral-400"
            }`}
          >
            {c.display_name}
          </Link>
        ))}
        <Link
          href={`/email-preview?c=${activeId}${silence ? "" : "&silence=1"}`}
          className={`ml-auto px-3 py-2 rounded-lg text-sm font-medium border ${
            silence ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-white border-neutral-300"
          }`}
        >
          {silence ? "Showing silence week" : "Show silence week"}
        </Link>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 flex items-center gap-4">
          <span>
            <strong className="text-ink">From:</strong> digest@powjobs.xyz
          </span>
          <span>
            <strong className="text-ink">To:</strong> {candidate.display_name.toLowerCase().replace(/\s+/g, ".")}@example.com
          </span>
          <span className="ml-auto">sent weekly</span>
        </div>
        <iframe
          srcDoc={html}
          title="Digest preview"
          className="w-full"
          style={{ minHeight: 800, border: 0 }}
        />
      </div>
    </div>
  );
}
