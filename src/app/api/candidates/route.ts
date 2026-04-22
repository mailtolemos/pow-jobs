import { NextResponse } from "next/server";
import { listCandidates } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const demoOnly = url.searchParams.get("demoOnly") === "1";
  const candidates = await listCandidates({ demoOnly });
  return NextResponse.json({ candidates });
}
