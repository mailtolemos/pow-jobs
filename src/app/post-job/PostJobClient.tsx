"use client";

// The single form a hiring user fills out. Keep the schema small and human —
// admins can fix tags/comp on approval. Required fields: title, employer,
// description, location, source URL (apply link). Everything else is optional.

import { useState } from "react";
import Link from "next/link";

interface Props {
  submitterEmail: string;
}

interface FormState {
  title: string;
  employer: string;
  employer_category: string;
  description: string;
  location: string;
  remote_policy: "remote-global" | "remote-regional" | "hybrid" | "onsite";
  jurisdiction_required: "global" | "us" | "eu" | "uk" | "apac" | "latam";
  domain: string;
  function: string;
  seniority: string;
  stage: string;
  base_min: string;
  base_max: string;
  token_pct_target: string;
  source_url: string;
  tech_stack: string;
  visa_sponsored: boolean;
  regulated: boolean;
}

const INITIAL: FormState = {
  title: "",
  employer: "",
  employer_category: "Tech / startup",
  description: "",
  location: "Remote",
  remote_policy: "remote-global",
  jurisdiction_required: "global",
  domain: "fintech",
  function: "engineering",
  seniority: "ic4",
  stage: "series-a",
  base_min: "",
  base_max: "",
  token_pct_target: "",
  source_url: "",
  tech_stack: "",
  visa_sponsored: false,
  regulated: false,
};

const DOMAINS: Array<{ v: string; label: string }> = [
  { v: "fintech", label: "Fintech" },
  { v: "finance:hedgefund", label: "Hedge fund" },
  { v: "finance:hft", label: "HFT" },
  { v: "finance:prop", label: "Prop trading" },
  { v: "finance:banking", label: "Banking" },
  { v: "finance:systematic", label: "Systematic" },
  { v: "finance:discretionary", label: "Discretionary" },
  { v: "finance:macro", label: "Macro" },
  { v: "finance:credit", label: "Credit" },
  { v: "finance:equities", label: "Equities" },
  { v: "finance:fi", label: "Fixed income" },
  { v: "crypto:defi", label: "Crypto · DeFi" },
  { v: "crypto:infra", label: "Crypto · Infra" },
  { v: "crypto:l1", label: "Crypto · L1" },
  { v: "crypto:l2", label: "Crypto · L2" },
  { v: "crypto:application", label: "Crypto · App" },
  { v: "crypto:analytics", label: "Crypto · Analytics" },
  { v: "crypto:trading", label: "Crypto · Trading" },
  { v: "crypto:security", label: "Crypto · Security" },
];

const FUNCTIONS = [
  ["engineering", "Engineering"],
  ["quant-research", "Quant research"],
  ["trading", "Trading"],
  ["product", "Product"],
  ["design", "Design"],
  ["ops", "Operations / People"],
  ["business", "Business / Sales / Marketing"],
  ["legal-compliance", "Legal / Compliance"],
  ["data", "Data"],
];

const SENIORITIES = [
  ["ic1", "IC1 · Intern"],
  ["ic2", "IC2 · Junior"],
  ["ic3", "IC3 · Mid"],
  ["ic4", "IC4 · Senior"],
  ["ic5", "IC5 · Staff"],
  ["ic6", "IC6 · Principal"],
  ["ic7", "IC7 · Distinguished"],
  ["m1", "M1 · Team Lead"],
  ["m2", "M2 · Manager"],
  ["m3", "M3 · Sr. Manager"],
  ["m4", "M4 · Director"],
  ["m5", "M5 · VP / Head"],
];

const STAGES = [
  ["seed", "Seed"],
  ["series-a", "Series A"],
  ["series-b", "Series B"],
  ["series-c", "Series C"],
  ["series-d-plus", "Series D+"],
  ["public", "Public"],
  ["dao", "DAO / Foundation"],
  ["fund", "Fund"],
  ["propshop", "Prop shop"],
];

export function PostJobClient({ submitterEmail }: Props) {
  const [state, setState] = useState<FormState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { kind: "ok"; jobId: string }
    | { kind: "err"; message: string }
    | null
  >(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setBusy(true);
    try {
      const payload = {
        title: state.title.trim(),
        employer: state.employer.trim(),
        employer_category: state.employer_category.trim(),
        description: state.description.trim(),
        location: state.location.trim() || "Remote",
        remote_policy: state.remote_policy,
        jurisdiction_required: state.jurisdiction_required,
        domain: state.domain,
        function: state.function,
        seniority: state.seniority,
        stage: state.stage,
        base_min: state.base_min ? Number(state.base_min) : null,
        base_max: state.base_max ? Number(state.base_max) : null,
        token_pct_target: state.token_pct_target ? Number(state.token_pct_target) : null,
        source_url: state.source_url.trim(),
        tech_stack: state.tech_stack
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        visa_sponsored: state.visa_sponsored,
        regulated: state.regulated,
      };
      const res = await fetch("/api/post-job", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; jobId?: string };
      if (!res.ok || !json.ok || !json.jobId) {
        setResult({ kind: "err", message: json.error || "Submission failed" });
        return;
      }
      setResult({ kind: "ok", jobId: json.jobId });
      setState(INITIAL);
    } catch (err) {
      setResult({
        kind: "err",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-line rounded-xl p-6 space-y-5"
    >
      {result?.kind === "ok" && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
          Submitted! Your role is now in the moderation queue (id&nbsp;
          <code className="font-mono text-xs">{result.jobId}</code>). You&rsquo;ll get an email at
          {" "}<strong>{submitterEmail}</strong> when it&rsquo;s reviewed.
        </div>
      )}
      {result?.kind === "err" && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-900">
          {result.message}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Job title" required>
          <input
            type="text"
            required
            maxLength={200}
            value={state.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Senior Backend Engineer"
            className={inputCls}
          />
        </Field>
        <Field label="Company name" required>
          <input
            type="text"
            required
            maxLength={120}
            value={state.employer}
            onChange={(e) => update("employer", e.target.value)}
            placeholder="Acme Capital"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Job description" required hint="Plain text or HTML, we'll clean it up.">
        <textarea
          required
          rows={10}
          minLength={50}
          maxLength={20000}
          value={state.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What the role does, what you're looking for, what makes the team great..."
          className={`${inputCls} font-sans`}
        />
      </Field>

      <Field
        label="Apply link"
        required
        hint="The URL where candidates click to apply (your ATS, your careers page, etc)."
      >
        <input
          type="url"
          required
          maxLength={500}
          value={state.source_url}
          onChange={(e) => update("source_url", e.target.value)}
          placeholder="https://jobs.acme.com/senior-backend-engineer"
          className={inputCls}
        />
      </Field>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Location">
          <input
            type="text"
            maxLength={120}
            value={state.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Remote, NYC, London…"
            className={inputCls}
          />
        </Field>
        <Field label="Remote policy">
          <select
            value={state.remote_policy}
            onChange={(e) => update("remote_policy", e.target.value as FormState["remote_policy"])}
            className={inputCls}
          >
            <option value="remote-global">Remote · global</option>
            <option value="remote-regional">Remote · regional</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </Field>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Domain">
          <select
            value={state.domain}
            onChange={(e) => update("domain", e.target.value)}
            className={inputCls}
          >
            {DOMAINS.map(({ v, label }) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Function">
          <select
            value={state.function}
            onChange={(e) => update("function", e.target.value)}
            className={inputCls}
          >
            {FUNCTIONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Seniority">
          <select
            value={state.seniority}
            onChange={(e) => update("seniority", e.target.value)}
            className={inputCls}
          >
            {SENIORITIES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Base salary min (USD)">
          <input
            type="number"
            min={0}
            step={1000}
            value={state.base_min}
            onChange={(e) => update("base_min", e.target.value)}
            placeholder="120000"
            className={inputCls}
          />
        </Field>
        <Field label="Base salary max (USD)">
          <input
            type="number"
            min={0}
            step={1000}
            value={state.base_max}
            onChange={(e) => update("base_max", e.target.value)}
            placeholder="180000"
            className={inputCls}
          />
        </Field>
        <Field label="Token / equity %" hint="0–100 (optional)">
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={state.token_pct_target}
            onChange={(e) => update("token_pct_target", e.target.value)}
            placeholder="0.5"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Company stage">
          <select
            value={state.stage}
            onChange={(e) => update("stage", e.target.value)}
            className={inputCls}
          >
            {STAGES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Jurisdiction">
          <select
            value={state.jurisdiction_required}
            onChange={(e) =>
              update("jurisdiction_required", e.target.value as FormState["jurisdiction_required"])
            }
            className={inputCls}
          >
            <option value="global">Global</option>
            <option value="us">US</option>
            <option value="eu">EU</option>
            <option value="uk">UK</option>
            <option value="apac">APAC</option>
            <option value="latam">LATAM</option>
          </select>
        </Field>
        <Field label="Tech stack" hint="Comma-separated">
          <input
            type="text"
            maxLength={300}
            value={state.tech_stack}
            onChange={(e) => update("tech_stack", e.target.value)}
            placeholder="Go, Postgres, Kubernetes"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={state.visa_sponsored}
            onChange={(e) => update("visa_sponsored", e.target.checked)}
          />
          Visa sponsorship available
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={state.regulated}
            onChange={(e) => update("regulated", e.target.checked)}
          />
          Regulated role (e.g. licensed advisor)
        </label>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-line">
        <div className="text-xs text-muted">
          By submitting, you confirm this role is real and you&rsquo;re authorized to post it.
        </div>
        <button
          type="submit"
          disabled={busy || !state.title || !state.employer || !state.description || !state.source_url}
          className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </div>

      <div className="text-xs text-muted text-center pt-1">
        Need to make changes after submitting?{" "}
        <Link href="mailto:mailtolemos@gmail.com" className="underline">
          Contact us
        </Link>
        .
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-muted mb-1">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-muted mt-1">{hint}</span>}
    </label>
  );
}
