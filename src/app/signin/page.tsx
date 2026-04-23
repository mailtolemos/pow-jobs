"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function SigninInner() {
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get("error");
  const redirectTo = params.get("next") || "/profile";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const errorText =
    error === "expired"
      ? "That link has expired or already been used. Request a new one below."
      : error === "missing"
      ? "Sign-in link was invalid. Request a new one below."
      : errMsg;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrMsg(null);
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; devPreviewUrl?: string };
      if (!json.ok) {
        setStatus("error");
        setErrMsg(json.error || "Something went wrong. Try again.");
        return;
      }
      setStatus("sent");
      if (json.devPreviewUrl) setDevUrl(json.devPreviewUrl);
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">Pablo Jobs</div>
        <h1 className="text-3xl font-bold text-ink">Sign in</h1>
        <p className="text-muted mt-2 text-sm">
          Enter your email and we&rsquo;ll send you a one-time sign-in link. No passwords.
        </p>
      </div>

      {errorText && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          {errorText}
        </div>
      )}

      {status !== "sent" ? (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-muted mb-1">Email</span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-line px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending" || !email}
            className="w-full rounded-lg bg-accent text-white py-2.5 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
          </button>
          <p className="text-xs text-muted text-center">
            We never share your email. By signing in you agree to receive weekly job digests (you can turn them off any time).
          </p>
        </form>
      ) : (
        <div className="bg-surface border border-line rounded-xl p-6">
          <div className="text-lg font-semibold text-ink mb-1">Check your email.</div>
          <p className="text-sm text-muted">
            We sent a sign-in link to <strong>{email}</strong>. It&rsquo;s valid for 15 minutes. If it doesn&rsquo;t arrive, check spam or try again.
          </p>
          {devUrl && (
            <div className="mt-4 rounded-lg bg-paper border border-line px-3 py-3 text-xs text-ink/90 font-mono break-all">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-1 font-sans">
                Dev mode (no RESEND_API_KEY set)
              </div>
              <a href={devUrl} className="text-accent underline">{devUrl}</a>
            </div>
          )}
          <button
            onClick={() => {
              setStatus("idle");
              setDevUrl(null);
            }}
            className="mt-4 text-sm text-accent hover:underline"
          >
            Use a different email
          </button>
        </div>
      )}

      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-10 text-muted">Loading…</div>}>
      <SigninInner />
    </Suspense>
  );
}
