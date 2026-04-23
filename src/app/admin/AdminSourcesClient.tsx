"use client";

import { useState } from "react";
import type { SourceRow, SourceKind } from "@/lib/db";

const KINDS: SourceKind[] = ["rss", "career-page", "api", "manual", "aggregator"];

interface Props {
  initial: SourceRow[];
}

interface FetchReport {
  source_id: string;
  fetched: number;
  created: number;
  updated: number;
  llm_classified?: number;
  llm_errors?: string[];
  errors: string[];
  duration_ms: number;
}

export function AdminSourcesClient({ initial }: Props) {
  const [sources, setSources] = useState<SourceRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<FetchReport | null>(null);

  // Add form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<SourceKind>("manual");
  const [notes, setNotes] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/sources", { cache: "no-store" });
    const data = await res.json();
    setSources(data.sources ?? []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim(), kind, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setName("");
      setUrl("");
      setKind("manual");
      setNotes("");
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePatch(id: string, patch: Partial<SourceRow>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFetch(id: string) {
    setFetchingId(id);
    setErr(null);
    setLastReport(null);
    try {
      const res = await fetch(`/api/admin/sources/${id}/fetch`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLastReport(data.result as FetchReport);
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setFetchingId(null);
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete source "${label}"? This cannot be undone.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-900">
          {err}
        </div>
      )}

      {lastReport && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
          <div className="font-semibold">
            Fetched {lastReport.fetched} roles · {lastReport.created} new · {lastReport.updated} updated · {(lastReport.duration_ms / 1000).toFixed(1)}s
          </div>
          {typeof lastReport.llm_classified === "number" && (
            <div className="text-xs mt-1">
              LLM classified {lastReport.llm_classified} / {lastReport.fetched} (others used heuristic fallback).
            </div>
          )}
          {(lastReport.llm_errors?.length ?? 0) > 0 && (
            <details className="mt-1 text-xs">
              <summary>{lastReport.llm_errors!.length} classifier error(s)</summary>
              <ul className="mt-1 list-disc pl-5 font-mono text-[11px]">
                {lastReport.llm_errors!.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          {lastReport.errors.length > 0 && (
            <details className="mt-1 text-xs">
              <summary>{lastReport.errors.length} fetch error(s)</summary>
              <ul className="mt-1 list-disc pl-5">
                {lastReport.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold text-ink mb-3">Add a source</h2>
        <form
          onSubmit={handleAdd}
          className="bg-surface border border-line rounded-xl p-5 grid gap-3 md:grid-cols-2"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted font-medium">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cryptocurrency Jobs"
              className="border border-line rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted font-medium">URL</span>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cryptocurrencyjobs.co/feed"
              className="border border-line rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted font-medium">Kind</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as SourceKind)}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted font-medium">Notes</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="border border-line rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Saving…" : "Add source"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-3">
          Catalogue ({sources.length})
        </h2>
        {sources.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-8 text-center text-sm text-muted">
            No sources yet. Add one above to start tracking a job board or RSS feed.
          </div>
        ) : (
          <div className="grid gap-3">
            {sources.map((s) => (
              <SourceRowEditor
                key={s.id}
                source={s}
                busy={busy}
                fetching={fetchingId === s.id}
                onPatch={handlePatch}
                onDelete={handleDelete}
                onFetch={handleFetch}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SourceRowEditor({
  source,
  busy,
  fetching,
  onPatch,
  onDelete,
  onFetch,
}: {
  source: SourceRow;
  busy: boolean;
  fetching: boolean;
  onPatch: (id: string, patch: Partial<SourceRow>) => Promise<void>;
  onDelete: (id: string, label: string) => Promise<void>;
  onFetch: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(source.name);
  const [url, setUrl] = useState(source.url);
  const [kind, setKind] = useState<SourceKind>(source.kind);
  const [notes, setNotes] = useState(source.notes);

  async function save() {
    await onPatch(source.id, { name, url, kind, notes });
    setEditing(false);
  }

  function cancel() {
    setName(source.name);
    setUrl(source.url);
    setKind(source.kind);
    setNotes(source.notes);
    setEditing(false);
  }

  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      {editing ? (
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as SourceKind)}
            className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button
              onClick={cancel}
              className="rounded-lg border border-line px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-accent text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink">{source.name}</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-line/40 text-ink/90">
                {source.kind}
              </span>
              {!source.active && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  paused
                </span>
              )}
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline break-all"
            >
              {source.url}
            </a>
            {source.notes && (
              <div className="text-xs text-muted mt-1">{source.notes}</div>
            )}
            <div className="text-[11px] text-muted mt-1">
              Last checked:{" "}
              {source.last_checked_at
                ? new Date(source.last_checked_at).toLocaleString()
                : "never"}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={() => onFetch(source.id)}
              disabled={busy || fetching}
              className="rounded-lg bg-accent text-white px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
            >
              {fetching ? "Fetching…" : "Fetch now"}
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={busy || fetching}
              className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            >
              Edit
            </button>
            <button
              onClick={() => onPatch(source.id, { active: !source.active })}
              disabled={busy || fetching}
              className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            >
              {source.active ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => onDelete(source.id, source.name)}
              disabled={busy || fetching}
              className="rounded-lg border border-rose-300 text-rose-700 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
