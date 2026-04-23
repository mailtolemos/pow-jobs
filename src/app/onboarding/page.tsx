import Link from "next/link";

const STEPS = [
  {
    k: "identity",
    title: "1. Identity mode",
    body: "Real name, pseudonym (Farcaster / ENS), or wallet-first. We treat all three as equal citizens — pseudonymous candidates should not be second class.",
    demo: "Demo candidates: 0xHaru (pseudonym), Priya Chen (real), Marco Ferrari (real).",
  },
  {
    k: "signals",
    title: "2. Verifiable signals",
    body: "Optional: link GitHub, Farcaster, LinkedIn, a public wallet, or upload a PDF offer letter (your last comp anchor — never shared, used only to calibrate your comp floor).",
    demo: "Seeded candidates include a mix of LinkedIn and GitHub URLs; offer upload is simulated.",
  },
  {
    k: "preferences",
    title: "3. Preferences & hard filters",
    body: "Comp floor. Jurisdiction constraints. Remote policy. Visa status. Regulated OK or not. Tech stack. Functions & domains of interest. Free-form dealbreakers.",
    demo: "E.g. Priya's dealbreakers: ['stage:seed', 'unregulated']. These short-circuit the match.",
  },
  {
    k: "weights",
    title: "4. Weights",
    body: "Four sliders: comp, domain fit, team quality, token upside. These tune the structured score and feed the LLM judge.",
    demo: "0xHaru weights: token=0.9. Priya weights: team=0.9. Marco weights: comp=0.9.",
  },
  {
    k: "swipe",
    title: "5. 20-job calibration swipe",
    body: "Fast-forward cold start: we show you 20 synthetic job cards across the space. Thumbs up / down. This seeds your preferences with same-day signal.",
    demo: "Not rendered in this demo, but the same swipe state updates weights + dealbreakers.",
  },
  {
    k: "digest",
    title: "6. Digest cadence",
    body: "Weekly by default. With precision floor on, you'll sometimes get zero matches — that's correct behavior, not a bug.",
    demo: "See /email-preview for a rendered weekly digest and a 'no matches' week.",
  },
];

export default function OnboardingPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted mb-3">Onboarding walkthrough</div>
      <h1 className="text-4xl font-bold text-ink">Six steps. No forms for forms' sake.</h1>
      <p className="text-muted mt-3 leading-relaxed">
        We ask once, deeply — then we stop asking. Every answer feeds a structured schema that the matching engine uses
        forever. This page shows what onboarding covers in the real product, with examples from the demo candidates.
      </p>

      <div className="mt-10 space-y-6">
        {STEPS.map((s) => (
          <div key={s.k} className="bg-surface border border-line rounded-xl p-5">
            <div className="font-semibold text-ink">{s.title}</div>
            <div className="mt-2 text-sm text-ink/90 leading-relaxed">{s.body}</div>
            <div className="mt-3 text-xs text-muted italic">{s.demo}</div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link
          href="/feed"
          className="inline-block px-5 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent2"
        >
          See the feed →
        </Link>
      </div>
    </div>
  );
}
