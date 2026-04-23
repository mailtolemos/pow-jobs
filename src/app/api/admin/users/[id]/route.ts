// Admin users API — single delete by id.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (params.id === user.id) {
    return NextResponse.json({ error: "cannot delete your own account from admin" }, { status: 400 });
  }
  await deleteUser(params.id);
  return NextResponse.json({ ok: true });
}
