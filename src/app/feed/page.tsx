"use client";

import { useEffect, useState } from "react";
import type { Candidate, Job, MatchScore } from "@/lib/types";
import { JobCard } from "@/components/JobCard";

interface MatchResponse {
  threshold: number;
  llmAvailable: boolean;
  totalScored: number;
  totalKept: number;
  totalHardFiltered: number;
  matches: Array<{ match: MatchScore; job: Job }>;
}

export default function FeedPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [useLLM, setUseLLM] = useState(true);
  const [applyFloor, setApplyFloor] = useState(true);

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((j) => {
        setCandidates(j.candidates);
        if (j.candidates[0]) setActiveId(j.candidates[0].id);
      });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    setData(null);
    fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId: activeId, useLLM, applyFloor }),
    })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [activeId, useLLM, applyFloor]);

  const active = candidates.find((c) => c.id === activeId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Your feed</h1>
        <p className="text-neutral-600 mt-1">
          Live matching. Switch between demo personas to see how the engine adapts.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                c.id === activeId
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-ink border-neutral-300 hover:border-neutral-400"
              }`}
            >
              {c.display_name}
              <span className="ml-1.5 text-[10px] uppercase tracking-wider opacity-75">
                {c.identity_mode}
              </span>
            </button>
          ))}
        </div>
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

      {active && (
        <div className="mb-6 bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-sm text-neutral-600">{active.headline}</div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Info label="Seniority" value={active.seniority_band.toUpperCase()} />
            <Info label="Comp floor" value={`$${(active.comp_floor_usd / 1000).toFixed(0)}k`} />
            <Info label="Jurisdictions" value={active.jurisdiction_ok.join(", ")} />
            <Info
              label="Token weight"
              value={`${Math.round(active.weight_token_upside * 100)}%`}
            />
          </div>
        </div>
      )}

      {loading && <div className="text-neutral-500">Scoring {/* intentionally vague */}all open roles…</div>}

      {data && (
        <>
          <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
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

          {data.matches.length === 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
              <div className="text-lg font-semibold text-ink mb-2">Silence is the answer.</div>
              <div className="text-neutral-600 text-sm max-w-md mx-auto">
                Nothing crossed your precision floor this round. Turn off the floor above to see the full ranked list,
                or adjust preferences.
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {data.matches.map(({ match, job }) => (
              <JobCard key={job.id} job={job} match={match} />
            ))}
          </div>
        </>
      )}
    </div>
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
