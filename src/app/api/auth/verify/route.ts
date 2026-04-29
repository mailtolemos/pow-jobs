// GET /api/auth/verify?token=...
// Consumes the magic-link token, upserts the user, creates a candidate profile
// stub if needed, sets the session cookie, redirects to /profile (or redirectTo).

import { NextResponse } from "next/server";
import {
  consumeMagicLinkToken,
  upsertUserByEmail,
  setUserAccountType,
  getCandidateByUserId,
  createEmptyCandidateForUser,
} from "@/lib/db";
import { signSessionToken, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!token) {
    return NextResponse.redirect(new URL("/signin?error=missing", url), 302);
  }

  const consumed = await consumeMagicLinkToken(token);
  if (!consumed) {
    return NextResponse.redirect(new URL("/signin?error=expired", url), 302);
  }

  // Brand-new sign-ups land with the account_type they picked at the form.
  const user = await upsertUserByEmail(consumed.email, {
    accountType: consumed.account_type ?? undefined,
  });

  // If an existing candidate-typed account signs in via the "I'm hiring" form,
  // flip their account type to company so the rest of the UI gates correctly.
  if (
    consumed.account_type &&
    consumed.account_type !== user.account_type
  ) {
    await setUserAccountType(user.id, consumed.account_type);
    user.account_type = consumed.account_type;
  }

  const isCompany = user.account_type === "company";

  // Candidates always get a candidate profile stub for /feed.
  // Company accounts skip this step — they only see /post-job.
  let candidate = isCompany ? null : await getCandidateByUserId(user.id);
  if (!isCompany && !candidate) {
    candidate = await createEmptyCandidateForUser(user.id, user.email);
  }

  const jwt = await signSessionToken({ uid: user.id, email: user.email });
  const { name, options } = sessionCookieOptions();

  // Companies always land on /post-job. Candidates resume their requested
  // redirect, or go to /profile (when their headline is still empty) / /feed.
  const redirectTo = isCompany
    ? "/post-job"
    : consumed.redirect_to || (candidate?.headline ? "/feed" : "/profile");
  const res = NextResponse.redirect(new URL(redirectTo, url), 302);
  res.cookies.set(name, jwt, options);
  return res;
}
