import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">
          Proof of Work · Alpha
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-ink leading-tight tracking-tight">
          The job engine that <span className="text-accent">remembers you</span>.
        </h1>
        <p className="text-lg text-neutral-600 mt-6 leading-relaxed">
          PoW Jobs is a candidate-first matching platform for finance and crypto professionals. Tell us who you are once.
          We score every open role against your real preferences — comp floor, jurisdiction, domain, token upside, dealbreakers —
          and only send you what's actually worth your time. No noise. Silence when there's nothing good.
        </p>

        <div className="mt-10 flex gap-3">
          <Link
            href="/onboarding"
            className="px-5 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent2 transition"
          >
            Start onboarding →
          </Link>
          <Link
            href="/feed"
            className="px-5 py-3 bg-white border border-neutral-300 text-ink font-semibold rounded-lg hover:border-neutral-400 transition"
          >
            View demo feed
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6">
          <Feature
            title="Structured, not scraped"
            body="Every role is parsed into a schema with comp bands, token percentage, jurisdiction, regulated status, vesting. Matching is over structure, not keywords."
          />
          <Feature
            title="Precision over recall"
            body="Each candidate has a precision floor. If no role clears it in a given week, we send silence — not a filler list. Unsubscribe rates stay low."
          />
          <Feature
            title="Bilingual in both worlds"
            body="A crypto-DeFi engineer looking at quant shops, or a Jane Street trader curious about Jump Crypto — we handle the cross-domain case that Getro and LinkedIn miss."
          />
        </div>

        <div className="mt-20 pt-10 border-t border-neutral-200 text-sm text-neutral-500">
          This is a working prototype. The matching pipeline (hard filters → structured score → optional Claude LLM-as-judge → precision floor)
          runs on 30 demo roles across crypto and finance with 3 candidate personas. See <Link href="/admin" className="underline">admin</Link> for data.
        </div>
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-semibold text-ink mb-2">{title}</div>
      <div className="text-sm text-neutral-600 leading-relaxed">{body}</div>
    </div>
  );
}
