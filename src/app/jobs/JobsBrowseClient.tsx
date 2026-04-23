"use client";

import { useMemo, useState } from "react";
import type { Job } from "@/lib/types";

interface Props {
  initial: Job[];
}

const IC_BANDS = ["ic1", "ic2", "ic3", "ic4", "ic5", "ic6", "ic7"];
const REMOTE_OPTIONS = ["remote-global", "remote-regional", "hybrid", "onsite"];
const JURISDICTION_OPTIONS = ["us", "eu", "uk", "apac", "latam", "global"];

export function JobsBrowseClient({ initial }: Props) {
  const jobs = initial;

  // Filter state
  const [q, setQ] = useState("");
  const [employer, setEmployer] = useState("");
  const [departments, setDepartments] = useState<Set<string>>(new Set());
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [functions, setFunctions] = useState<Set<string>>(new Set());
  const [remotePolicies, setRemotePolicies] = useState<Set<string>>(new Set());
  const [jurisdictions, setJurisdictions] = useState<Set<string>>(new Set());
  const [minSeniority, setMinSeniority] = useState(0);
  const [maxSeniority, setMaxSeniority] = useState(6);
  const [includeMgmt, setIncludeMgmt] = useState(true);
  const [compFloor, setCompFloor] = useState(0);

  // Derive facet values from the current dataset
  const facets = useMemo(() => {
    const d = new Map<string, number>();
    const dep = new Map<string, number>();
    const fn = new Map<string, number>();
    const emp = new Map<string, number>();
    for (const j of jobs) {
      d.set(j.domain, (d.get(j.domain) ?? 0) + 1);
      if (j.department) dep.set(j.department, (dep.get(j.department) ?? 0) + 1);
      fn.set(j.function, (fn.get(j.function) ?? 0) + 1);
      emp.set(j.employer, (emp.get(j.employer) ?? 0) + 1);
    }
    return {
      domains: [...d.entries()].sort((a, b) => b[1] - a[1]),
      departments: [...dep.entries()].sort((a, b) => b[1] - a[1]),
      functions: [...fn.entries()].sort((a, b) => b[1] - a[1]),
      employers: [...emp.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [jobs]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (qLower) {
        const hay = `${j.title_raw} ${j.employer} ${j.description} ${j.location}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      if (employer && j.employer !== employer) return false;
      if (departments.size > 0 && (!j.department || !departments.has(j.department))) return false;
      if (domains.size > 0 && !domains.has(j.domain)) return false;
      if (functions.size > 0 && !functions.has(j.function)) return false;
      if (remotePolicies.size > 0 && !remotePolicies.has(j.remote_policy)) return false;
      if (jurisdictions.size > 0 && !jurisdictions.has(j.jurisdiction_required)) return false;
      if (j.seniority.startsWith("ic")) {
        const idx = IC_BANDS.indexOf(j.seniority);
        if (idx < minSeniority || idx > maxSeniority) return false;
      } else if (j.seniority.startsWith("m") && !includeMgmt) {
        return false;
      }
      if (compFloor > 0) {
        const jobCap = Math.max(j.base_min ?? 0, j.base_max ?? 0);
        if (jobCap > 0 && jobCap < compFloor * 1000) return false;
      }
      return true;
    });
  }, [
    jobs, q, employer, departments, domains, functions, remotePolicies,
    jurisdictions, minSeniority, maxSeniority, includeMgmt, compFloor,
  ]);

  function toggle<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }
  function resetAll() {
    setQ("");
    setEmployer("");
    setDepartments(new Set());
    setDomains(new Set());
    setFunctions(new Set());
    setRemotePolicies(new Set());
    setJurisdictions(new Set());
    setMinSeniority(0);
    setMaxSeniority(6);
    setIncludeMgmt(true);
    setCompFloor(0);
  }

  const activeCount =
    (q ? 1 : 0) +
    (employer ? 1 : 0) +
    departments.size +
    domains.size +
    functions.size +
    remotePolicies.size +
    jurisdictions.size +
    (compFloor > 0 ? 1 : 0) +
    (minSeniority > 0 || maxSeniority < 6 ? 1 : 0) +
    (!includeMgmt ? 1 : 0);

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-6">
      {/* -------- Filter sidebar -------- */}
      <aside className="bg-surface border border-line rounded-xl p-4 h-fit md:sticky md:top-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            Filters
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-accent text-white text-[10px] px-1.5 py-0.5 min-w-[18px]">
                {activeCount}
              </span>
            )}
          </h2>
          {activeCount > 0 && (
            <button onClick={resetAll} className="text-xs text-muted underline hover:text-ink">
              Reset
            </button>
          )}
        </div>

        <Field label="Search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="title, employer, keywords…"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-paper"
          />
        </Field>

        <Field label="Min base (USD thousands)">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={compFloor}
              onChange={(e) => setCompFloor(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium text-ink w-14 text-right">
              {compFloor === 0 ? "any" : `$${compFloor}k`}
            </span>
          </div>
        </Field>

        {facets.departments.length > 0 && (
          <Field label={`Department (${facets.departments.length})`}>
            <ChipGroup
              items={facets.departments}
              selected={departments}
              onToggle={(v) => toggle(departments, v, setDepartments)}
            />
          </Field>
        )}

        <Field label={`Domain (${facets.domains.length})`}>
          <ChipGroup
            items={facets.domains}
            selected={domains}
            onToggle={(v) => toggle(domains, v, setDomains)}
          />
        </Field>

        <Field label={`Function (${facets.functions.length})`}>
          <ChipGroup
            items={facets.functions}
            selected={functions}
            onToggle={(v) => toggle(functions, v, setFunctions)}
          />
        </Field>

        <Field label="Remote policy">
          <ChipGroup
            items={REMOTE_OPTIONS.map((r) => [r, 0] as [string, number])}
            selected={remotePolicies}
            onToggle={(v) => toggle(remotePolicies, v, setRemotePolicies)}
            showCount={false}
          />
        </Field>

        <Field label="Jurisdiction">
          <ChipGroup
            items={JURISDICTION_OPTIONS.map((j) => [j, 0] as [string, number])}
            selected={jurisdictions}
            onToggle={(v) => toggle(jurisdictions, v, setJurisdictions)}
            showCount={false}
            uppercase
          />
        </Field>

        <Field label="Seniority (IC band)">
          <div className="flex items-center gap-2">
            <select
              value={minSeniority}
              onChange={(e) => setMinSeniority(Number(e.target.value))}
              className="border border-line rounded-lg px-2 py-1 text-sm bg-paper"
            >
              {IC_BANDS.map((b, i) => (
                <option key={b} value={i}>
                  {b.toUpperCase()}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">to</span>
            <select
              value={maxSeniority}
              onChange={(e) => setMaxSeniority(Number(e.target.value))}
              className="border border-line rounded-lg px-2 py-1 text-sm bg-paper"
            >
              {IC_BANDS.map((b, i) => (
                <option key={b} value={i}>
                  {b.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <label className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={includeMgmt}
              onChange={(e) => setIncludeMgmt(e.target.checked)}
            />
            Include management (M1-M5)
          </label>
        </Field>

        <Field label="Employer">
          <select
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-paper"
          >
            <option value="">All employers</option>
            {facets.employers.map(([e, n]) => (
              <option key={e} value={e}>
                {e} ({n})
              </option>
            ))}
          </select>
        </Field>
      </aside>

      {/* -------- Results -------- */}
      <section>
        <div className="mb-3 text-sm text-muted">
          <strong className="text-ink">{filtered.length}</strong> of {jobs.length} role
          {jobs.length === 1 ? "" : "s"} shown
        </div>
        {filtered.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-8 text-center text-sm text-muted">
            No jobs match these filters. Try loosening them.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((j) => (
              <JobRow key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-muted mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function ChipGroup({
  items,
  selected,
  onToggle,
  showCount = true,
  uppercase = false,
}: {
  items: Array<[string, number]>;
  selected: Set<string>;
  onToggle: (v: string) => void;
  showCount?: boolean;
  uppercase?: boolean;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {items.map(([value, count]) => {
        const on = selected.has(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`px-2 py-1 rounded-md text-xs font-medium border transition ${
              uppercase ? "uppercase" : ""
            } ${
              on
                ? "bg-ink text-white border-ink"
                : "bg-paper border-line text-ink/90 hover:border-accent/60"
            }`}
          >
            <span className="truncate max-w-[170px] inline-block align-middle">{value}</span>
            {showCount && count > 0 && (
              <span className="ml-1 opacity-60">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function fmtComp(job: Job): string | null {
  if (job.base_min == null && job.base_max == null) return null;
  const toK = (v: number | null) => (v == null ? "?" : `$${Math.round(v / 1000)}k`);
  if (job.base_min != null && job.base_max != null && job.base_min !== job.base_max) {
    return `${toK(job.base_min)}–${toK(job.base_max)}`;
  }
  return toK(job.base_max ?? job.base_min);
}

function JobRow({ job }: { job: Job }) {
  const comp = fmtComp(job);
  return (
    <article className="bg-surface border border-line rounded-xl p-4 hover:border-accent/60 transition">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink font-semibold hover:underline break-words"
          >
            {job.title_raw}
          </a>
          <div className="text-sm text-muted mt-0.5">
            <span className="font-medium text-ink/80">{job.employer}</span>
            {" · "}
            {job.location}
            {" · "}
            {job.remote_policy}
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            <Tag>{job.domain}</Tag>
            <Tag>{job.function}</Tag>
            <Tag>{job.seniority.toUpperCase()}</Tag>
            {job.department && <Tag muted>{job.department}</Tag>}
            {job.tech_stack.slice(0, 4).map((t) => (
              <Tag key={t} muted>
                {t}
              </Tag>
            ))}
          </div>
        </div>
        <div className="text-right text-xs text-muted shrink-0">
          {comp && <div className="text-ink font-semibold text-sm">{comp}</div>}
          <div>{new Date(job.date_posted).toLocaleDateString()}</div>
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 rounded-lg bg-accent text-white px-3 py-1 text-xs font-semibold hover:bg-accent2 transition"
          >
            Apply →
          </a>
        </div>
      </div>
    </article>
  );
}

function Tag({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
        muted ? "bg-paper border border-line text-muted" : "bg-line/60 text-ink/90"
      }`}
    >
      {children}
    </span>
  );
}
