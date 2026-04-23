// Ingest dispatcher: inspect a SourceRow and run the right fetcher,
// classify each incoming role, and upsert into the jobs table.

import { detectAshbySlug, fetchAshby } from "./ashby";
import { detectGreenhouseToken, fetchGreenhouse } from "./greenhouse";
import { detectLeverSlug, fetchLever } from "./lever";
import { fetchHtmlCareerPage } from "./html";
import { classifyIncoming } from "./classify";
import type { IncomingJob, IngestResult } from "./types";
import { getJob, upsertJob, markSourceChecked, type SourceRow } from "../db";

export type AtsKind = "ashby" | "greenhouse" | "lever" | "html" | "unknown";

export function detectAts(url: string): AtsKind {
  if (detectAshbySlug(url)) return "ashby";
  if (detectGreenhouseToken(url)) return "greenhouse";
  if (detectLeverSlug(url)) return "lever";
  try {
    const u = new URL(url);
    if (/^https?:$/.test(u.protocol)) return "html";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function fetchIncoming(source: SourceRow): Promise<IncomingJob[]> {
  const ats = detectAts(source.url);
  const employer = source.name;
  switch (ats) {
    case "ashby":
      return fetchAshby(source.url, employer);
    case "greenhouse":
      return fetchGreenhouse(source.url, employer);
    case "lever":
      return fetchLever(source.url, employer);
    case "html":
      return fetchHtmlCareerPage(source.url, employer);
    default:
      throw new Error(`Unsupported source URL (not a known ATS and not HTTP): ${source.url}`);
  }
}

export async function ingestSource(source: SourceRow): Promise<IngestResult> {
  const started = Date.now();
  const result: IngestResult = {
    source_id: source.id,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    duration_ms: 0,
  };

  let incoming: IncomingJob[] = [];
  try {
    incoming = await fetchIncoming(source);
  } catch (e) {
    result.errors.push(`fetch: ${(e as Error).message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  result.fetched = incoming.length;

  // Classify + upsert. We run these serially to avoid hammering the LLM;
  // for larger boards we can parallelize later with a small concurrency cap.
  for (const inc of incoming) {
    try {
      const existing = await getJob(inc.external_id);
      const job = await classifyIncoming(inc);
      await upsertJob(job);
      if (existing) result.updated += 1;
      else result.created += 1;
    } catch (e) {
      result.errors.push(`${inc.title}: ${(e as Error).message}`);
    }
  }

  try {
    await markSourceChecked(source.id);
  } catch {
    // non-fatal
  }
  result.duration_ms = Date.now() - started;
  return result;
}
