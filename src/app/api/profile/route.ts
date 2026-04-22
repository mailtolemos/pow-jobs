// PATCH /api/profile — save candidate profile edits for the signed-in user.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  getCandidateByUserId,
  upsertCandidate,
  updateCandidateAlerts,
} from "@/lib/db";
import type { Candidate } from "@/lib/types";

export const dynamic = "force-dynamic";

const Schema = z.object({
  display_name: z.string().min(1).max(80),
  identity_mode: z.enum(["real", "pseudonym"]),
  headline: z.string().max(240).default(""),
  years_experience: z.number().int().min(0).max(80).default(0),
  current_role: z.string().max(120).default(""),
  current_employer: z.string().max(120).default(""),
  education: z.string().max(240).default(""),
  linkedin_url: z.string().url().max(300).nullable().optional(),
  github_url: z.string().url().max(300).nullable().optional(),
  farcaster_handle: z.string().max(120).nullable().optional(),
  wallet_address: z.string().max(120).nullable().optional(),
  domains_of_interest: z.array(z.string()).max(32).default([]),
  functions: z.array(z.string()).max(16).default([]),
  seniority_band: z.string(),
  tech_stack: z.array(z.string()).max(64).default([]),
  comp_floor_usd: z.number().int().min(0).max(10_000_000).default(0),
  jurisdiction_ok: z.array(z.string()).max(8).default([]),
  remote_policy_ok: z.array(z.string()).max(8).default([]),
  visa_needed: z.boolean().default(false),
  max_regulated_ok: z.boolean().default(true),
  weight_comp: z.number().min(0).max(1).default(0.5),
  weight_domain_fit: z.number().min(0).max(1).default(0.5),
  weight_team_quality: z.number().min(0).max(1).default(0.5),
  weight_token_upside: z.number().min(0).max(1).default(0.3),
  dealbreakers: z.array(z.string()).max(32).default([]),
  alert_email_enabled: z.boolean().default(true),
  alert_telegram_enabled: z.boolean().default(false),
  alert_frequency: z.enum(["daily", "weekly", "realtime"]).default("daily"),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await getCandidateByUserId(user.id);
  if (!existing) return NextResponse.json({ error: "profile missing" }, { status: 404 });

  // Preserve existing saved/dismissed job history (not edited via UI).
  const next: Candidate = {
    id: existing.id,
    display_name: data.display_name,
    identity_mode: data.identity_mode,
    headline: data.headline,
    years_experience: data.years_experience,
    current_role: data.current_role,
    current_employer: data.current_employer,
    education: data.education,
    linkedin_url: data.linkedin_url ?? null,
    github_url: data.github_url ?? null,
    farcaster_handle: data.farcaster_handle ?? null,
    wallet_address: data.wallet_address ?? null,
    domains_of_interest: data.domains_of_interest as Candidate["domains_of_interest"],
    functions: data.functions as Candidate["functions"],
    seniority_band: data.seniority_band as Candidate["seniority_band"],
    tech_stack: data.tech_stack,
    comp_floor_usd: data.comp_floor_usd,
    jurisdiction_ok: data.jurisdiction_ok as Candidate["jurisdiction_ok"],
    remote_policy_ok: data.remote_policy_ok as Candidate["remote_policy_ok"],
    visa_needed: data.visa_needed,
    max_regulated_ok: data.max_regulated_ok,
    weight_comp: data.weight_comp,
    weight_domain_fit: data.weight_domain_fit,
    weight_team_quality: data.weight_team_quality,
    weight_token_upside: data.weight_token_upside,
    dealbreakers: data.dealbreakers,
    saved_job_ids: existing.saved_job_ids,
    dismissed_job_ids: existing.dismissed_job_ids,
  };

  await upsertCandidate(next, user.id);
  const isProfileComplete =
    !!next.headline &&
    next.domains_of_interest.length > 0 &&
    next.functions.length > 0 &&
    next.seniority_band.length > 0;
  await updateCandidateAlerts(existing.id, {
    alert_email_enabled: data.alert_email_enabled,
    alert_telegram_enabled: data.alert_telegram_enabled,
    alert_frequency: data.alert_frequency,
    profile_complete: isProfileComplete,
  });

  return NextResponse.json({ ok: true });
}
