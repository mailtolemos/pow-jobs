"use client";

import { useEffect, useState } from "react";

interface BroadcastConfig {
  chatId: string | null;
  chatSource: "db" | "env" | null;
  botTokenPresent: boolean;
  botTokenSource: "db" | "env" | null;
  botTokenMask: string | null;
}

export function BroadcastPanel() {
  const [cfg, setCfg] = useState<BroadcastConfig | null>(null);
  const [chatIdInput, setChatIdInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const r = await fetch("/api/admin/broadcast", { cache: "no-store" });
    const data = (await r.json()) as BroadcastConfig;
    setCfg(data);
    setChatIdInput(data.chatId ?? "");
    // Don't pre-fill the token — keep it write-only for security feel.
    setTokenInput("");
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload: { chatId?: string; botToken?: string }) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      const what = payload.botToken ? "Bot token" : "Chat ID";
      setMsg({ ok: true, text: `${what} saved.` });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function clearWhich(which: "chat" | "token") {
    const label = which === "token" ? "saved bot token" : "saved chat ID";
    if (!confirm(`Clear the ${label}? The env-var fallback (if any) will still apply.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/broadcast?which=${which}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      setMsg({ ok: true, text: `Cleared ${label}.` });
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
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-xl font-semibold text-ink">Telegram broadcast</h2>
        <span className="text-xs text-muted">
          New jobs auto-post to this chat. Configure both fields here — no Vercel redeploy needed.
        </span>
      </div>

      {!cfg ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : (
        <div className="space-y-5">
          {/* ---- Bot token ---- */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted mb-1.5">
              Bot token
              {cfg.botTokenPresent && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 normal-case font-medium">
                  set ({cfg.botTokenSource})
                </span>
              )}
            </div>
            {cfg.botTokenPresent ? (
              <div className="flex items-center gap-3 flex-wrap">
                <code className="bg-paper border border-line rounded px-2 py-1 text-xs text-ink/80 font-mono">
                  {cfg.botTokenMask}
                </code>
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste a new token to replace…"
                  className="flex-1 min-w-[260px] border border-line rounded-lg px-3 py-2 text-sm bg-paper font-mono"
                />
                <button
                  onClick={() => save({ botToken: tokenInput.trim() })}
                  disabled={busy || !tokenInput.trim()}
                  className="rounded-lg bg-accent text-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Replace
                </button>
                {cfg.botTokenSource === "db" && (
                  <button
                    onClick={() => clearWhich("token")}
                    disabled={busy}
                    className="rounded-lg border border-rose-300 text-rose-700 px-3 py-2 text-xs font-medium disabled:opacity-40"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="123456789:ABCDEF... (from BotFather)"
                  className="flex-1 min-w-[260px] border border-line rounded-lg px-3 py-2 text-sm bg-paper font-mono"
                />
                <button
                  onClick={() => save({ botToken: tokenInput.trim() })}
                  disabled={busy || !tokenInput.trim()}
                  className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Save token
                </button>
              </div>
            )}
            <div className="text-[11px] text-muted mt-1">
              Talk to <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">@BotFather</a>{" "}
              → <code>/mybots</code> → @pablo_jobs_bot → <b>API Token</b>. Stored encrypted in your private database.
            </div>
          </div>

          {/* ---- Chat ID ---- */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted mb-1.5">
              Chat ID
              {cfg.chatId && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 normal-case font-medium">
                  set ({cfg.chatSource})
                </span>
              )}
            </div>
            <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
              <input
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="-1003766787569 or @your_channel"
                className="border border-line rounded-lg px-3 py-2 text-sm bg-paper"
              />
              <button
                onClick={() => save({ chatId: chatIdInput.trim() })}
                disabled={busy || !chatIdInput.trim() || chatIdInput.trim() === cfg.chatId}
                className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={test}
                disabled={busy || !cfg.chatId || !cfg.botTokenPresent}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Send test
              </button>
              {cfg.chatSource === "db" && (
                <button
                  onClick={() => clearWhich("chat")}
                  disabled={busy}
                  className="rounded-lg border border-rose-300 text-rose-700 px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="text-[11px] text-muted mt-1">
              Get this by sending <code>/chatid</code> to the bot from inside your channel/group (after adding the bot as admin).
            </div>
          </div>

          {msg && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.ok
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
