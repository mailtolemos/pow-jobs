// Admin jobs API — list (with filters) + create manual + bulk delete.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { listJobs, upsertJob, deleteJobs } from "@/lib/db";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

async function guardAdmin() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const gate = await guardAdmin();
  if (gate) return gate;
  const jobs = await listJobs({ openOnly: false });
  return NextResponse.json({ jobs });
}

// Server-side shape for a manual job create. Lenient: most fields default.
const CreateJobSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  title: z.string().min(1).max(240),
  employer: z.string().min(1).max(160),
  employer_category: z.string().max(80).default("Crypto protocol"),
  domain: z.string().default("crypto:application"),
  function: z.string().default("engineering"),
  seniority: z.string().default("ic4"),
  tech_stack: z.array(z.string()).default([]),
  description: z.string().default(""),
  base_min: z.number().int().nullable().default(null),
  base_max: z.number().int().nullable().default(null),
  token_pct_target: z.number().nullable().default(null),
  location: z.string().default("Remote"),
  remote_policy: z.string().default("remote-global"),
  jurisdiction_required: z.string().default("global"),
  visa_sponsored: z.boolean().default(false),
  regulated: z.boolean().default(false),
  stage: z.string().default("series-a"),
  source_url: z.string().url().max(600).default("https://pow-jobs.vercel.app/admin"),
});

function shortId(): string {
  const rnd = (n: number) =>
    [...crypto.getRandomValues(new Uint8Array(n))]
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, n);
  return `manual_${rnd(10)}`;
}

export async function POST(req: Request) {
  const gate = await guardAdmin();
  if (gate) return gate;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  const job: Job = {
    id: d.id || shortId(),
    title_raw: d.title,
    title_normalized: d.title.trim(),
    employer: d.employer,
    employer_category: d.employer_category,
    domain: d.domain as Job["domain"],
    function: d.function as Job["function"],
    seniority: d.seniority as Job["seniority"],
    tech_stack: d.tech_stack,
    description: d.description,
    base_min: d.base_min,
    base_max: d.base_max,
    bonus_pct_target: null,
    token_pct_target: d.token_pct_target,
    carry_or_equity_pct: null,
    vesting_years: null,
    cliff_months: null,
    location: d.location,
    remote_policy: d.remote_policy as Job["remote_policy"],
    jurisdiction_required: d.jurisdiction_required as Job["jurisdiction_required"],
    visa_sponsored: d.visa_sponsored,
    regulated: d.regulated,
    stage: d.stage as Job["stage"],
    team_size_band: null,
    aum_usd: null,
    source_url: d.source_url,
    source_channel: "manual",
    date_posted: now,
    date_last_seen: now,
    is_open: true,
    employer_verified: true,
  };
  await upsertJob(job);
  return NextResponse.json({ job });
}

const DeleteManySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(1000),
});

export async function DELETE(req: Request) {
  const gate = await guardAdmin();
  if (gate) return gate;
  const body = await req.json().catch(() => ({}));
  const parsed = DeleteManySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const n = await deleteJobs(parsed.data.ids);
  return NextResponse.json({ deleted: n });
}
