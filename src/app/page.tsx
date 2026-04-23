import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      {/* HERO ----------------------------------------------------------- */}
      <section className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-4">
            Find your next move.
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-ink leading-[1.05] tracking-tight max-w-3xl">
            Find your next job in{" "}
            <span className="text-accent">crypto & finance</span>.
          </h1>
          <p className="text-lg text-muted mt-6 leading-relaxed max-w-2xl">
            Pablo Jobs connects top talent with the fastest-growing companies in crypto, fintech, and global finance.
            No spam. No outdated listings. Just real opportunities from real companies.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/feed"
              className="px-5 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent2 transition shadow-soft"
            >
              Browse jobs →
            </Link>
            <Link
              href="/onboarding"
              className="px-5 py-3 bg-surface border border-line text-ink font-semibold rounded-lg hover:border-accent transition"
            >
              Post a job
            </Link>
          </div>

          <div className="mt-12 text-xs text-muted flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>Curated by humans</span>
            <span className="text-line">·</span>
            <span>Updated daily</span>
            <span className="text-line">·</span>
            <span>Built for the next generation of finance</span>
          </div>
        </div>
      </section>

      {/* VALUE PROPS ---------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-8 md:gap-10">
          <ValueProp
            icon="⚡"
            title="Curated Roles"
            body="Only high-quality opportunities from vetted companies. Every listing is parsed into a real schema — comp bands, token upside, jurisdiction, vesting, dealbreakers."
          />
          <ValueProp
            icon="🌍"
            title="Global & Remote"
            body="Work from anywhere. Crypto doesn't sleep — and neither do opportunities. From Lisbon to Lagos, Tokyo to Toronto."
          />
          <ValueProp
            icon="📈"
            title="Career Growth"
            body="From early-stage startups to top-tier funds, find roles that actually move your career forward. We match on upside, not just keywords."
          />
        </div>
      </section>

      {/* FOR CANDIDATES ------------------------------------------------- */}
      <section className="border-t border-line bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-3">
              For candidates
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight leading-tight">
              Don&rsquo;t just get a job &mdash; get an edge.
            </h2>
            <p className="text-muted mt-5 leading-relaxed">
              Discover roles across engineering, trading, research, design, marketing, and operations in
              the most exciting sector in finance. We score every open role against your real preferences
              &mdash; comp floor, jurisdiction, domain, token upside, dealbreakers &mdash; and only send
              you what&rsquo;s actually worth your time.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/signin?next=/profile"
                className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent2 transition text-sm"
              >
                Build your profile
              </Link>
              <Link
                href="/feed"
                className="px-4 py-2 border border-line text-ink font-semibold rounded-lg hover:border-accent transition text-sm"
              >
                See the feed
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            <Bullet text="Your next job is probably in crypto. You just haven't seen it yet." />
            <Bullet text="Stop scrolling job boards. Start finding signal." />
            <Bullet text="Silence when there's nothing good — not a filler list." />
            <Bullet text="Pseudonymous profiles welcome. Your wallet can be your resume." />
          </div>
        </div>
      </section>

      {/* FOR COMPANIES -------------------------------------------------- */}
      <section className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-start">
          <div className="md:order-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-3">
              For companies
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight leading-tight">
              Hire people who already speak crypto.
            </h2>
            <p className="text-muted mt-5 leading-relaxed">
              Reach a targeted pool of candidates who understand the space &mdash; no noise, just signal.
              Plug your Ashby, Greenhouse, or Lever board straight in. Every role gets classified,
              ranked against real candidate profiles, and only surfaces for people it actually fits.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/onboarding"
                className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent2 transition text-sm"
              >
                Post a job
              </Link>
              <Link
                href="/admin"
                className="px-4 py-2 border border-line text-ink font-semibold rounded-lg hover:border-accent transition text-sm"
              >
                Connect your board
              </Link>
            </div>
          </div>
          <div className="md:order-1 grid gap-3">
            <Bullet text="Ashby, Greenhouse, Lever, RSS, custom HTML — we ingest it all." />
            <Bullet text="Every role classified: domain, seniority, tech stack, token upside." />
            <Bullet text="LLM-judged matches so your listing only reaches the right people." />
            <Bullet text="Daily email + Telegram alerts hit candidates where they already are." />
          </div>
        </div>
      </section>

      {/* FOOTER --------------------------------------------------------- */}
      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white text-[10px] font-bold">
              PJ
            </div>
            <span className="font-semibold text-ink">Pablo Jobs</span>
          </div>
          <div className="text-xs">Built for the next generation of finance.</div>
          <div className="flex gap-4 text-xs">
            <Link href="/feed" className="hover:text-ink transition">
              Browse
            </Link>
            <Link href="/onboarding" className="hover:text-ink transition">
              Post a job
            </Link>
            <Link href="/signin" className="hover:text-ink transition">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

function ValueProp({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-6 shadow-soft">
      <div className="text-2xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <div className="font-bold text-ink text-lg mb-2 tracking-tight">{title}</div>
      <div className="text-sm text-muted leading-relaxed">{body}</div>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 bg-surface/40 border border-line/60 rounded-xl px-4 py-3">
      <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
      <span className="text-sm text-ink/90 leading-relaxed">{text}</span>
    </div>
  );
}
