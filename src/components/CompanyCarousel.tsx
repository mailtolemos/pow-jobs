// Infinite-scroll trust-bar of company logos sourced from our seed lists.
//
// Logo source: Clearbit's free API was retired after the 2024 HubSpot
// acquisition (returns empty bytes), so we use DuckDuckGo's icons CDN
// (https://icons.duckduckgo.com/ip3/<domain>.ico) which serves real
// favicons unauthenticated. If a domain returns nothing, we fall back to
// Google's S2 favicons API, and finally to a clean text pill.
//
// Each item is rendered as `<icon> CompanyName` so the row reads as a
// trust bar even when a favicon is only 16-32px — the wordmark carries
// the recognition.

"use client";

import { useState } from "react";

interface Company {
  name: string;
  domain: string;
}

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
  // Render the list twice back-to-back so the marquee can scroll seamlessly:
  // when the first half exits the viewport, the second is already in view
  // and the keyframe loops to start.
  const loop = [...COMPANIES, ...COMPANIES];

  return (
    <section className="border-t border-b border-line bg-surface/40">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted font-semibold mb-6 text-center">
          Trusted across tech, crypto &amp; finance
        </div>
      </div>
      {/* Edge fade so logos drift in/out instead of clipping hard at the page edge. */}
      <div className="relative overflow-hidden pb-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-24 bg-gradient-to-r from-paper to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-24 bg-gradient-to-l from-paper to-transparent z-10" />
        <div className="flex gap-6 marquee items-center">
          {loop.map((c, idx) => (
            <CompanyPill key={`${c.domain}-${idx}`} company={c} />
          ))}
        </div>
      </div>
      {/* Inlined keyframes so the component is self-contained — copy-paste
          ready with no global CSS dependency. 60s scroll is calm; pause on
          hover lets users actually read a logo they're curious about. */}
      <style jsx>{`
        .marquee {
          animation: prowo-marquee 70s linear infinite;
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

function CompanyPill({ company }: { company: Company }) {
  // Two-step fallback: DuckDuckGo's icon CDN serves real favicons
  // unauthenticated. If that fails (rare, but happens for newer brands),
  // we fall back to Google's S2 favicons. Final fallback: hide the icon
  // and render just the wordmark so the row never breaks.
  const sources = [
    `https://icons.duckduckgo.com/ip3/${company.domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`,
  ];
  const [sourceIdx, setSourceIdx] = useState(0);
  const [iconHidden, setIconHidden] = useState(false);

  function handleError() {
    if (sourceIdx < sources.length - 1) {
      setSourceIdx((i) => i + 1);
    } else {
      setIconHidden(true);
    }
  }

  return (
    <div
      className="shrink-0 h-12 flex items-center gap-2.5 px-4 rounded-xl bg-paper/70 border border-line/60"
      title={company.name}
    >
      {!iconHidden && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sources[sourceIdx]}
          alt=""
          loading="lazy"
          onError={handleError}
          className="w-6 h-6 object-contain rounded-sm"
        />
      )}
      <span className="text-sm font-semibold text-ink/90 whitespace-nowrap">
        {company.name}
      </span>
    </div>
  );
}
