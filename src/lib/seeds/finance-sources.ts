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
];
