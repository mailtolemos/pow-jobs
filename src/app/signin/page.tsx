"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CONTACT_EMAIL, contactMailto } from "@/lib/contact";

type AccountType = "candidate" | "company";

function SigninInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const initialAs = (params.get("as") as AccountType | null) ?? null;
  const requestedNext = params.get("next");

  const [accountType, setAccountType] = useState<AccountType>(
    initialAs === "company" ? "company" : "candidate",
  );
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Sync the toggle if the URL param changes (e.g. user navigates between
  // /signin and /signin?as=company without a full reload).
  useEffect(() => {
    if (initialAs === "company") setAccountType("company");
    else if (initialAs === "candidate") setAccountType("candidate");
  }, [initialAs]);

  const errorText =
    error === "expired"
      ? "That link has expired or already been used. Request a new one below."
      : error === "missing"
      ? "Sign-in link was invalid. Request a new one below."
      : errMsg;

  // Companies always land on /post-job. Candidates honour `?next=` if it was
  // passed (eg from the feed) — otherwise default to /profile so they can fill
  // out their preferences before seeing matches.
  const redirectTo =
    accountType === "company"
      ? "/post-job"
      : requestedNext || "/profile";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrMsg(null);
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, redirectTo, accountType }),
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
    <div className="max-w-md mx-auto px-4 md:px-6 py-20">
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">ProWo</div>
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
          {/* Account-type picker so companies land in the post-job flow only */}
          <div>
            <span className="block text-xs uppercase tracking-wider text-muted mb-2">
              I&rsquo;m here to&hellip;
            </span>
            <div className="grid grid-cols-2 gap-2">
              <AccountChoice
                active={accountType === "candidate"}
                onClick={() => setAccountType("candidate")}
                title="Find a job"
                subtitle="Get matched to roles in tech, crypto &amp; finance."
              />
              <AccountChoice
                active={accountType === "company"}
                onClick={() => setAccountType("company")}
                title="Hire"
                subtitle="Submit a role for review and reach the right candidates."
              />
            </div>
          </div>

          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-muted mb-1">
              {accountType === "company" ? "Work email" : "Email"}
            </span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={accountType === "company" ? "you@company.com" : "you@example.com"}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
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
            {accountType === "company"
              ? "Company accounts only see the Post a Job page. Submitted roles are reviewed before going live."
              : "We never share your email. By signing in you agree to receive job digests (toggle off any time)."}
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

      <div className="text-center mt-6 space-y-2">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            ← Back to homepage
          </Link>
        </div>
        <div className="text-xs text-muted">
          Trouble signing in?{" "}
          <a
            href={contactMailto("Sign-in trouble on ProWo")}
            className="underline hover:text-ink"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}

function AccountChoice({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border px-3 py-3 transition ${
        active
          ? "border-accent bg-accent/10 text-ink"
          : "border-line bg-paper text-muted hover:border-accent/50 hover:text-ink"
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div
        className="text-[11px] mt-1 leading-snug"
        // subtitle is a static literal so dangerouslySetInnerHTML is safe here
        // (decoding the &amp; without leaking React text-node escapes).
        dangerouslySetInnerHTML={{ __html: subtitle }}
      />
    </button>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-10 text-muted">Loading…</div>}>
      <SigninInner />
    </Suspense>
  );
}
