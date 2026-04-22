# PoW Jobs — Proof of Work

> A candidate-first job matching platform for finance and crypto professionals.
> Tell us who you are once. We score every open role against your real preferences
> — comp floor, jurisdiction, domain, token upside, dealbreakers — and only send
> what's worth your time. Silence when there's nothing good.

Live at **https://pow-jobs.vercel.app**.

This repo is the working product: Neon Postgres, passwordless magic-link auth,
a full profile editor with LinkedIn paste-import, a personalized matching feed,
a weekly email digest, and Telegram alerts — all wired into a daily Vercel Cron
that only sends roles that clear each user's personal precision floor.

---

## Quick start (local dev)

```bash
# 1. Install deps
npm install

# 2. Configure env vars
cp .env.example .env.local
# At minimum set DATABASE_URL (Neon) and AUTH_SECRET.
# Everything else has a dev-mode fallback (magic-link URL is logged to stdout
# if RESEND_API_KEY is unset, matcher uses structured scoring if no Claude key).

# 3. Create tables + seed 30 demo jobs + 3 demo personas
npm run migrate     # idempotent — safe to re-run
npm run seed        # demo jobs and personas

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

Sign in at `/signin` with any email address. In dev the magic-link URL is
printed to the server console and surfaced in the sign-in response so you can
click through without configuring Resend.

---

## What's in the app

### Candidate-facing surface
- `/` — landing
- `/signin` — email-only magic-link sign-in (Resend)
- `/profile` — full structured profile editor:
  - identity mode (real / pseudonym / wallet) + LinkedIn paste import
  - career (seniority band, years, comp floor, jurisdiction, remote, regulated, visa)
  - interests (domains, functions, tech stack)
  - hard filters (dealbreakers)
  - four weight sliders (comp / domain fit / team / token)
  - alert settings (email on/off, frequency daily|weekly|realtime, Telegram on/off + link flow)
- `/feed` — live matching; toggle between **Your feed** (signed-in user) and demo personas
- `/email-preview` — HTML preview of the weekly digest (with "silence week" toggle)
- `/admin` — raw data browser (admin-gated via `users.is_admin`)

### Behind the scenes
- `/api/auth/signin` → `/api/auth/verify` — magic-link flow, JWT session cookie
- `/api/profile` — PATCH the signed-in user's profile
- `/api/profile/linkedin-import` — paste About/Experience → structured patch
  (Claude if `ANTHROPIC_API_KEY` set, otherwise regex heuristics)
- `/api/profile/telegram-link` — rotate a one-time link token for the bot
- `/api/telegram/webhook` — Telegram bot webhook (`/start <token>` linking)
- `/api/match` — score jobs for a candidate
- `/api/cron/alerts` — daily dispatcher, called by Vercel Cron

---

## The matching pipeline

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
digest (email + Telegram, deduped per channel via sent_alerts)
```

The LLM judge is **optional by design** — no API key required to run the app.
A deterministic heuristic rationale is generated either way.

---

## Alerts

`vercel.json` registers two crons that hit `/api/cron/alerts`:

- **Daily** — `0 14 * * *` (14:00 UTC) for users with `alert_frequency = daily`
- **Weekly** — `0 14 * * 1` (Mondays 14:00 UTC) for `alert_frequency = weekly`

Per-channel dedup uses a `sent_alerts (candidate_id, job_id, channel)` unique
index, so a cron retry (or manual run) never sends the same role twice.

To trigger a single-user run manually (for testing):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://pow-jobs.vercel.app/api/cron/alerts?candidateId=<id>&dryRun=0"
```

---

## Telegram bot setup

1. Message `@BotFather` on Telegram → `/newbot` → copy the token.
2. Put the token in `TELEGRAM_BOT_TOKEN` (and the bot's public username, no `@`,
   in `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`).
3. Generate a webhook secret and register the webhook once:

   ```bash
   export TELEGRAM_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))")
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$APP_URL/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```

4. On the Profile page, users click **Generate link code** and follow the
   `t.me/<bot>?start=<code>` deep link. The webhook consumes the one-time code
   and stores the chat_id.

---

## Deploying

1. Create a **Neon** project (free tier) → copy the pooled connection string into
   `DATABASE_URL`.
2. Create a **Resend** project → add API key to `RESEND_API_KEY`. Either verify
   a sending domain, or use `onboarding@resend.dev` for the first 100 emails.
3. Generate `AUTH_SECRET` and `CRON_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
4. Push all env vars into the Vercel project (**Settings → Environment
   Variables**). `APP_URL` should be the canonical deploy URL.
5. Deploy. On first request the app calls `ensureSchema()` and creates all
   tables idempotently — no separate migration step needed for fresh projects.
   For existing projects, `npm run migrate` runs the same schema SQL.

See `.env.example` for the full variable checklist.

---

## Project layout

```
src/
  app/
    layout.tsx, page.tsx, globals.css
    signin/page.tsx                 magic-link sign-in
    profile/                        profile editor (auth required)
      page.tsx, ProfileEditor.tsx
    feed/                           personalized match feed
      page.tsx, FeedClient.tsx
    email-preview/page.tsx          digest preview
    admin/page.tsx                  admin-gated
    api/
      auth/{signin,verify,signout}/route.ts
      profile/{route,linkedin-import,telegram-link}/route.ts
      candidates/route.ts, jobs/route.ts, match/route.ts
      cron/alerts/route.ts          Vercel Cron target
      telegram/webhook/route.ts     Telegram bot webhook
  components/
    Nav.tsx, JobCard.tsx, ChipGroup.tsx, WeightSlider.tsx
  lib/
    types.ts                Candidate / Job / MatchScore / ...
    schema.ts               idempotent Postgres DDL
    db.ts                   Neon serverless wrapper
    auth.ts                 JWT session + cookie helpers
    mailer.ts               Resend wrapper (+ dev-mode stdout fallback)
    telegram.ts             Telegram Bot API wrapper
    alerts.ts               per-user dispatcher (email + Telegram)
    matching.ts             hard filters, structured score, precision floor
    llm.ts                  Claude API wrapper (optional)
    email.ts                inline-styled HTML digest renderer
    seed-data.ts            30 jobs + 3 demo personas
scripts/
  migrate.ts                npm run migrate — ensure schema
  seed.ts                   npm run seed    — demo data
vercel.json                 cron schedules
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on `:3000` |
| `npm run build` | Production build |
| `npm run migrate` | Run idempotent Postgres schema (creates tables if missing) |
| `npm run seed` | Insert 30 demo jobs + 3 demo candidates |
| `npm run typecheck` | `tsc --noEmit` |

## Demo personas

| Persona | Identity | Angle | Shape of matches |
|---|---|---|---|
| **0xHaru** | pseudonymous | Solidity/Rust founding engineer, 8 yr, global-remote, token-friendly | Heavy crypto-infra + DeFi, Jump Crypto / Uniswap / Symbiotic |
| **Priya Chen** | real name | Citadel quant researcher, 12 yr, US-only, no seed-stage, no unregulated | Pure TradFi — Citadel, Two Sigma, Point72, Millennium |
| **Marco Ferrari** | real name | Jane Street trader, 5 yr, hybrid, open to both worlds | Mixed — SIG / Jump Crypto / Wintermute |

## License

Prototype code — do as you like. PRD is in the repo root (`PoW-Jobs-PRD.docx`).
