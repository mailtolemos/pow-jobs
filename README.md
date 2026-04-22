# PoW Jobs — Proof of Work

> A candidate-first job matching platform for finance and crypto professionals.
> Tell us who you are once. We score every open role against your real preferences
> — comp floor, jurisdiction, domain, token upside, dealbreakers — and only send
> what's worth your time. Silence when there's nothing good.

This is a working **prototype** of the product described in the PoW Jobs PRD.
It runs locally against SQLite with 30 demo jobs and 3 candidate personas,
and can optionally use the Claude API as the LLM judge in the matching pipeline.

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. (optional) Configure your Claude API key
cp .env.example .env.local
# edit .env.local to add ANTHROPIC_API_KEY — if you skip this, the matcher
# falls back to a deterministic heuristic scorer.

# 3. Seed the local SQLite DB with 30 jobs and 3 personas
npm run seed

# 4. Run the CLI match demo (no server needed)
npm run match-demo

# 5. Or start the full web UI
npm run dev
# → http://localhost:3000
```

If you're on a filesystem that doesn't support SQLite WAL mode (e.g. some FUSE
mounts), set `DATABASE_PATH=/tmp/pow-jobs.db` when running any command.

---

## What this prototype demonstrates

### 1. The three strategic rails from the PRD
- **Deep onboarding** — single structured schema per candidate (preferences,
  weights, hard filters, dealbreakers, identity mode). See `src/lib/types.ts`
  and `/onboarding`.
- **Precision floor over recall** — per-candidate threshold; sub-threshold weeks
  send *silence*. See `precisionFloorFor()` in `src/lib/matching.ts` and the
  "Show silence week" toggle on `/email-preview`.
- **Bilingual crypto + finance** — domain taxonomy covers `crypto:defi`,
  `crypto:trading`, `finance:systematic`, `finance:hft`, etc. Cross-domain
  candidates (e.g. Jane Street trader exploring Jump Crypto) match cleanly.

### 2. The hybrid matching pipeline
`src/lib/matching.ts` implements:

```
hard_filters (comp, jurisdiction, remote, visa, regulated, dealbreakers)
   ↓ pass?
structured_score
   (domain fit + function fit + seniority + tech overlap + comp fit
    + token upside + team quality, weighted by candidate's own sliders)
   ↓ structured ≥ 0.4 AND Claude key present?
llm_score via Claude (src/lib/llm.ts, JSON-mode prompt, precise rubric)
   ↓
final_score = 0.6 * structured + 0.4 * llm    (or structured only)
   ↓
precision_floor (per-candidate)
   ↓
digest
```

The LLM judge is **optional by design** — no API key required to use the
prototype. A deterministic heuristic rationale is generated either way.

### 3. The full candidate surface
- `/` — landing page with positioning
- `/onboarding` — six-step walkthrough (what we ask, why, demo examples)
- `/feed` — live matching UI; switch personas, toggle LLM, toggle precision floor
- `/email-preview` — weekly digest rendered in an iframe; toggle the silence
  scenario
- `/admin` — browse all seeded jobs and candidates

### 4. Demo personas exercised by the matcher
| Persona | Identity | Angle | Shape of matches |
|---|---|---|---|
| **0xHaru** | pseudonymous | Solidity/Rust founding engineer, 8 yr, global-remote, token-friendly | Heavy crypto-infra + DeFi, Jump Crypto / Uniswap / Symbiotic |
| **Priya Chen** | real name | Citadel quant researcher, 12 yr, US-only, no seed-stage, no unregulated | Pure TradFi — Citadel, Two Sigma, Point72, Millennium |
| **Marco Ferrari** | real name | Jane Street trader, 5 yr, hybrid, open to both worlds | Mixed — SIG / Jump Crypto / Wintermute |

---

## Project layout

```
src/
  app/
    layout.tsx, page.tsx, globals.css
    onboarding/page.tsx
    feed/page.tsx
    email-preview/page.tsx
    admin/page.tsx
    api/
      candidates/route.ts       GET list
      jobs/route.ts             GET list
      match/route.ts            POST — run matcher, return ranked list
  components/
    Nav.tsx, JobCard.tsx
  lib/
    types.ts            Core TypeScript interfaces (Job, Candidate, MatchScore)
    schema.sql          SQLite DDL (jobs, candidates, matches, interactions)
    db.ts               better-sqlite3 wrapper + row<>object conversion
    seed-data.ts        30 jobs (15 crypto, 15 finance) + 3 personas
    matching.ts         Hard filters, structured score, precision floor, orchestration
    llm.ts              Claude API wrapper (optional; null if no key)
    email.ts            Inline-styled HTML digest renderer
scripts/
  seed.ts               npm run seed
  match-demo.ts         npm run match-demo (CLI demo of the whole loop)
```

---

## From prototype to production — what's missing

This prototype intentionally stops short of the full production scope so the
matching loop can be understood end-to-end in one evening. To ship the product
in the PRD, you'd need:

1. **Auth & real accounts** — replace `listCandidates()` hardcoded personas with
   Clerk/Auth.js-backed candidate accounts. Add identity verification paths for
   the three modes (real / pseudonym / wallet).
2. **Ingestion pipeline** — upstream aggregators (Greenhouse/Lever APIs, OA
   parsers, manual curator tools) that produce the structured `Job` rows the
   matcher consumes. Right now jobs are hand-written.
3. **Postgres + job queue** — SQLite is fine for demo. In prod, swap to
   Postgres with pgvector for embedding retrieval, and a job queue (Inngest /
   Trigger.dev) for weekly digest generation and re-scoring on new jobs.
4. **Actual email delivery** — wire `renderDigestHTML` to Postmark / Resend and
   schedule a weekly worker that applies the precision floor per candidate.
5. **Employer side** — currently only the candidate surface. Employer dashboard,
   subscription billing ($2–5k/mo gated reach-outs, per the PRD), and match
   visibility without PII leakage.
6. **Collaborative filtering signal** — the `interactions` table is already in
   the schema; once there are enough saves/dismisses across ~3k users, layer a
   "candidates like you also looked at…" signal on top of the content-based
   score.
7. **Evals** — a test harness that replays a golden-set of (candidate, job,
   expected_verdict) tuples against every matcher change, so changes to weights
   or the LLM prompt can't silently regress precision.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on `:3000` |
| `npm run build` | Production build |
| `npm run seed` | Insert 30 jobs + 3 candidates into SQLite |
| `npm run match-demo` | CLI: score all jobs for every candidate, print top 5 |
| `npm run match-demo -- cand_bridge_001` | Same, one candidate |
| `npm run typecheck` | `tsc --noEmit` |

## License

Prototype code — do as you like. PRD is in the repo root (`PoW-Jobs-PRD.docx`).
