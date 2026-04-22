"use client";

import { useState, useTransition } from "react";
import type { Candidate } from "@/lib/types";
import type { CandidateExtras } from "@/lib/db";

const DOMAINS: Array<[string, string]> = [
  ["crypto:defi", "Crypto — DeFi"],
  ["crypto:infra", "Crypto — Infra / MEV"],
  ["crypto:l1", "Crypto — L1"],
  ["crypto:l2", "Crypto — L2"],
  ["crypto:application", "Crypto — Apps"],
  ["crypto:analytics", "Crypto — Analytics"],
  ["crypto:trading", "Crypto — Trading"],
  ["crypto:security", "Crypto — Security"],
  ["finance:systematic", "Finance — Systematic"],
  ["finance:discretionary", "Finance — Discretionary"],
  ["finance:macro", "Finance — Macro"],
  ["finance:credit", "Finance — Credit"],
  ["finance:equities", "Finance — Equities"],
  ["finance:fi", "Finance — Fixed Income"],
  ["finance:hft", "Finance — HFT"],
  ["finance:prop", "Finance — Prop"],
  ["finance:hedgefund", "Finance — Hedge fund"],
  ["finance:banking", "Finance — Banking"],
  ["fintech", "Fintech"],
];

const FUNCTIONS: Array<[string, string]> = [
  ["engineering", "Engineering"],
  ["quant-research", "Quant research"],
  ["trading", "Trading"],
  ["product", "Product"],
  ["design", "Design"],
  ["data", "Data"],
  ["ops", "Ops"],
  ["business", "Business"],
  ["legal-compliance", "Legal / Compliance"],
];

const SENIORITY: Array<[string, string]> = [
  ["ic1", "IC1 — Junior"],
  ["ic2", "IC2"],
  ["ic3", "IC3 — Mid"],
  ["ic4", "IC4 — Senior"],
  ["ic5", "IC5 — Staff"],
  ["ic6", "IC6 — Principal"],
  ["ic7", "IC7 — Distinguished"],
  ["m1", "M1 — Manager"],
  ["m2", "M2 — Sr. Manager"],
  ["m3", "M3 — Director"],
  ["m4", "M4 — Sr. Director"],
  ["m5", "M5 — VP+"],
];

const JURISDICTIONS: Array<[string, string]> = [
  ["global", "Global"],
  ["us", "United States"],
  ["eu", "European Union"],
  ["uk", "United Kingdom"],
  ["apac", "APAC"],
  ["latam", "LATAM"],
];

const REMOTE: Array<[string, string]> = [
  ["onsite", "Onsite only"],
  ["hybrid", "Hybrid"],
  ["remote-regional", "Remote (regional)"],
  ["remote-global", "Remote (global)"],
];

type Props = {
  userEmail: string;
  candidate: Candidate;
  extras: CandidateExtras;
  telegramBotUsername: string;
};

type FormState = Candidate & CandidateExtras;

function initialState(candidate: Candidate, extras: CandidateExtras): FormState {
  return { ...candidate, ...extras };
}

export function ProfileEditor({ userEmail, candidate, extras, telegramBotUsername }: Props) {
  const [state, setState] = useState<FormState>(() => initialState(candidate, extras));
  const [saving, startSaving] = useTransition();
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [telegramBusy, setTelegramBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function toggleInArray<T>(key: keyof FormState, value: T) {
    setState((s) => {
      const arr = s[key] as T[];
      const has = arr.includes(value);
      return { ...s, [key]: has ? arr.filter((v) => v !== value) : [...arr, value] } as FormState;
    });
  }

  async function save() {
    setToast(null);
    startSaving(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setToast({ kind: "err", msg: j.error || "Save failed" });
        return;
      }
      setToast({ kind: "ok", msg: "Saved." });
    });
  }

  async function runLinkedInImport() {
    if (!importText.trim()) return;
    setImportBusy(true);
    try {
      const res = await fetch("/api/profile/linkedin-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: importText, linkedin_url: state.linkedin_url }),
      });
      const j = (await res.json()) as { ok: boolean; patch?: Partial<FormState>; error?: string };
      if (!j.ok || !j.patch) {
        setToast({ kind: "err", msg: j.error || "Couldn't parse that — try more text." });
        return;
      }
      setState((s) => ({ ...s, ...j.patch } as FormState));
      setImportOpen(false);
      setImportText("");
      setToast({ kind: "ok", msg: "Applied LinkedIn extract. Review and save." });
    } finally {
      setImportBusy(false);
    }
  }

  async function generateTelegramToken() {
    setTelegramBusy(true);
    try {
      const res = await fetch("/api/profile/telegram-link", { method: "POST" });
      const j = (await res.json()) as { ok: boolean; token?: string; error?: string };
      if (j.ok && j.token) {
        setState((s) => ({ ...s, telegram_link_token: j.token ?? null }));
        setToast({ kind: "ok", msg: "Fresh Telegram link token ready." });
      } else {
        setToast({ kind: "err", msg: j.error || "Couldn't generate token." });
      }
    } finally {
      setTelegramBusy(false);
    }
  }

  function dealbreakersText(): string {
    return state.dealbreakers.join("\n");
  }
  function onDealbreakersChange(txt: string) {
    update(
      "dealbreakers",
      txt
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  function techStackText(): string {
    return state.tech_stack.join(", ");
  }
  function onTechStackChange(txt: string) {
    update(
      "tech_stack",
      txt
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`sticky top-2 z-10 rounded-lg border px-4 py-2 text-sm ${
            toast.kind === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Identity */}
      <Section title="Identity" subtitle={`Signed in as ${userEmail}.`}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Display name">
            <input
              type="text"
              value={state.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Identity mode">
            <select
              value={state.identity_mode}
              onChange={(e) => update("identity_mode", e.target.value as Candidate["identity_mode"])}
              className={inputCls}
            >
              <option value="real">Real name</option>
              <option value="pseudonym">Pseudonymous</option>
            </select>
          </Field>
          <Field label="Headline" hint="One-line self-description. What do you want matched?">
            <input
              type="text"
              value={state.headline}
              onChange={(e) => update("headline", e.target.value)}
              placeholder="e.g., Founding engineer at a DeFi protocol; curious about quant-adjacent roles."
              className={inputCls}
            />
          </Field>
          <Field label="LinkedIn URL">
            <input
              type="url"
              value={state.linkedin_url ?? ""}
              onChange={(e) => update("linkedin_url", e.target.value || null)}
              placeholder="https://www.linkedin.com/in/..."
              className={inputCls}
            />
          </Field>
          <Field label="GitHub URL">
            <input
              type="url"
              value={state.github_url ?? ""}
              onChange={(e) => update("github_url", e.target.value || null)}
              placeholder="https://github.com/..."
              className={inputCls}
            />
          </Field>
          <Field label="Farcaster / ENS" hint="Optional — pseudonymous signal carries weight here.">
            <input
              type="text"
              value={state.farcaster_handle ?? ""}
              onChange={(e) => update("farcaster_handle", e.target.value || null)}
              placeholder="@handle.eth"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            className="text-sm text-accent hover:underline"
          >
            {importOpen ? "Cancel" : "Import from LinkedIn (paste about/experience text)"}
          </button>
        </div>
        {importOpen && (
          <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <p className="text-xs text-neutral-600 mb-2">
              LinkedIn blocks automated fetches, so paste your About and top Experience entries here. We&rsquo;ll
              extract a draft profile you can review before saving.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              className={inputCls + " font-mono text-xs"}
              placeholder="Founding Engineer at Acme Labs (2021 — now)&#10;Previously Staff Engineer at Bank of X (2017–2021)&#10;About: built low-latency MEV bots, 8 YoE in Rust + Solidity..."
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={runLinkedInImport}
                disabled={importBusy || !importText.trim()}
                className="rounded-lg bg-ink text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {importBusy ? "Extracting…" : "Extract & fill"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportOpen(false);
                  setImportText("");
                }}
                className="text-xs text-neutral-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Career */}
      <Section title="Career context">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Current role">
            <input
              type="text"
              value={state.current_role}
              onChange={(e) => update("current_role", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Current employer">
            <input
              type="text"
              value={state.current_employer}
              onChange={(e) => update("current_employer", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Years of experience">
            <input
              type="number"
              min={0}
              max={60}
              value={state.years_experience}
              onChange={(e) => update("years_experience", Math.max(0, Number(e.target.value) || 0))}
              className={inputCls}
            />
          </Field>
          <Field label="Seniority">
            <select
              value={state.seniority_band}
              onChange={(e) => update("seniority_band", e.target.value as Candidate["seniority_band"])}
              className={inputCls}
            >
              {SENIORITY.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Education" className="md:col-span-2">
            <input
              type="text"
              value={state.education}
              onChange={(e) => update("education", e.target.value)}
              placeholder="e.g., MS Stanford, Phys BSc Imperial"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Interests */}
      <Section title="What you want" subtitle="Pick every domain and function you're open to. Precision over breadth.">
        <Field label="Domains of interest" hint="Multi-select — direct hits score highest, adjacent family still scores well.">
          <ChipGroup
            options={DOMAINS}
            selected={state.domains_of_interest}
            onToggle={(v) => toggleInArray("domains_of_interest", v)}
          />
        </Field>
        <Field label="Functions">
          <ChipGroup
            options={FUNCTIONS}
            selected={state.functions}
            onToggle={(v) => toggleInArray("functions", v)}
          />
        </Field>
        <Field label="Tech stack / skills" hint="Comma-separated. e.g., Rust, Solidity, Python, Kx, JAX">
          <textarea
            value={techStackText()}
            onChange={(e) => onTechStackChange(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>
      </Section>

      {/* Hard filters */}
      <Section title="Hard filters" subtitle="Anything that fails here is auto-excluded — no LLM, no exceptions.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Comp floor (USD, base)" hint="Roles whose max base is below this floor are dropped.">
            <input
              type="number"
              min={0}
              step={5000}
              value={state.comp_floor_usd}
              onChange={(e) => update("comp_floor_usd", Math.max(0, Number(e.target.value) || 0))}
              className={inputCls}
            />
          </Field>
          <Field label="Need visa sponsorship?">
            <select
              value={state.visa_needed ? "yes" : "no"}
              onChange={(e) => update("visa_needed", e.target.value === "yes")}
              className={inputCls}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="OK with regulated roles?" hint="Banks, broker-dealers, licensed exchanges.">
            <select
              value={state.max_regulated_ok ? "yes" : "no"}
              onChange={(e) => update("max_regulated_ok", e.target.value === "yes")}
              className={inputCls}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        </div>
        <Field label="Jurisdictions you can work in">
          <ChipGroup
            options={JURISDICTIONS}
            selected={state.jurisdiction_ok}
            onToggle={(v) => toggleInArray("jurisdiction_ok", v)}
          />
        </Field>
        <Field label="Acceptable remote policies">
          <ChipGroup
            options={REMOTE}
            selected={state.remote_policy_ok}
            onToggle={(v) => toggleInArray("remote_policy_ok", v)}
          />
        </Field>
        <Field label="Dealbreakers" hint="One per line. Substring match against employer / stage / domain / description. Use 'stage:seed' to block seed-stage, etc.">
          <textarea
            value={dealbreakersText()}
            onChange={(e) => onDealbreakersChange(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="no stablecoins&#10;stage:seed"
          />
        </Field>
      </Section>

      {/* Soft weights */}
      <Section title="How to weigh trade-offs">
        <div className="grid md:grid-cols-2 gap-4">
          <WeightSlider
            label="Comp weight"
            value={state.weight_comp}
            onChange={(v) => update("weight_comp", v)}
            hint="Higher = more reward for roles well above your floor."
          />
          <WeightSlider
            label="Domain fit weight"
            value={state.weight_domain_fit}
            onChange={(v) => update("weight_domain_fit", v)}
            hint="Higher = strictly prefer direct domain hits."
          />
          <WeightSlider
            label="Team quality weight"
            value={state.weight_team_quality}
            onChange={(v) => update("weight_team_quality", v)}
            hint="Higher = favor established / verified employers."
          />
          <WeightSlider
            label="Token / equity upside"
            value={state.weight_token_upside}
            onChange={(v) => update("weight_token_upside", v)}
            hint="Higher = prefer roles with material token or equity."
          />
        </div>
      </Section>

      {/* Alerts */}
      <Section title="Alerts" subtitle="Only the matches that clear your precision floor are sent. Silence is the answer.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Email me new matches">
            <select
              value={state.alert_email_enabled ? "on" : "off"}
              onChange={(e) => update("alert_email_enabled", e.target.value === "on")}
              className={inputCls}
            >
              <option value="on">Yes — send digests</option>
              <option value="off">No — I&rsquo;ll check the feed</option>
            </select>
          </Field>
          <Field label="Frequency">
            <select
              value={state.alert_frequency}
              onChange={(e) =>
                update("alert_frequency", e.target.value as CandidateExtras["alert_frequency"])
              }
              className={inputCls}
            >
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="realtime">Realtime (each new qualifying match)</option>
            </select>
          </Field>
        </div>

        <Field label="Telegram alerts" hint={telegramBotUsername ? `Bot: @${telegramBotUsername}` : "Admin hasn't configured the Telegram bot yet."}>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={state.alert_telegram_enabled ? "on" : "off"}
              onChange={(e) => update("alert_telegram_enabled", e.target.value === "on")}
              className={inputCls + " max-w-[200px]"}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
            {state.telegram_chat_id ? (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                Linked
              </span>
            ) : (
              <span className="text-xs text-neutral-500">Not linked</span>
            )}
            <button
              type="button"
              onClick={generateTelegramToken}
              disabled={telegramBusy}
              className="text-xs text-accent hover:underline"
            >
              {state.telegram_link_token ? "Regenerate link code" : "Generate link code"}
            </button>
          </div>
          {state.telegram_link_token && telegramBotUsername && (
            <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-xs">
              <div className="text-neutral-600 mb-1">
                Open Telegram, message{" "}
                <a
                  className="text-accent underline"
                  href={`https://t.me/${telegramBotUsername}?start=${state.telegram_link_token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{telegramBotUsername}
                </a>{" "}
                or send:
              </div>
              <code className="font-mono text-[11px] block bg-white border border-neutral-200 rounded px-2 py-1">
                /start {state.telegram_link_token}
              </code>
            </div>
          )}
          {state.telegram_link_token && !telegramBotUsername && (
            <div className="mt-2 text-xs text-neutral-500">
              Code: <code className="font-mono">{state.telegram_link_token}</code>
            </div>
          )}
        </Field>
      </Section>

      <div className="sticky bottom-4 flex items-center justify-between rounded-xl bg-white border border-neutral-200 shadow-sm px-5 py-3">
        <div className="text-xs text-neutral-500">
          Profile is used for every scoring run. Changes take effect immediately.
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

// --- UI primitives ---

const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-neutral-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {subtitle && <p className="text-xs text-neutral-500 mt-1 mb-3">{subtitle}</p>}
      <div className={subtitle ? "mt-4 space-y-4" : "mt-3 space-y-4"}>{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-neutral-500 mt-1">{hint}</span>}
    </label>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: Array<[T, string]>;
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => {
        const on = selected.includes(v);
        return (
          <button
            type="button"
            key={v}
            onClick={() => onToggle(v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              on
                ? "bg-accent text-white border-accent"
                : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-neutral-500">{label}</span>
        <span className="text-xs text-neutral-500 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      {hint && <div className="text-[11px] text-neutral-500 mt-1">{hint}</div>}
    </div>
  );
}
