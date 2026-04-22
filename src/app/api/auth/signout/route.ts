import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { name } = sessionCookieOptions();
  const res = NextResponse.redirect(new URL("/", req.url), 302);
  res.cookies.set(name, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  return POST(req);
}
