// POST /api/post-job — accepts a company submission, lands it as `status='pending'`.
// Auth: any signed-in user can submit. Admins can also submit, but they should
// usually use /admin/jobs (which lands rows as 'approved' directly).

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import {
  submitPendingJob,
  findDuplicateJob,
  touchJobLastSeen,
} from "@/lib/db";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().trim().min(2).max(240),
  employer: z.string().trim().min(1).max(160),
  employer_category: z.string().trim().max(80).default("Tech / startup"),
  description: z.string().trim().min(20).max(20000),
  location: z.string().trim().max(160).default("Remote"),
  remote_policy: z
    .enum(["remote-global", "remote-regional", "hybrid", "onsite"])
    .default("remote-global"),
  jurisdiction_required: z.enum(["global", "us", "eu", "uk", "apac", "latam"]).default("global"),
  domain: z.string().min(1).max(40).default("fintech"),
  function: z.string().min(1).max(40).default("engineering"),
  seniority: z.string().min(1).max(8).default("ic4"),
  stage: z.string().min(1).max(20).default("series-a"),
  base_min: z.number().int().min(0).max(10_000_000).nullable().default(null),
  base_max: z.number().int().min(0).max(10_000_000).nullable().default(null),
  token_pct_target: z.number().min(0).max(100).nullable().default(null),
  source_url: z.string().url().max(600),
  tech_stack: z.array(z.string().max(40)).max(40).default([]),
  visa_sponsored: z.boolean().default(false),
  regulated: z.boolean().default(false),
});

function newId(): string {
  return `submitted_${randomBytes(6).toString("base64url")}`;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      Object.entries(flat.fieldErrors)[0]?.[1]?.[0] ||
      flat.formErrors[0] ||
      "Some fields are missing or invalid.";
    return NextResponse.json({ ok: false, error: first }, { status: 400 });
  }
  const d = parsed.data;

  // Reject obvious dupes — same employer+title+location already in queue or live.
  const existing = await findDuplicateJob({
    employer: d.employer,
    title_normalized: normalize(d.title),
    location: d.location || "Remote",
  });
  if (existing) {
    // Still touch last-seen so the row stays fresh.
    await touchJobLastSeen(existing.id);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Looks like this exact role is already on ProWo. If it's a different opening, tweak the title or location and resubmit.",
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const job: Job = {
    id: newId(),
    title_raw: d.title,
    title_normalized: normalize(d.title),
    employer: d.employer,
    employer_category: d.employer_category || "Tech / startup",
    domain: d.domain as Job["domain"],
    function: d.function as Job["function"],
    seniority: d.seniority as Job["seniority"],
    tech_stack: d.tech_stack,
    department: null,
    description: d.description,
    base_min: d.base_min,
    base_max: d.base_max,
    bonus_pct_target: null,
    token_pct_target: d.token_pct_target,
    carry_or_equity_pct: null,
    vesting_years: null,
    cliff_months: null,
    location: d.location || "Remote",
    remote_policy: d.remote_policy,
    jurisdiction_required: d.jurisdiction_required as Job["jurisdiction_required"],
    visa_sponsored: d.visa_sponsored,
    regulated: d.regulated,
    stage: d.stage as Job["stage"],
    team_size_band: null,
    aum_usd: null,
    source_url: d.source_url,
    source_channel: "submitted",
    date_posted: now,
    date_last_seen: now,
    is_open: true,
    employer_verified: false,
  };

  try {
    await submitPendingJob(job, user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `Could not save submission: ${msg}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, jobId: job.id });
}
