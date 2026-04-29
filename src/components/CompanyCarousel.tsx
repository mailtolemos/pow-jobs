// Infinite-scroll marquee of company logos sourced from our seed lists.
// Uses Clearbit's free Logo API (logo.clearbit.com/<domain>) — no API key
// needed, ~10kb per logo, gracefully falls back to a text pill if a logo
// 404s. The list is split tech / crypto / finance and pulled from the
// same seeds that feed the ingest engine, so the marquee always reflects
// who we actually surface jobs for.

"use client";

import { useState } from "react";

interface Company {
  name: string;
  domain: string; // for Clearbit logo lookup
}

// Curated subset of the seed sources — the most recognisable names from each
// vertical. We keep this hand-picked rather than auto-generating because
// some logos (foundations, sub-brands, abbreviations) render poorly via
// Clearbit and we'd rather miss them than show a generic letter tile.
const COMPANIES: Company[] = [
  // --- Tech / AI ---
  { name: "OpenAI", domain: "openai.com" },
  { name: "Anthropic", domain: "anthropic.com" },
  { name: "Mistral AI", domain: "mistral.ai" },
  { name: "Hugging Face", domain: "huggingface.co" },
  { name: "Cohere", domain: "cohere.com" },
  { name: "Perplexity", domain: "perplexity.ai" },
  { name: "Databricks", domain: "databricks.com" },
  { name: "Snowflake", domain: "snowflake.com" },
  { name: "Cloudflare", domain: "cloudflare.com" },
  { name: "Vercel", domain: "vercel.com" },
  { name: "Stripe", domain: "stripe.com" },
  { name: "Notion", domain: "notion.so" },
  { name: "Figma", domain: "figma.com" },
  { name: "Linear", domain: "linear.app" },
  { name: "GitLab", domain: "gitlab.com" },
  { name: "HashiCorp", domain: "hashicorp.com" },
  { name: "MongoDB", domain: "mongodb.com" },
  { name: "Datadog", domain: "datadoghq.com" },
  { name: "Twilio", domain: "twilio.com" },
  { name: "Atlassian", domain: "atlassian.com" },
  { name: "Slack", domain: "slack.com" },

  // --- Crypto / Web3 ---
  { name: "Coinbase", domain: "coinbase.com" },
  { name: "Kraken", domain: "kraken.com" },
  { name: "Circle", domain: "circle.com" },
  { name: "Chainalysis", domain: "chainalysis.com" },
  { name: "Uniswap", domain: "uniswap.org" },
  { name: "OpenSea", domain: "opensea.io" },
  { name: "Polygon", domain: "polygon.technology" },
  { name: "Ava Labs", domain: "avax.network" },
  { name: "Aptos Labs", domain: "aptoslabs.com" },
  { name: "Mysten Labs", domain: "mystenlabs.com" },
  { name: "Solana", domain: "solana.com" },
  { name: "Phantom", domain: "phantom.app" },
  { name: "Magic Eden", domain: "magiceden.io" },
  { name: "Chainlink", domain: "chain.link" },
  { name: "Alchemy", domain: "alchemy.com" },
  { name: "ConsenSys", domain: "consensys.io" },
  { name: "Fireblocks", domain: "fireblocks.com" },
  { name: "Anchorage", domain: "anchorage.com" },
  { name: "Crypto.com", domain: "crypto.com" },
  { name: "OKX", domain: "okx.com" },

  // --- Finance / Trading / Banking ---
  { name: "Citadel", domain: "citadel.com" },
  { name: "Citadel Securities", domain: "citadelsecurities.com" },
  { name: "Two Sigma", domain: "twosigma.com" },
  { name: "Jane Street", domain: "janestreet.com" },
  { name: "Jump Trading", domain: "jumptrading.com" },
  { name: "Hudson River Trading", domain: "hudsonrivertrading.com" },
  { name: "Optiver", domain: "optiver.com" },
  { name: "DRW", domain: "drw.com" },
  { name: "Akuna Capital", domain: "akunacapital.com" },
  { name: "AQR", domain: "aqr.com" },
  { name: "Millennium", domain: "mlp.com" },
  { name: "Point72", domain: "point72.com" },
  { name: "Bridgewater", domain: "bridgewater.com" },
  { name: "Wintermute", domain: "wintermute.com" },
  { name: "GSR", domain: "gsr.io" },
  { name: "Robinhood", domain: "robinhood.com" },
  { name: "Plaid", domain: "plaid.com" },
  { name: "Mercury", domain: "mercury.com" },
  { name: "Brex", domain: "brex.com" },
  { name: "Ramp", domain: "ramp.com" },
];

export function CompanyCarousel() {
  // Render the list twice back-to-back so the marquee can scroll seamlessly
  // — when the first half exits the viewport, the second is already in
  // place and the keyframe loops to start.
  const loop = [...COMPANIES, ...COMPANIES];

  return (
    <section className="border-t border-b border-line bg-surface/40">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted font-semibold mb-5 text-center">
          Trusted across tech, crypto &amp; finance
        </div>
      </div>
      {/* Edge fade so logos drift in/out instead of clipping hard at the page edge. */}
      <div className="relative overflow-hidden pb-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-paper to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper to-transparent z-10" />
        <div className="flex gap-10 marquee items-center">
          {loop.map((c, idx) => (
            <CompanyLogo key={`${c.domain}-${idx}`} company={c} />
          ))}
        </div>
      </div>
      {/* Keyframes inlined so the component is self-contained — copy the
          marquee with no global CSS dependency. Animation duration is wide
          (60s) so the scroll is calm, not gimmicky. Pause on hover lets
          users actually see a logo they're curious about. */}
      <style jsx>{`
        .marquee {
          animation: prowo-marquee 60s linear infinite;
          width: max-content;
        }
        .marquee:hover {
          animation-play-state: paused;
        }
        @keyframes prowo-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

function CompanyLogo({ company }: { company: Company }) {
  const [errored, setErrored] = useState(false);
  // Clearbit's logo API is free for open-source / dev use and works
  // unauthenticated. ?size=128 gives us a crisp display at the 28px
  // rendered height we use.
  const src = `https://logo.clearbit.com/${company.domain}?size=128`;
  return (
    <div
      className="shrink-0 h-10 flex items-center justify-center px-3 rounded-md bg-paper/70 border border-line/40"
      title={company.name}
    >
      {errored ? (
        <span className="text-xs font-semibold text-muted whitespace-nowrap">{company.name}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={company.name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="max-h-7 w-auto object-contain opacity-90 hover:opacity-100 transition"
        />
      )}
    </div>
  );
}
