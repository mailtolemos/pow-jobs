// Session management via signed JWT cookies (jose, edge-compatible).
// Cookie: `pow_session` (httpOnly, secure, sameSite=lax), 30-day expiry.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getUserById, getCandidateByUserId, type UserRow } from "./db";

const COOKIE_NAME = "pow_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    // Accept shorter dev secrets via fallback; in production, Vercel env should set a real one.
    const fallback = "dev-only-please-set-AUTH_SECRET-in-production-0123456789";
    return new TextEncoder().encode(raw || fallback);
  }
  return new TextEncoder().encode(raw);
}

export interface SessionPayload {
  uid: string;
  email: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.uid)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { uid: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

// Server-only: read session from cookie.
export async function getSessionUser(): Promise<
  (UserRow & { candidate_id: string | null }) | null
> {
  const cookieStore = cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  const payload = await verifySessionToken(cookie.value);
  if (!payload) return null;
  const user = await getUserById(payload.uid);
  if (!user) return null;
  const candidate = await getCandidateByUserId(user.id);
  return { ...user, candidate_id: candidate?.id ?? null };
}

export function sessionCookieOptions(): {
  name: string;
  options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number };
} {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  };
}

export async function requireSessionUser(): Promise<NonNullable<Awaited<ReturnType<typeof getSessionUser>>>> {
  const u = await getSessionUser();
  if (!u) throw new Error("unauthorized");
  return u;
}
