// Admin jobs API — single delete + status PATCH (approve/reject).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { deleteJob, approveJob, rejectJob } from "@/lib/db";

export const dynamic = "force-dynamic";

async function gate() {
  const user = await getSessionUser();
  if (!user) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!user.is_admin) return { res: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user };
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await gate();
  if ("res" in g) return g.res;
  await deleteJob(params.id);
  return NextResponse.json({ ok: true });
}

const PatchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await gate();
  if ("res" in g) return g.res;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  if (parsed.data.status === "approved") {
    await approveJob(params.id);
  } else {
    await rejectJob(params.id);
  }
  return NextResponse.json({ ok: true });
}
