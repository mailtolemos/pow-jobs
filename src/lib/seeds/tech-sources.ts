// Tech / AI / IT / banking seed list. Companies that expose a clean public
// ATS we can ingest from (Ashby, Greenhouse, Lever).
//
// Big banks (Goldman, JPM, MS, BofA, etc.) almost universally use Workday
// or proprietary ATS that don't have a public JSON board, so they're not
// included here — they would need a generic-HTML scraper. Same for
// Google/Apple/Microsoft/Amazon/Meta/Tesla/Nvidia/Netflix.

import type { SeedSource } from "./crypto-sources";

export const TECH_SEED_SOURCES: SeedSource[] = [
  // -------- AI labs / ML infra --------
  { name: "OpenAI",                 url: "https://jobs.ashbyhq.com/openai",                  kind: "career-page", notes: "GPT, ChatGPT" },
  { name: "Anthropic",              url: "https://boards.greenhouse.io/anthropic",           kind: "career-page", notes: "Claude" },
  { name: "Mistral AI",             url: "https://jobs.lever.co/mistral",                    kind: "career-page", notes: "European LLM lab" },
  { name: "Hugging Face",           url: "https://boards.greenhouse.io/huggingface",         kind: "career-page", notes: "ML platform / open-source" },
  { name: "Cohere",                 url: "https://boards.greenhouse.io/cohere",              kind: "career-page", notes: "Enterprise LLMs" },
  { name: "Scale AI",               url: "https://boards.greenhouse.io/scaleai",             kind: "career-page", notes: "Data labeling / models" },
  { name: "Perplexity",             url: "https://jobs.ashbyhq.com/perplexity",              kind: "career-page", notes: "AI search" },
  { name: "Pinecone",               url: "https://boards.greenhouse.io/pinecone",            kind: "career-page", notes: "Vector database" },
  { name: "LangChain",              url: "https://jobs.ashbyhq.com/langchain",               kind: "career-page", notes: "LLM dev framework" },
  { name: "Together AI",            url: "https://jobs.ashbyhq.com/togetherai",              kind: "career-page", notes: "LLM inference cloud" },

  // -------- Dev tools / infra / SaaS --------
  { name: "Vercel",                 url: "https://boards.greenhouse.io/vercel",              kind: "career-page", notes: "Frontend cloud" },
  { name: "Supabase",               url: "https://jobs.ashbyhq.com/supabase",                kind: "career-page", notes: "Open-source Firebase" },
  { name: "GitLab",                 url: "https://boards.greenhouse.io/gitlab",              kind: "career-page", notes: "DevOps platform" },
  { name: "HashiCorp",              url: "https://boards.greenhouse.io/hashicorp",           kind: "career-page", notes: "Terraform, Vault, etc." },
  { name: "Cloudflare",             url: "https://boards.greenhouse.io/cloudflare",          kind: "career-page", notes: "Edge / network / Workers" },
  { name: "Confluent",              url: "https://boards.greenhouse.io/confluent",           kind: "career-page", notes: "Kafka / streaming" },
  { name: "Databricks",             url: "https://boards.greenhouse.io/databricks",          kind: "career-page", notes: "Data lakehouse" },
  { name: "Snowflake",              url: "https://boards.greenhouse.io/snowflake",           kind: "career-page", notes: "Data warehouse" },
  { name: "MongoDB",                url: "https://boards.greenhouse.io/mongodb",             kind: "career-page", notes: "Document database" },
  { name: "Datadog",                url: "https://boards.greenhouse.io/datadog",             kind: "career-page", notes: "Observability" },
  { name: "Twilio",                 url: "https://boards.greenhouse.io/twilio",              kind: "career-page", notes: "Comms APIs" },
  { name: "Atlassian",              url: "https://boards.greenhouse.io/atlassian",           kind: "career-page", notes: "Jira, Confluence" },
  { name: "Slack (Salesforce)",     url: "https://boards.greenhouse.io/slack",               kind: "career-page", notes: "Workplace messaging" },

  // -------- Productivity / collaboration --------
  { name: "Notion",                 url: "https://boards.greenhouse.io/notion",              kind: "career-page", notes: "Workspace / docs" },
  { name: "Figma",                  url: "https://boards.greenhouse.io/figma",               kind: "career-page", notes: "Design platform" },
  { name: "Linear",                 url: "https://jobs.ashbyhq.com/linear",                  kind: "career-page", notes: "Issue tracking" },
  { name: "Airtable",               url: "https://boards.greenhouse.io/airtable",            kind: "career-page", notes: "Spreadsheet/database hybrid" },
  { name: "Asana",                  url: "https://boards.greenhouse.io/asana",               kind: "career-page", notes: "Work management" },
  { name: "Squarespace",            url: "https://boards.greenhouse.io/squarespace",         kind: "career-page", notes: "Website builder" },
  { name: "Loom",                   url: "https://jobs.ashbyhq.com/loom",                    kind: "career-page", notes: "Video messaging" },

  // -------- Marketplaces / consumer --------
  { name: "Airbnb",                 url: "https://boards.greenhouse.io/airbnb",              kind: "career-page", notes: "Hospitality marketplace" },
  { name: "Uber",                   url: "https://boards.greenhouse.io/uber",                kind: "career-page", notes: "Mobility / delivery" },
  { name: "Lyft",                   url: "https://boards.greenhouse.io/lyft",                kind: "career-page", notes: "Mobility" },
  { name: "DoorDash",               url: "https://boards.greenhouse.io/doordash",            kind: "career-page", notes: "Delivery" },
  { name: "Instacart",              url: "https://boards.greenhouse.io/instacart",           kind: "career-page", notes: "Grocery delivery" },
  { name: "Pinterest",              url: "https://boards.greenhouse.io/pinterest",           kind: "career-page", notes: "Visual discovery" },
  { name: "Reddit",                 url: "https://boards.greenhouse.io/reddit",              kind: "career-page", notes: "Communities" },
  { name: "Spotify",                url: "https://boards.greenhouse.io/spotify",             kind: "career-page", notes: "Audio streaming" },

  // -------- Cybersecurity --------
  { name: "Okta",                   url: "https://boards.greenhouse.io/okta",                kind: "career-page", notes: "Identity / access" },
  { name: "1Password",              url: "https://jobs.lever.co/1password",                  kind: "career-page", notes: "Password manager" },
  { name: "CrowdStrike",            url: "https://boards.greenhouse.io/crowdstrike",         kind: "career-page", notes: "Endpoint security" },

  // -------- Health / bio --------
  { name: "Recursion",              url: "https://boards.greenhouse.io/recursion",           kind: "career-page", notes: "AI drug discovery" },
];
