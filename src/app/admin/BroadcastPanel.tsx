"use client";

import { useEffect, useState } from "react";

interface BroadcastConfig {
  chatId: string | null;
  source: "db" | "env" | null;
  botTokenPresent: boolean;
}

export function BroadcastPanel() {
  const [cfg, setCfg] = useState<BroadcastConfig | null>(null);
  const [chatIdInput, setChatIdInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const r = await fetch("/api/admin/broadcast", { cache: "no-store" });
    const data = (await r.json()) as BroadcastConfig;
    setCfg(data);
    setChatIdInput(data.chatId ?? "");
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!chatIdInput.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: chatIdInput.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setMsg({ ok: true, text: `Saved. New role broadcasts will go to ${data.chatId}.` });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!confirm("Clear the saved chat ID? The env-var fallback (if any) will still apply.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/broadcast", { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      setMsg({ ok: true, text: "Cleared." });
      setChatIdInput("");
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/broadcast/test", { method: "POST" });
      const data = await r.json();
      if (data.ok) {
        setMsg({ ok: true, text: `Test message sent to ${data.chatId}. Check the chat.` });
      } else {
        setMsg({ ok: false, text: `Telegram says: ${data.error}` });
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-surface border border-line rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-xl font-semibold text-ink">Telegram broadcast</h2>
        <span className="text-xs text-muted">
          New jobs will be posted to this chat as soon as they're ingested.
        </span>
      </div>

      {!cfg ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : !cfg.botTokenPresent ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          <code>TELEGRAM_BOT_TOKEN</code> isn&rsquo;t set on Vercel. The bot can&rsquo;t send anything until you add it (this one is a secret, so it must live in env vars).
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted font-medium">Chat ID</span>
              <input
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="-1003766787569 or @your_channel"
                className="border border-line rounded-lg px-3 py-2 text-sm bg-paper"
              />
            </label>
            <button
              onClick={save}
              disabled={busy || !chatIdInput.trim() || chatIdInput.trim() === cfg.chatId}
              className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={test}
              disabled={busy || !cfg.chatId}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Send test
            </button>
            <button
              onClick={clear}
              disabled={busy || cfg.source !== "db"}
              className="rounded-lg border border-rose-300 text-rose-700 px-3 py-2 text-xs font-medium disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 text-xs text-muted">
            {cfg.chatId ? (
              <>
                Active chat: <span className="font-mono text-ink">{cfg.chatId}</span>{" "}
                <span className="ml-1 px-1.5 py-0.5 rounded bg-line/60 text-ink/80 uppercase tracking-wider text-[10px]">
                  from {cfg.source}
                </span>
              </>
            ) : (
              <>No chat configured. Paste an ID above and Save, then Send test.</>
            )}
          </div>

          <details className="mt-3 text-xs text-muted">
            <summary className="cursor-pointer">How to get a chat ID</summary>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>Add <b>@pablo_jobs_bot</b> to your channel/group as an admin with &ldquo;Post Messages&rdquo; permission.</li>
              <li>Send <code>/chatid</code> in that chat — the bot replies with the chat&rsquo;s numeric ID.</li>
              <li>Paste the ID above and click Save, then Send test.</li>
            </ol>
          </details>

          {msg && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                msg.ok
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
            >
              {msg.text}
            </div>
          )}
        </>
      )}
    </section>
  );
}
