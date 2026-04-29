// Admin users API — single delete + role/account-type PATCH.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  deleteUser,
  setUserIsAdminById,
  setUserAccountType,
  getUserById,
  isAdminEmail,
} from "@/lib/db";

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
  if (params.id === g.user.id) {
    return NextResponse.json({ error: "cannot delete your own account from admin" }, { status: 400 });
  }
  await deleteUser(params.id);
  return NextResponse.json({ ok: true });
}

const PatchSchema = z
  .object({
    is_admin: z.boolean().optional(),
    account_type: z.enum(["candidate", "company"]).optional(),
  })
  .refine(
    (v) => v.is_admin !== undefined || v.account_type !== undefined,
    { message: "no fields to update" },
  );

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await gate();
  if ("res" in g) return g.res;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const target = await getUserById(params.id);
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Self-demote guard: admins can't strip their own admin bit (would lock
  // themselves out of /admin until next sign-in, when the env-allowlist would
  // re-promote them anyway — but only for owners). Avoid the foot-gun.
  if (parsed.data.is_admin === false && target.id === g.user.id) {
    return NextResponse.json(
      { error: "you can't revoke admin from your own account in this UI" },
      { status: 400 },
    );
  }

  // Owner-protection: the env-allowlisted owner email cannot be demoted by
  // any admin. They will get re-promoted on next sign-in regardless, so this
  // is a UX guard (and a clear policy signal) more than a hard lock.
  if (parsed.data.is_admin === false && isAdminEmail(target.email)) {
    return NextResponse.json(
      { error: "this account is the protected owner and can't be demoted" },
      { status: 400 },
    );
  }

  if (parsed.data.is_admin !== undefined) {
    await setUserIsAdminById(target.id, parsed.data.is_admin);
  }
  if (parsed.data.account_type !== undefined) {
    await setUserAccountType(target.id, parsed.data.account_type);
  }
  return NextResponse.json({ ok: true });
}
