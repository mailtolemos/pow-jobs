// Ingest dispatcher: inspect a SourceRow and run the right fetcher,
// classify each incoming role, and upsert into the jobs table.

import { detectAshbySlug, fetchAshby } from "./ashby";
import { detectGreenhouseToken, fetchGreenhouse } from "./greenhouse";
import { detectLeverSlug, fetchLever } from "./lever";
import { fetchHtmlCareerPage } from "./html";
import { classifyIncoming, classifyHeuristic } from "./classify";
import type { IncomingJob, IngestResult } from "./types";
import { getJob, upsertJob, markSourceChecked, type SourceRow } from "../db";
import { broadcastJob, isBroadcastConfigured } from "../telegram";

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
    llm_classified: 0,
    llm_errors: [],
    broadcast_configured: isBroadcastConfigured(),
    broadcast_sent: 0,
    broadcast_errors: [],
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

  // Circuit breaker: if the LLM rate-limits us repeatedly, switch the rest
  // of the batch to heuristic-only. Classify still succeeds (we always write
  // a job row); LLM enrichment is best-effort, not mandatory. This keeps
  // ingest under Vercel's 60s cap no matter what Groq is doing.
  const TIME_BUDGET_MS = 50_000;
  const FAILS_BEFORE_BREAK = 3;
  let consecutiveFails = 0;
  let breakerOpen = false;

  for (const inc of incoming) {
    const remaining = TIME_BUDGET_MS - (Date.now() - started);
    // If we've used most of the time budget, stop early — partial results
    // beat a timed-out function that returns nothing.
    if (remaining < 2000) {
      result.errors.push(`time budget exhausted after ${result.created + result.updated} roles`);
      break;
    }
    try {
      const existing = await getJob(inc.external_id);
      const { job, llm_used, llm_error } = breakerOpen
        ? { ...(await classifyHeuristic(inc)), llm_used: false, llm_error: "skipped: LLM circuit breaker open" }
        : await classifyIncoming(inc);
      await upsertJob(job);
      if (existing) {
        result.updated += 1;
      } else {
        result.created += 1;
        // Broadcast brand-new roles to the Telegram channel. We await the
        // result (with a short timeout) so admins can see in the fetch report
        // whether messages actually landed — but failures never block ingest.
        if (result.broadcast_configured) {
          try {
            const bcast = (await Promise.race([
              broadcastJob(job),
              new Promise<{ ok: false; error: string }>((resolve) =>
                setTimeout(() => resolve({ ok: false, error: "broadcast timed out after 5s" }), 5000),
              ),
            ])) as { ok: boolean; error?: string };
            if (bcast.ok) {
              result.broadcast_sent += 1;
            } else if (bcast.error && result.broadcast_errors.length < 5) {
              result.broadcast_errors.push(`${job.title_raw}: ${bcast.error}`);
            }
          } catch (e) {
            if (result.broadcast_errors.length < 5) {
              result.broadcast_errors.push(`${job.title_raw}: ${(e as Error).message}`);
            }
          }
        }
      }
      if (llm_used) {
        result.llm_classified += 1;
        consecutiveFails = 0;
      } else if (llm_error && !breakerOpen) {
        consecutiveFails += 1;
        if (result.llm_errors.length < 5) result.llm_errors.push(`${inc.title}: ${llm_error}`);
        if (consecutiveFails >= FAILS_BEFORE_BREAK) {
          breakerOpen = true;
          result.llm_errors.push(
            `circuit-breaker tripped after ${consecutiveFails} consecutive LLM failures; remaining ${
              incoming.length - result.created - result.updated
            } roles will use heuristic fallback`,
          );
        }
      }
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
