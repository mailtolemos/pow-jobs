// GET /api/auth/verify?token=...
// Consumes the magic-link token, upserts the user, creates a candidate profile
// stub if needed, sets the session cookie, redirects to /profile (or redirectTo).

import { NextResponse } from "next/server";
import {
  consumeMagicLinkToken,
  upsertUserByEmail,
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

  const user = await upsertUserByEmail(consumed.email);

  // Ensure a candidate profile exists.
  let candidate = await getCandidateByUserId(user.id);
  if (!candidate) {
    candidate = await createEmptyCandidateForUser(user.id, user.email);
  }

  const jwt = await signSessionToken({ uid: user.id, email: user.email });
  const { name, options } = sessionCookieOptions();

  const redirectTo = consumed.redirect_to || (candidate.headline ? "/feed" : "/profile");
  const res = NextResponse.redirect(new URL(redirectTo, url), 302);
  res.cookies.set(name, jwt, options);
  return res;
}
