// Admin sources API — list + create. Admin-only.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { listSources, createSource, type SourceKind } from "@/lib/db";

export const dynamic = "force-dynamic";

const KindSchema = z.enum(["rss", "career-page", "api", "manual", "aggregator"]);

const CreateSchema = z.object({
  name: z.string().min(1).max(160),
  url: z.string().url().max(600),
  kind: KindSchema.default("manual"),
  active: z.boolean().default(true),
  notes: z.string().max(1000).default(""),
});

async function guardAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!user.is_admin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const sources = await listSources();
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const created = await createSource({
    name: data.name,
    url: data.url,
    kind: data.kind as SourceKind,
    active: data.active,
    notes: data.notes,
  });
  return NextResponse.json({ source: created });
}
