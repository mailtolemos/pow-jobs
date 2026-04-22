import type { Job, MatchScore } from "@/lib/types";

interface Props {
  job: Job;
  match?: MatchScore;
  onSave?: () => void;
  onDismiss?: () => void;
}

function fmtK(n: number | null): string {
  if (n == null) return "—";
  return `$${(n / 1000).toFixed(0)}k`;
}

function compLine(job: Job): string {
  const parts: string[] = [];
  if (job.base_min && job.base_max) parts.push(`${fmtK(job.base_min)}–${fmtK(job.base_max)} base`);
  else if (job.base_min) parts.push(`${fmtK(job.base_min)}+ base`);
  else if (job.base_max) parts.push(`up to ${fmtK(job.base_max)} base`);
  if (job.bonus_pct_target) parts.push(`${job.bonus_pct_target}% bonus`);
  if (job.token_pct_target) parts.push(`${job.token_pct_target}% tokens`);
  if (job.carry_or_equity_pct) parts.push(`${job.carry_or_equity_pct}% equity`);
  return parts.join(" · ");
}

export function JobCard({ job, match, onSave, onDismiss }: Props) {
  return (
    <article className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink text-lg truncate">{job.title_raw}</h3>
          <div className="text-sm text-neutral-600 mt-0.5">
            <span className="font-medium">{job.employer}</span>
            <span className="text-neutral-400"> · </span>
            <span>{job.location}</span>
            <span className="text-neutral-400"> · </span>
            <span className="capitalize">{job.remote_policy.replace(/-/g, " ")}</span>
          </div>
        </div>
        {match && (
          <div className="shrink-0 text-right">
            <div className="text-sm font-bold text-accent bg-accent/10 rounded-full px-3 py-1">
              {Math.round(match.score * 100)}% match
            </div>
            {match.llm_score != null && (
              <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">LLM-judged</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 text-sm text-ink">{compLine(job)}</div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip label={job.domain} tone="accent" />
        <Chip label={job.function} />
        <Chip label={job.seniority.toUpperCase()} />
        {job.regulated && <Chip label="regulated" tone="warn" />}
        {job.employer_verified && <Chip label="verified" tone="good" />}
      </div>

      <p className="mt-3 text-sm text-neutral-600 line-clamp-2">{job.description}</p>

      {match && (
        <div className="mt-3 text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
          <span className="font-semibold text-ink">Why: </span>
          {match.rationale}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <a
          href={job.source_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent2"
        >
          View role
        </a>
        {onSave && (
          <button
            onClick={onSave}
            className="text-sm font-semibold px-3 py-1.5 rounded-md border border-neutral-300 text-ink hover:border-neutral-400"
          >
            Save
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-sm font-semibold px-3 py-1.5 rounded-md text-neutral-500 hover:text-ink"
          >
            Dismiss
          </button>
        )}
      </div>
    </article>
  );
}

function Chip({ label, tone }: { label: string; tone?: "accent" | "warn" | "good" }) {
  const bg =
    tone === "accent"
      ? "bg-accent/10 text-accent"
      : tone === "warn"
        ? "bg-amber-100 text-amber-900"
        : tone === "good"
          ? "bg-emerald-100 text-emerald-900"
          : "bg-neutral-100 text-neutral-700";
  return <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${bg}`}>{label}</span>;
}
