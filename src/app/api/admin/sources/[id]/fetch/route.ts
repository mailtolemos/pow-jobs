// Admin-only: trigger an ingest for a single source.
// Can be long-running (LLM classification per role), so we set a generous
// Vercel maxDuration and stream the response when done. Not quite a
// background job yet — fine for Hobby plan.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSource } from "@/lib/db";
import { ingestSource } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds; Hobby cap is 60 — will clamp if needed

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const source = await getSource(params.id);
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404 });

  const result = await ingestSource(source);
  return NextResponse.json({ result });
}
