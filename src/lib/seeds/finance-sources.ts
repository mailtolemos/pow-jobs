// Curated seed list of major finance / trading / VC / fintech career boards
// where the company exposes a clean public ATS we can ingest from (Ashby,
// Greenhouse, Lever). Many traditional banks and large hedge funds (Citadel,
// Bridgewater, Goldman, JPM, etc.) post via Workday or proprietary trackers
// that aren't supported here — those would need a generic-HTML scraper.
//
// As with the crypto list, individual entries may go stale; admins can
// delete any that 404 from /admin once they show up as failed fetches.

import type { SeedSource } from "./crypto-sources";

export const FINANCE_SEED_SOURCES: SeedSource[] = [
  // -------- Quant trading / prop / market-making (Greenhouse) --------
  { name: "Two Sigma",                 url: "https://boards.greenhouse.io/twosigma",            kind: "career-page", notes: "Quant fund, NYC" },
  { name: "Hudson River Trading",      url: "https://boards.greenhouse.io/hudsonrivertrading",  kind: "career-page", notes: "HFT" },
  { name: "Jump Trading",              url: "https://boards.greenhouse.io/jumptrading",         kind: "career-page", notes: "HFT, Chicago + crypto via Jump Crypto" },
  { name: "Optiver",                   url: "https://boards.greenhouse.io/optiver",             kind: "career-page", notes: "Market maker, AMS/CHI/Sydney" },
  { name: "Akuna Capital",             url: "https://boards.greenhouse.io/akunacapital",        kind: "career-page", notes: "Options market maker" },
  { name: "AQR Capital Management",    url: "https://boards.greenhouse.io/aqr",                 kind: "career-page", notes: "Systematic asset manager" },
  { name: "Citadel",                   url: "https://boards.greenhouse.io/citadel",             kind: "career-page", notes: "Multi-strategy hedge fund" },
  { name: "Citadel Securities",        url: "https://boards.greenhouse.io/citadelsecurities",   kind: "career-page", notes: "Market maker" },
  { name: "Millennium Management",     url: "https://boards.greenhouse.io/millennium",          kind: "career-page", notes: "Multi-manager hedge fund" },
  { name: "Point72",                   url: "https://boards.greenhouse.io/point72",             kind: "career-page", notes: "Multi-strategy hedge fund" },
  { name: "Wintermute",                url: "https://jobs.lever.co/wintermute",                 kind: "career-page", notes: "Crypto market making" },
  { name: "Flow Traders",              url: "https://boards.greenhouse.io/flowtraders",         kind: "career-page", notes: "ETP market maker" },
  { name: "Tower Research Capital",    url: "https://boards.greenhouse.io/towerresearchcapital", kind: "career-page", notes: "HFT" },

  // -------- Crypto-native trading (Greenhouse / Lever) --------
  { name: "GSR",                       url: "https://boards.greenhouse.io/gsr",                 kind: "career-page", notes: "Crypto market making, OTC" },
  { name: "FalconX",                   url: "https://boards.greenhouse.io/falconx",             kind: "career-page", notes: "Crypto prime broker" },
  { name: "Talos",                     url: "https://boards.greenhouse.io/talos",               kind: "career-page", notes: "Institutional crypto trading platform" },
  { name: "Amber Group",               url: "https://boards.greenhouse.io/ambergroup",          kind: "career-page", notes: "Crypto financial services" },

  // -------- Asset managers / brokers --------
  { name: "Grayscale",                 url: "https://boards.greenhouse.io/grayscaleinvestments", kind: "career-page", notes: "Crypto asset manager (BTC/ETH trusts)" },
  { name: "BitGo",                     url: "https://boards.greenhouse.io/bitgo",               kind: "career-page", notes: "Institutional custody" },
  { name: "Robinhood",                 url: "https://boards.greenhouse.io/robinhoodmarkets",    kind: "career-page", notes: "Retail brokerage / crypto" },

  // -------- Fintech / payments / infrastructure --------
  { name: "Stripe",                    url: "https://boards.greenhouse.io/stripe",              kind: "career-page", notes: "Payments infra" },
  { name: "Plaid",                     url: "https://boards.greenhouse.io/plaid",               kind: "career-page", notes: "Banking APIs" },
  { name: "Mercury",                   url: "https://boards.greenhouse.io/mercury",             kind: "career-page", notes: "Startup banking" },
  { name: "Brex",                      url: "https://boards.greenhouse.io/brex",                kind: "career-page", notes: "Corporate cards / fintech" },
  { name: "Ramp",                      url: "https://boards.greenhouse.io/ramp",                kind: "career-page", notes: "Spend management / fintech" },
  { name: "Wise",                      url: "https://boards.greenhouse.io/wise",                kind: "career-page", notes: "Cross-border payments" },

  // -------- VC / crypto-native investors --------
  { name: "Andreessen Horowitz (a16z)", url: "https://jobs.lever.co/a16z",                      kind: "career-page", notes: "Multi-stage tech VC, crypto fund" },
  { name: "Pantera Capital",           url: "https://boards.greenhouse.io/panteracapital",      kind: "career-page", notes: "Crypto-focused fund" },
  { name: "Multicoin Capital",         url: "https://boards.greenhouse.io/multicoincapital",    kind: "career-page", notes: "Crypto thesis fund" },
  { name: "Index Ventures",            url: "https://boards.greenhouse.io/indexventures",       kind: "career-page", notes: "Multi-stage VC" },
  { name: "Sequoia Capital",           url: "https://boards.greenhouse.io/sequoiacapital",      kind: "career-page", notes: "Tier-1 multi-stage VC" },
  { name: "Coatue",                    url: "https://boards.greenhouse.io/coatue",              kind: "career-page", notes: "Hedge fund / crossover VC" },
  { name: "Tiger Global",              url: "https://boards.greenhouse.io/tigerglobal",         kind: "career-page", notes: "Crossover hedge fund / VC" },
  { name: "Founders Fund",             url: "https://boards.greenhouse.io/foundersfund",        kind: "career-page", notes: "Multi-stage VC" },
  { name: "Greylock",                  url: "https://boards.greenhouse.io/greylockpartners",    kind: "career-page", notes: "Early-stage tech VC" },
  { name: "Lightspeed Venture Partners", url: "https://boards.greenhouse.io/lightspeedventurepartners", kind: "career-page", notes: "Multi-stage VC" },
  { name: "NEA",                       url: "https://boards.greenhouse.io/newenterpriseassociates", kind: "career-page", notes: "Multi-stage VC" },
  { name: "Accel",                     url: "https://boards.greenhouse.io/accel",               kind: "career-page", notes: "Multi-stage VC" },
  { name: "Bessemer Venture Partners", url: "https://boards.greenhouse.io/bessemervp",          kind: "career-page", notes: "Multi-stage VC" },
  { name: "IVP",                       url: "https://boards.greenhouse.io/institutionalventurepartners", kind: "career-page", notes: "Late-stage VC" },
  { name: "USV",                       url: "https://boards.greenhouse.io/usv",                 kind: "career-page", notes: "Union Square Ventures" },
  { name: "Bain Capital Ventures",     url: "https://boards.greenhouse.io/baincapitalventures", kind: "career-page", notes: "Multi-stage VC" },
  { name: "Insight Partners",          url: "https://boards.greenhouse.io/insightpartners",     kind: "career-page", notes: "Late-stage growth VC" },
  { name: "General Catalyst",          url: "https://boards.greenhouse.io/generalcatalyst",     kind: "career-page", notes: "Multi-stage VC" },
  { name: "Dragonfly Capital",         url: "https://jobs.lever.co/dragonflycap",               kind: "career-page", notes: "Crypto-focused VC" },
  { name: "Variant",                   url: "https://jobs.ashbyhq.com/variant",                 kind: "career-page", notes: "Crypto-focused VC" },

  // -------- Additional fintech / payments / brokers --------
  { name: "Block (Square)",            url: "https://boards.greenhouse.io/block",               kind: "career-page", notes: "Cash App, Square, Tidal" },
  { name: "Affirm",                    url: "https://boards.greenhouse.io/affirm",              kind: "career-page", notes: "BNPL fintech" },
  { name: "Klarna",                    url: "https://boards.greenhouse.io/klarna",              kind: "career-page", notes: "BNPL / payments" },
  { name: "Adyen",                     url: "https://boards.greenhouse.io/adyen",               kind: "career-page", notes: "Payments processor" },
  { name: "Marqeta",                   url: "https://boards.greenhouse.io/marqeta",             kind: "career-page", notes: "Card issuing platform" },
  { name: "Chime",                     url: "https://boards.greenhouse.io/chime",               kind: "career-page", notes: "Neobank" },
  { name: "Revolut",                   url: "https://boards.greenhouse.io/revolut",             kind: "career-page", notes: "Neobank / crypto" },
  { name: "N26",                       url: "https://boards.greenhouse.io/n26",                 kind: "career-page", notes: "Neobank" },
  { name: "Monzo",                     url: "https://boards.greenhouse.io/monzo",               kind: "career-page", notes: "UK neobank" },
  { name: "Nubank",                    url: "https://boards.greenhouse.io/nubank",              kind: "career-page", notes: "LATAM neobank" },
  { name: "SoFi",                      url: "https://boards.greenhouse.io/sofi",                kind: "career-page", notes: "Consumer fintech" },
  { name: "eToro",                     url: "https://boards.greenhouse.io/etoro",               kind: "career-page", notes: "Social trading platform" },
  { name: "Coinmarketcap",             url: "https://boards.greenhouse.io/coinmarketcap",       kind: "career-page", notes: "Crypto data / Binance" },

  // -------- More top-tier prop / quant / HFT --------
  { name: "Susquehanna (SIG)",         url: "https://jobs.lever.co/susquehannainternational",   kind: "career-page", notes: "Options market making, prop" },
  { name: "Five Rings",                url: "https://boards.greenhouse.io/fiverings",           kind: "career-page", notes: "Quant prop trading" },
  { name: "PDT Partners",              url: "https://boards.greenhouse.io/pdtpartners",         kind: "career-page", notes: "Quant hedge fund (Morgan Stanley spinout)" },
  { name: "Squarepoint Capital",       url: "https://boards.greenhouse.io/squarepoint",         kind: "career-page", notes: "Quant hedge fund" },
  { name: "Voloridge Investment",      url: "https://jobs.lever.co/voloridge",                  kind: "career-page", notes: "Quant macro / equities" },
  { name: "Headlands Tech",            url: "https://boards.greenhouse.io/headlandstechnologies", kind: "career-page", notes: "HFT / market making" },
  { name: "Belvedere Trading",         url: "https://boards.greenhouse.io/belvederetrading",    kind: "career-page", notes: "Options prop, Chicago" },
  { name: "Maven Securities",          url: "https://jobs.lever.co/mavensecurities",            kind: "career-page", notes: "London prop / market making" },

  // -------- More hedge / asset managers --------
  { name: "Marshall Wace",             url: "https://boards.greenhouse.io/marshallwace",        kind: "career-page", notes: "Multi-strategy hedge fund, London" },
  { name: "ExodusPoint",               url: "https://boards.greenhouse.io/exoduspoint",         kind: "career-page", notes: "Multi-manager hedge fund" },
  { name: "Schonfeld",                 url: "https://boards.greenhouse.io/schonfeld",           kind: "career-page", notes: "Multi-strategy hedge fund" },
  { name: "Balyasny",                  url: "https://boards.greenhouse.io/balyasnyassetmanagement", kind: "career-page", notes: "Multi-strategy hedge fund" },
  { name: "Capula Investment",         url: "https://boards.greenhouse.io/capulainvestment",    kind: "career-page", notes: "Macro / fixed income hedge fund" },
  { name: "Brevan Howard",             url: "https://boards.greenhouse.io/brevanhoward",        kind: "career-page", notes: "Macro hedge fund" },

  // -------- VCs / asset managers --------
  { name: "a16z",                      url: "https://boards.greenhouse.io/a16z",                kind: "career-page", notes: "Andreessen Horowitz" },
  { name: "Sequoia Capital",           url: "https://jobs.ashbyhq.com/sequoiacap",              kind: "career-page", notes: "Sequoia US" },
  { name: "Founders Fund",             url: "https://jobs.lever.co/foundersfund",               kind: "career-page", notes: "Founders Fund VC" },
  { name: "Lightspeed",                url: "https://boards.greenhouse.io/lightspeedventurepartners", kind: "career-page", notes: "Lightspeed Venture Partners" },
  { name: "General Catalyst",          url: "https://boards.greenhouse.io/generalcatalyst",     kind: "career-page", notes: "GC VC" },
  { name: "Pantera Capital",           url: "https://boards.greenhouse.io/panteracapital",      kind: "career-page", notes: "Crypto VC" },
  { name: "Apollo",                    url: "https://boards.greenhouse.io/apolloglobalmanagement", kind: "career-page", notes: "Apollo Global Management" },
  { name: "Carlyle",                   url: "https://boards.greenhouse.io/carlyle",             kind: "career-page", notes: "Private equity" },
  { name: "Blackstone",                url: "https://boards.greenhouse.io/blackstone",          kind: "career-page", notes: "Alternative asset manager" },

  // -------- More fintechs --------
  { name: "Wise",                      url: "https://boards.greenhouse.io/wise",                kind: "career-page", notes: "Cross-border payments" },
  { name: "Klarna",                    url: "https://boards.greenhouse.io/klarna",              kind: "career-page", notes: "BNPL" },
  { name: "Adyen",                     url: "https://boards.greenhouse.io/adyen",               kind: "career-page", notes: "Payments" },
  { name: "Checkout.com",              url: "https://boards.greenhouse.io/checkout",            kind: "career-page", notes: "Payments infrastructure" },
  { name: "Modern Treasury",           url: "https://jobs.ashbyhq.com/moderntreasury",          kind: "career-page", notes: "Payment ops API" },
  { name: "Tradeweb",                  url: "https://boards.greenhouse.io/tradeweb",            kind: "career-page", notes: "Electronic fixed-income trading" },
];
