"use client";

import { useMemo, useState } from "react";
import type { Job } from "@/lib/types";

interface Props {
  initial: Job[];
}

const STATUS_OPTIONS = ["all", "open", "closed"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

export function AdminJobsClient({ initial }: Props) {
  const [jobs, setJobs] = useState<Job[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [employerFilter, setEmployerFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [status, setStatus] = useState<Status>("all");

  // Manual add form
  const [showAdd, setShowAdd] = useState(false);

  const distinct = useMemo(() => {
    const employers = new Set<string>();
    const domains = new Set<string>();
    const sources = new Set<string>();
    for (const j of jobs) {
      employers.add(j.employer);
      domains.add(j.domain);
      sources.add(j.source_channel);
    }
    return {
      employers: [...employers].sort(),
      domains: [...domains].sort(),
      sources: [...sources].sort(),
    };
  }, [jobs]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (employerFilter && j.employer !== employerFilter) return false;
      if (domainFilter && j.domain !== domainFilter) return false;
      if (sourceFilter && j.source_channel !== sourceFilter) return false;
      if (status === "open" && !j.is_open) return false;
      if (status === "closed" && j.is_open) return false;
      if (qLower) {
        const blob = `${j.title_raw} ${j.employer} ${j.description} ${j.location}`.toLowerCase();
        if (!blob.includes(qLower)) return false;
      }
      return true;
    });
  }, [jobs, q, employerFilter, domainFilter, sourceFilter, status]);

  async function refresh() {
    const res = await fetch("/api/admin/jobs", { cache: "no-store" });
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setSelected(new Set());
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function toggleAllFiltered() {
    if (filtered.every((j) => selected.has(j.id))) {
      const next = new Set(selected);
      filtered.forEach((j) => next.delete(j.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((j) => next.add(j.id));
      setSelected(next);
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} job(s)? This cannot be undone.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteOne(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-900">
          {err}
        </div>
      )}

      <div className="bg-surface border border-line rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          placeholder="Search title / employer / description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:col-span-2 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={employerFilter}
          onChange={(e) => setEmployerFilter(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">All employers</option>
          {distinct.employers.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">All domains</option>
          {distinct.domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">All sources</option>
          {distinct.sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="md:col-span-5 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                  status === s ? "bg-ink text-white border-ink" : "bg-surface border-line"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            Showing {filtered.length} / {jobs.length}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium"
            >
              {showAdd ? "Close add form" : "Add job manually"}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={busy || selected.size === 0}
              className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Delete selected ({selected.size})
            </button>
          </div>
        </div>
      </div>

      {showAdd && <AddJobForm onCreated={refresh} />}

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-3 py-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((j) => selected.has(j.id))}
                  onChange={toggleAllFiltered}
                />
              </th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Employer</th>
              <th className="px-3 py-2 text-left">Domain</th>
              <th className="px-3 py-2 text-left">Seniority</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id} className="border-t border-line/60">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(j.id)}
                    onChange={() => toggle(j.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <a
                    href={j.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink font-medium hover:underline"
                  >
                    {j.title_raw}
                  </a>
                  <div className="text-[11px] text-muted">{j.location}</div>
                </td>
                <td className="px-3 py-2">{j.employer}</td>
                <td className="px-3 py-2">
                  <span className="text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-line/40">
                    {j.domain}
                  </span>
                </td>
                <td className="px-3 py-2 uppercase text-xs">{j.seniority}</td>
                <td className="px-3 py-2 text-xs">{j.source_channel}</td>
                <td className="px-3 py-2 text-xs">
                  {j.is_open ? (
                    <span className="text-emerald-700 font-medium">open</span>
                  ) : (
                    <span className="text-muted">closed</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleDeleteOne(j.id, j.title_raw)}
                    disabled={busy}
                    className="text-rose-700 text-xs font-medium hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted text-sm">
                  No jobs match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddJobForm({ onCreated }: { onCreated: () => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [domain, setDomain] = useState("crypto:application");
  const [seniority, setSeniority] = useState("ic4");
  const [location, setLocation] = useState("Remote");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          employer,
          source_url: sourceUrl || "https://pow-jobs.vercel.app/admin",
          domain,
          seniority,
          location,
          description,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setTitle("");
      setEmployer("");
      setSourceUrl("");
      setDescription("");
      await onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface border border-line rounded-xl p-4 grid gap-3 md:grid-cols-2">
      {err && <div className="md:col-span-2 text-rose-700 text-sm">{err}</div>}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted font-medium">Title</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted font-medium">Employer</span>
        <input required value={employer} onChange={(e) => setEmployer(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted font-medium">Source URL</span>
        <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className="border border-line rounded-lg px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted font-medium">Location</span>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted font-medium">Domain</span>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted font-medium">Seniority</span>
        <input value={seniority} onChange={(e) => setSeniority(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm" />
      </label>
      <label className="md:col-span-2 flex flex-col gap-1 text-sm">
        <span className="text-muted font-medium">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="border border-line rounded-lg px-3 py-2 text-sm font-mono" />
      </label>
      <div className="md:col-span-2 flex justify-end">
        <button type="submit" disabled={busy} className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {busy ? "Saving…" : "Add job"}
        </button>
      </div>
    </form>
  );
}
