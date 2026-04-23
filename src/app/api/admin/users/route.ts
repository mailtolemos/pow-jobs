// Admin users API — list + bulk delete.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { listUsersAdmin, deleteUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

async function guardAdmin(): Promise<
  { error: ReturnType<typeof NextResponse.json>; user: null }
  | { error: null; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
> {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }), user: null };
  if (!user.is_admin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }), user: null };
  return { error: null, user };
}

export async function GET() {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const users = await listUsersAdmin();
  return NextResponse.json({ users });
}

const DeleteManySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(1000),
});

export async function DELETE(req: Request) {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const parsed = DeleteManySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  // Don't let an admin delete their own account by accident.
  const filtered = parsed.data.ids.filter((id) => id !== g.user.id);
  const n = await deleteUsers(filtered);
  return NextResponse.json({ deleted: n, skipped_self: parsed.data.ids.length - filtered.length });
}
