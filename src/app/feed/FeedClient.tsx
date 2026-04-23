"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Candidate, Job, MatchScore } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import {
  FeedFilters,
  DEFAULT_FILTERS,
  applyFilters,
  type FeedFilterState,
} from "./FeedFilters";

interface MatchResponse {
  threshold: number;
  llmAvailable: boolean;
  totalScored: number;
  totalKept: number;
  totalHardFiltered: number;
  matches: Array<{ match: MatchScore; job: Job }>;
}

type Mode = "me" | "demo";

interface Props {
  signedInAs: string | null;
  myCandidate: Candidate | null;
  profileIncomplete: boolean;
  demoPersonas: Candidate[];
}

export function FeedClient({ signedInAs, myCandidate, profileIncomplete, demoPersonas }: Props) {
  // Signed-in users always view their own feed. Signed-out visitors default to
  // the first demo persona.
  const defaultMode: Mode = signedInAs ? "me" : "demo";
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [activeDemoId, setActiveDemoId] = useState<string>(demoPersonas[0]?.id ?? "");
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [useLLM, setUseLLM] = useState(true);
  const [applyFloor, setApplyFloor] = useState(true);
  const [filters, setFilters] = useState<FeedFilterState>(() => ({
    ...DEFAULT_FILTERS,
    domains: new Set<string>(),
    remotePolicies: new Set<string>(),
    jurisdictions: new Set<string>(),
  }));

  const viewingCandidate: Candidate | null =
    mode === "me"
      ? myCandidate
      : demoPersonas.find((c) => c.id === activeDemoId) ?? demoPersonas[0] ?? null;

  useEffect(() => {
    if (!viewingCandidate) return;
    setLoading(true);
    setData(null);
    fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId: viewingCandidate.id, useLLM, applyFloor }),
    })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
    // viewingCandidate identity encoded in mode+activeDemoId
  }, [mode, activeDemoId, useLLM, applyFloor, viewingCandidate]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Your feed</h1>
        <p className="text-neutral-600 mt-1 text-sm">
          {mode === "me"
            ? "Live matching against the profile you saved. Tune it anytime from your profile page."
            : "Live matching against a demo persona — sign in to see matches for your real profile."}
        </p>
      </div>

      {signedInAs && profileIncomplete && mode === "me" && (
        <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 flex items-center justify-between">
          <span>
            Your profile is still mostly empty — pick at least a domain, function, and headline so the engine
            can score meaningfully.
          </span>
          <Link href="/profile" className="ml-4 font-semibold underline whitespace-nowrap">
            Finish profile →
          </Link>
        </div>
      )}

      {!signedInAs && (
        <div className="mb-5 rounded-xl bg-white border border-neutral-200 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <span className="text-neutral-700">
            You&rsquo;re browsing as a demo persona. Sign in to build your own profile and get personalized alerts.
          </span>
          <Link
            href="/signin?next=/feed"
            className="rounded-lg bg-accent text-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        {/* Persona switcher only appears when not signed in. Signed-in users
            see their own feed exclusively. */}
        {!signedInAs && demoPersonas.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {demoPersonas.map((c) => {
              const selected = mode === "demo" && c.id === activeDemoId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setMode("demo");
                    setActiveDemoId(c.id);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                    selected
                      ? "bg-accent text-white border-accent"
                      : "bg-white text-ink border-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  {c.display_name}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider opacity-75">
                    {c.identity_mode}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="md:ml-auto flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5 text-neutral-600">
            <input type="checkbox" checked={useLLM} onChange={(e) => setUseLLM(e.target.checked)} />
            LLM judge
          </label>
          <label className="flex items-center gap-1.5 text-neutral-600">
            <input
              type="checkbox"
              checked={applyFloor}
              onChange={(e) => setApplyFloor(e.target.checked)}
            />
            Precision floor
          </label>
        </div>
      </div>

      {viewingCandidate && (
        <div className="mb-6 bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-sm text-neutral-600">
            {viewingCandidate.headline || (mode === "me" ? "(No headline yet)" : "")}
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Info label="Seniority" value={viewingCandidate.seniority_band.toUpperCase()} />
            <Info
              label="Comp floor"
              value={viewingCandidate.comp_floor_usd > 0 ? `$${(viewingCandidate.comp_floor_usd / 1000).toFixed(0)}k` : "not set"}
            />
            <Info label="Jurisdictions" value={viewingCandidate.jurisdiction_ok.join(", ") || "—"} />
            <Info
              label="Token weight"
              value={`${Math.round(viewingCandidate.weight_token_upside * 100)}%`}
            />
          </div>
        </div>
      )}

      {loading && <div className="text-neutral-500">Scoring all open roles…</div>}

      {data && (
        <>
          <FeedDataSummary data={data} />
          <FeedFiltersWrapper data={data} filters={filters} setFilters={setFilters} mode={mode} />
        </>
      )}
    </div>
  );
}

function FeedDataSummary({ data }: { data: MatchResponse }) {
  return (
    <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4 flex-wrap">
      <span>
        <strong className="text-ink">{data.totalKept}</strong> shown / {data.totalScored} scored
      </span>
      <span>·</span>
      <span>{data.totalHardFiltered} hard-filtered</span>
      <span>·</span>
      <span>Precision floor: {Math.round(data.threshold * 100)}%</span>
      <span>·</span>
      <span>LLM: {data.llmAvailable ? "Claude" : "heuristic fallback"}</span>
    </div>
  );
}

function FeedFiltersWrapper({
  data,
  filters,
  setFilters,
  mode,
}: {
  data: MatchResponse;
  filters: FeedFilterState;
  setFilters: (f: FeedFilterState) => void;
  mode: Mode;
}) {
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    for (const { job } of data.matches) set.add(job.domain);
    return [...set].sort();
  }, [data]);

  const visibleMatches = useMemo(
    () => data.matches.filter(({ job }) => applyFilters(job, filters)),
    [data, filters],
  );

  return (
    <>
      <FeedFilters
        filters={filters}
        setFilters={setFilters}
        availableDomains={availableDomains}
        matchingCount={visibleMatches.length}
        totalCount={data.matches.length}
      />

      {data.matches.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
          <div className="text-lg font-semibold text-ink mb-2">Silence is the answer.</div>
          <div className="text-neutral-600 text-sm max-w-md mx-auto">
            Nothing crossed your precision floor this round. Turn off the floor above to see the full ranked list,
            or adjust preferences on your profile.
          </div>
          {mode === "me" && (
            <Link
              href="/profile"
              className="inline-block mt-4 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-ink hover:border-neutral-400"
            >
              Tune profile
            </Link>
          )}
        </div>
      )}

      {data.matches.length > 0 && visibleMatches.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-sm text-neutral-600">
          No matches pass your filters. Try loosening them.
        </div>
      )}

      <div className="grid gap-4">
        {visibleMatches.map(({ match, job }) => (
          <JobCard key={job.id} job={job} match={match} />
        ))}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="text-ink font-medium mt-0.5">{value}</div>
    </div>
  );
}
