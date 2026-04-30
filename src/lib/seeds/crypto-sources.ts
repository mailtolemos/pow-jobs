// Curated seed list of crypto / web3 / on-chain finance career boards from
// among the top market-cap names. Each entry maps to a known public ATS so
// the ingest engine can pull structured data via the well-known APIs we
// already support (Ashby, Greenhouse, Lever) — no scraping needed.
//
// The list is opinionated rather than exhaustive: ~30 well-known projects
// where the bot can fetch listings cleanly. Admins can delete any source
// they don't want from /admin after seeding.
//
// If a slug 404s on its first fetch, the source can simply be removed.

export interface SeedSource {
  name: string;
  url: string;
  kind: "career-page";
  notes?: string;
}

export const CRYPTO_SEED_SOURCES: SeedSource[] = [
  // -------- Greenhouse boards --------
  { name: "Coinbase",            url: "https://boards.greenhouse.io/coinbase",            kind: "career-page", notes: "L1 retail/institutional, fintech-heavy" },
  { name: "Kraken",              url: "https://boards.greenhouse.io/kraken",              kind: "career-page", notes: "Centralized exchange" },
  { name: "Circle",              url: "https://boards.greenhouse.io/circle",              kind: "career-page", notes: "USDC issuer" },
  { name: "Anchorage Digital",   url: "https://boards.greenhouse.io/anchorage",           kind: "career-page", notes: "Crypto bank, regulated" },
  { name: "Chainalysis",         url: "https://boards.greenhouse.io/chainalysis",         kind: "career-page", notes: "On-chain analytics" },
  { name: "ConsenSys",           url: "https://boards.greenhouse.io/consensys",           kind: "career-page", notes: "MetaMask, Infura, Linea" },
  { name: "OpenSea",             url: "https://boards.greenhouse.io/opensea",             kind: "career-page", notes: "NFT marketplace" },
  { name: "Uniswap Labs",        url: "https://boards.greenhouse.io/uniswaplabs",         kind: "career-page", notes: "DEX protocol team" },
  { name: "Polygon Labs",        url: "https://boards.greenhouse.io/polygontechnology",   kind: "career-page", notes: "L2 / zk infra" },
  { name: "Ava Labs",            url: "https://boards.greenhouse.io/avalabs",             kind: "career-page", notes: "Avalanche L1" },
  { name: "Worldcoin",           url: "https://boards.greenhouse.io/toolsforhumanity",    kind: "career-page", notes: "Tools for Humanity / WLD" },
  { name: "Aptos Labs",          url: "https://boards.greenhouse.io/aptoslabs",           kind: "career-page", notes: "L1 (Move VM)" },
  { name: "Mysten Labs",         url: "https://boards.greenhouse.io/mystenlabs",          kind: "career-page", notes: "Sui L1" },
  { name: "Ondo Finance",        url: "https://boards.greenhouse.io/ondofinance",         kind: "career-page", notes: "Tokenized treasuries" },
  { name: "Gemini",              url: "https://boards.greenhouse.io/gemini",              kind: "career-page", notes: "Centralized exchange" },
  { name: "Bitwise",             url: "https://boards.greenhouse.io/bitwiseassetmanagement", kind: "career-page", notes: "Crypto asset manager" },
  { name: "Galaxy Digital",      url: "https://boards.greenhouse.io/galaxydigitalservices", kind: "career-page", notes: "Crypto IB / trading" },
  { name: "Fireblocks",          url: "https://boards.greenhouse.io/fireblocks",          kind: "career-page", notes: "Custody infrastructure" },
  { name: "Ledger",              url: "https://boards.greenhouse.io/ledger",              kind: "career-page", notes: "Hardware wallets" },
  { name: "Stellar Development Foundation", url: "https://boards.greenhouse.io/stellar",  kind: "career-page", notes: "XLM ecosystem" },
  { name: "Algorand Foundation", url: "https://boards.greenhouse.io/algorandfoundation",  kind: "career-page", notes: "ALGO ecosystem" },
  { name: "Paradigm",            url: "https://boards.greenhouse.io/paradigm",            kind: "career-page", notes: "Crypto-native VC + research" },

  // -------- Ashby boards --------
  { name: "Solana Foundation",   url: "https://jobs.ashbyhq.com/Solana%20Foundation",     kind: "career-page", notes: "SOL ecosystem" },
  { name: "Douro Labs",          url: "https://jobs.ashbyhq.com/dourolabs.xyz",           kind: "career-page", notes: "Pyth Network team" },
  { name: "Phantom",             url: "https://jobs.ashbyhq.com/phantom",                 kind: "career-page", notes: "Multi-chain wallet" },
  { name: "Helius",              url: "https://jobs.ashbyhq.com/helius",                  kind: "career-page", notes: "Solana RPC + APIs" },
  { name: "Magic Eden",          url: "https://jobs.ashbyhq.com/magiceden",               kind: "career-page", notes: "NFT marketplace" },
  { name: "Aevo",                url: "https://jobs.ashbyhq.com/aevo",                    kind: "career-page", notes: "Onchain options exchange" },

  // -------- Lever boards --------
  { name: "Yuga Labs",           url: "https://jobs.lever.co/yugalabs",                   kind: "career-page", notes: "BAYC, ApeCoin ecosystem" },

  // -------- Additional Greenhouse boards --------
  { name: "Alchemy",             url: "https://boards.greenhouse.io/alchemy",             kind: "career-page", notes: "Web3 dev infrastructure" },
  { name: "QuickNode",           url: "https://boards.greenhouse.io/quicknode",           kind: "career-page", notes: "Blockchain RPC infra" },
  { name: "Chainlink Labs",      url: "https://boards.greenhouse.io/chainlinklabs",       kind: "career-page", notes: "Oracle network, LINK" },
  { name: "0x Labs",             url: "https://boards.greenhouse.io/0x",                  kind: "career-page", notes: "DEX aggregation, Matcha" },
  { name: "Immutable",           url: "https://boards.greenhouse.io/immutable",           kind: "career-page", notes: "Web3 gaming infrastructure" },
  { name: "Sky Mavis",           url: "https://boards.greenhouse.io/skymavis",            kind: "career-page", notes: "Axie Infinity, Ronin" },
  { name: "DFINITY",             url: "https://boards.greenhouse.io/dfinity",             kind: "career-page", notes: "Internet Computer (ICP)" },
  { name: "Web3 Foundation",     url: "https://boards.greenhouse.io/web3foundation",      kind: "career-page", notes: "Polkadot ecosystem" },
  { name: "Near Foundation",     url: "https://boards.greenhouse.io/nearfoundation",      kind: "career-page", notes: "NEAR L1" },
  { name: "Cosmos / Ignite",     url: "https://boards.greenhouse.io/ignite",              kind: "career-page", notes: "Cosmos SDK, ATOM" },
  { name: "Trust Wallet",        url: "https://boards.greenhouse.io/trustwallet",         kind: "career-page", notes: "Multi-chain wallet" },
  { name: "Rainbow",             url: "https://jobs.lever.co/rainbow",                    kind: "career-page", notes: "Ethereum wallet" },
  { name: "Privy",               url: "https://jobs.ashbyhq.com/privy.io",                kind: "career-page", notes: "Embedded wallets / auth" },
  { name: "Tenderly",            url: "https://boards.greenhouse.io/tenderly",            kind: "career-page", notes: "Web3 dev tools" },
  { name: "Arweave / Permaweb",  url: "https://jobs.ashbyhq.com/forwardresearch",         kind: "career-page", notes: "Permanent storage / AO" },
  { name: "Lava Network",        url: "https://jobs.ashbyhq.com/lavanetwork",             kind: "career-page", notes: "Cross-chain RPC" },
  { name: "Layer Zero",          url: "https://jobs.ashbyhq.com/layerzero",               kind: "career-page", notes: "Cross-chain messaging" },
  { name: "Wormhole",            url: "https://jobs.ashbyhq.com/wormhole",                kind: "career-page", notes: "Cross-chain protocol" },
  { name: "Eigen Labs",          url: "https://jobs.ashbyhq.com/eigenlabs",               kind: "career-page", notes: "EigenLayer (restaking)" },
  { name: "Lido",                url: "https://jobs.lever.co/lido",                       kind: "career-page", notes: "ETH liquid staking" },
  { name: "MakerDAO / Sky",      url: "https://jobs.lever.co/sky-protocol",               kind: "career-page", notes: "DAI / USDS issuer" },
  { name: "Aave Companies",      url: "https://jobs.lever.co/aave",                       kind: "career-page", notes: "Aave protocol" },
  { name: "Crypto.com",          url: "https://boards.greenhouse.io/crypto",              kind: "career-page", notes: "Centralized exchange" },
  { name: "Bybit",               url: "https://boards.greenhouse.io/bybit",               kind: "career-page", notes: "Centralized exchange" },
  { name: "OKX",                 url: "https://boards.greenhouse.io/okx",                 kind: "career-page", notes: "Centralized exchange + Web3 wallet" },
  { name: "Argent",              url: "https://jobs.lever.co/argent",                     kind: "career-page", notes: "Smart wallets, StarkNet" },
  { name: "Status",              url: "https://jobs.lever.co/status",                     kind: "career-page", notes: "Messaging + wallet, Logos" },

  // -------- More top-cap protocols + L2s --------
  { name: "StarkWare",           url: "https://www.starkware.co/careers/",                kind: "career-page", notes: "STARK proofs, StarkNet" },
  { name: "Matter Labs",         url: "https://jobs.lever.co/matter-labs",                kind: "career-page", notes: "zkSync" },
  { name: "Scroll",              url: "https://jobs.lever.co/scroll",                     kind: "career-page", notes: "zkEVM L2" },
  { name: "Optimism",            url: "https://boards.greenhouse.io/optimism",            kind: "career-page", notes: "OP Stack, Superchain" },
  { name: "Arbitrum (Offchain Labs)", url: "https://jobs.lever.co/offchainlabs",          kind: "career-page", notes: "Arbitrum One / Nova / Orbit" },
  { name: "Base (Coinbase)",     url: "https://boards.greenhouse.io/coinbase",            kind: "career-page", notes: "Same Coinbase board, Base team" },
  { name: "Sui Foundation",      url: "https://jobs.ashbyhq.com/suifoundation",           kind: "career-page", notes: "SUI ecosystem" },
  { name: "Mantle",              url: "https://jobs.lever.co/mantle",                     kind: "career-page", notes: "BitDAO L2" },
  { name: "Linea (ConsenSys)",   url: "https://boards.greenhouse.io/consensys",           kind: "career-page", notes: "Linea zkEVM" },
  { name: "Berachain",           url: "https://jobs.ashbyhq.com/berachain",               kind: "career-page", notes: "POL L1" },
  { name: "Movement Labs",       url: "https://jobs.ashbyhq.com/movementlabs",            kind: "career-page", notes: "Move-based L2" },
  { name: "Monad Labs",          url: "https://jobs.ashbyhq.com/monad",                   kind: "career-page", notes: "Parallel-EVM L1" },

  // -------- More DeFi / DEX / lending --------
  { name: "Compound Labs",       url: "https://jobs.lever.co/compoundlabs",               kind: "career-page", notes: "Money market protocol" },
  { name: "Curve Finance",       url: "https://jobs.lever.co/curve",                      kind: "career-page", notes: "Stable AMM" },
  { name: "GMX",                 url: "https://jobs.lever.co/gmx",                        kind: "career-page", notes: "Perp DEX" },
  { name: "dYdX",                url: "https://boards.greenhouse.io/dydx",                kind: "career-page", notes: "Perp DEX" },
  { name: "Pendle",              url: "https://jobs.ashbyhq.com/pendle",                  kind: "career-page", notes: "Yield trading" },
  { name: "Morpho",              url: "https://jobs.ashbyhq.com/morpho",                  kind: "career-page", notes: "Lending optimizer" },
  { name: "Uniswap Foundation",  url: "https://boards.greenhouse.io/uniswapfoundation",   kind: "career-page", notes: "UNI ecosystem" },

  // -------- More tooling / infra / wallets --------
  { name: "MetaMask (ConsenSys)", url: "https://boards.greenhouse.io/consensys",          kind: "career-page", notes: "Same ConsenSys board, MetaMask team" },
  { name: "Safe",                url: "https://jobs.ashbyhq.com/safe",                    kind: "career-page", notes: "Multisig / smart accounts" },
  { name: "Etherscan",           url: "https://etherscan.io/jobs",                        kind: "career-page", notes: "Block explorer (HTML)" },
  { name: "Dune Analytics",      url: "https://jobs.lever.co/dune",                       kind: "career-page", notes: "Onchain analytics" },
  { name: "Flashbots",           url: "https://jobs.ashbyhq.com/flashbots",               kind: "career-page", notes: "MEV / SUAVE" },

  // -------- More exchanges / institutional --------
  { name: "Bitget",              url: "https://jobs.lever.co/bitget",                     kind: "career-page", notes: "Centralized exchange" },
  { name: "MEXC",                url: "https://jobs.lever.co/mexc",                       kind: "career-page", notes: "Centralized exchange" },
  { name: "Hashkey",             url: "https://jobs.lever.co/hashkey",                    kind: "career-page", notes: "Asia exchange / asset manager" },
  { name: "Kucoin",              url: "https://jobs.lever.co/kucoin",                     kind: "career-page", notes: "Centralized exchange" },
  { name: "Bitstamp",            url: "https://boards.greenhouse.io/bitstamp",            kind: "career-page", notes: "EU exchange" },
  { name: "Copper",              url: "https://boards.greenhouse.io/copper",              kind: "career-page", notes: "Institutional crypto custody" },
  { name: "Zerocap",             url: "https://jobs.lever.co/zerocap",                    kind: "career-page", notes: "Institutional crypto" },
];
