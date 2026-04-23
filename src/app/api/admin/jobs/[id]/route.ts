// Admin jobs API — single delete by id.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteJob } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await deleteJob(params.id);
  return NextResponse.json({ ok: true });
}
