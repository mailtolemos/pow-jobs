// Admin sources API — patch + delete by id. Admin-only.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updateSource, deleteSource, markSourceChecked, type SourceKind } from "@/lib/db";

export const dynamic = "force-dynamic";

const KindSchema = z.enum(["rss", "career-page", "api", "manual", "aggregator"]);

const PatchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  url: z.string().url().max(600).optional(),
  kind: KindSchema.optional(),
  active: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  mark_checked: z.boolean().optional(),
});

async function guardAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!user.is_admin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guardAdmin();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { mark_checked, ...patch } = parsed.data;
  const typedPatch: Partial<{
    name: string;
    url: string;
    kind: SourceKind;
    active: boolean;
    notes: string;
  }> = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.url !== undefined ? { url: patch.url } : {}),
    ...(patch.kind !== undefined ? { kind: patch.kind as SourceKind } : {}),
    ...(patch.active !== undefined ? { active: patch.active } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };

  const updated = await updateSource(params.id, typedPatch);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (mark_checked) await markSourceChecked(params.id);

  return NextResponse.json({ source: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardAdmin();
  if (g.error) return g.error;
  await deleteSource(params.id);
  return NextResponse.json({ ok: true });
}
