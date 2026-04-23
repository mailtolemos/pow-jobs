"use client";

import type { Job } from "@/lib/types";

export interface FeedFilterState {
  q: string;
  domains: Set<string>;
  remotePolicies: Set<string>;
  minSeniority: number; // 0=ic1 .. 6=ic7 for ic, separate m1-m5 handled via toggle
  maxSeniority: number;
  includeMgmt: boolean;
  compFloor: number; // thousands USD
  jurisdictions: Set<string>;
}

export const DEFAULT_FILTERS: FeedFilterState = {
  q: "",
  domains: new Set(),
  remotePolicies: new Set(),
  minSeniority: 0,
  maxSeniority: 6,
  includeMgmt: true,
  compFloor: 0,
  jurisdictions: new Set(),
};

const IC_BANDS = ["ic1", "ic2", "ic3", "ic4", "ic5", "ic6", "ic7"];
const MGMT_BANDS = ["m1", "m2", "m3", "m4", "m5"];
const REMOTE_OPTIONS = ["remote-global", "remote-regional", "hybrid", "onsite"];
const JURISDICTION_OPTIONS = ["us", "eu", "uk", "apac", "latam", "global"];

export function applyFilters(
  job: Job,
  f: FeedFilterState,
): boolean {
  // Text search
  if (f.q.trim()) {
    const needle = f.q.toLowerCase();
    const hay = `${job.title_raw} ${job.employer} ${job.description} ${job.location}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  // Domain multi-select (empty = all)
  if (f.domains.size > 0 && !f.domains.has(job.domain)) return false;
  // Remote policy
  if (f.remotePolicies.size > 0 && !f.remotePolicies.has(job.remote_policy)) return false;
  // Seniority range
  if (job.seniority.startsWith("ic")) {
    const idx = IC_BANDS.indexOf(job.seniority);
    if (idx < f.minSeniority || idx > f.maxSeniority) return false;
  } else if (job.seniority.startsWith("m")) {
    if (!f.includeMgmt) return false;
  }
  // Comp floor (in thousands)
  if (f.compFloor > 0) {
    const jobMin = job.base_min ?? 0;
    const jobMax = job.base_max ?? 0;
    const jobCap = Math.max(jobMin, jobMax);
    if (jobCap > 0 && jobCap < f.compFloor * 1000) return false;
    // If comp is null, don't filter out — we don't have info
  }
  // Jurisdictions
  if (f.jurisdictions.size > 0 && !f.jurisdictions.has(job.jurisdiction_required)) return false;
  return true;
}

interface Props {
  filters: FeedFilterState;
  setFilters: (f: FeedFilterState) => void;
  availableDomains: string[];
  matchingCount: number;
  totalCount: number;
}

export function FeedFilters({ filters, setFilters, availableDomains, matchingCount, totalCount }: Props) {
  function update(patch: Partial<FeedFilterState>) {
    setFilters({ ...filters, ...patch });
  }
  function toggleSet(key: "domains" | "remotePolicies" | "jurisdictions", value: string) {
    const next = new Set(filters[key]);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update({ [key]: next } as Partial<FeedFilterState>);
  }
  function reset() {
    setFilters({
      ...DEFAULT_FILTERS,
      domains: new Set(),
      remotePolicies: new Set(),
      jurisdictions: new Set(),
    });
  }

  const activeCount =
    (filters.q ? 1 : 0) +
    filters.domains.size +
    filters.remotePolicies.size +
    filters.jurisdictions.size +
    (filters.compFloor > 0 ? 1 : 0) +
    (filters.minSeniority > 0 || filters.maxSeniority < 6 ? 1 : 0) +
    (!filters.includeMgmt ? 1 : 0);

  return (
    <details className="bg-white border border-neutral-200 rounded-xl p-4 mb-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-ink flex items-center gap-2">
        Filters
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-accent text-white text-[10px] px-1.5 py-0.5 min-w-[18px]">
            {activeCount}
          </span>
        )}
        <span className="ml-auto text-xs font-normal text-neutral-500">
          {matchingCount} of {totalCount} shown
        </span>
      </summary>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Search</Label>
          <input
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="title, employer, keywords…"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <Label>Min base (USD thousands)</Label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={filters.compFloor}
              onChange={(e) => update({ compFloor: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm font-medium text-ink w-14 text-right">
              {filters.compFloor === 0 ? "any" : `$${filters.compFloor}k`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Label>Domains</Label>
        <div className="flex gap-1.5 flex-wrap">
          {availableDomains.map((d) => {
            const on = filters.domains.has(d);
            return (
              <button
                key={d}
                onClick={() => toggleSet("domains", d)}
                className={`px-2 py-1 rounded-md text-xs font-medium border ${
                  on
                    ? "bg-ink text-white border-ink"
                    : "bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400"
                }`}
              >
                {d}
              </button>
            );
          })}
          {availableDomains.length === 0 && (
            <span className="text-xs text-neutral-500">No matches in the current feed.</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Remote policy</Label>
          <div className="flex gap-1.5 flex-wrap">
            {REMOTE_OPTIONS.map((r) => {
              const on = filters.remotePolicies.has(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleSet("remotePolicies", r)}
                  className={`px-2 py-1 rounded-md text-xs font-medium border ${
                    on
                      ? "bg-ink text-white border-ink"
                      : "bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>Jurisdiction</Label>
          <div className="flex gap-1.5 flex-wrap">
            {JURISDICTION_OPTIONS.map((j) => {
              const on = filters.jurisdictions.has(j);
              return (
                <button
                  key={j}
                  onClick={() => toggleSet("jurisdictions", j)}
                  className={`px-2 py-1 rounded-md text-xs font-medium border uppercase ${
                    on
                      ? "bg-ink text-white border-ink"
                      : "bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {j}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Label>Seniority (IC band)</Label>
        <div className="flex items-center gap-3">
          <select
            value={filters.minSeniority}
            onChange={(e) => update({ minSeniority: Number(e.target.value) })}
            className="border border-neutral-300 rounded-lg px-2 py-1 text-sm bg-white"
          >
            {IC_BANDS.map((b, i) => (
              <option key={b} value={i}>{b.toUpperCase()}</option>
            ))}
          </select>
          <span className="text-xs text-neutral-500">to</span>
          <select
            value={filters.maxSeniority}
            onChange={(e) => update({ maxSeniority: Number(e.target.value) })}
            className="border border-neutral-300 rounded-lg px-2 py-1 text-sm bg-white"
          >
            {IC_BANDS.map((b, i) => (
              <option key={b} value={i}>{b.toUpperCase()}</option>
            ))}
          </select>
          <label className="ml-4 flex items-center gap-1.5 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={filters.includeMgmt}
              onChange={(e) => update({ includeMgmt: e.target.checked })}
            />
            Include mgmt ({MGMT_BANDS.join(", ")})
          </label>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={reset}
            className="text-xs text-neutral-600 underline hover:text-ink"
          >
            Reset all filters
          </button>
        </div>
      )}
    </details>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">{children}</div>;
}
