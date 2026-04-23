import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Gate at the layout level so sub-routes inherit.
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/admin");
  if (!user.is_admin) redirect("/");

  return (
    <>
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4 text-sm">
          <span className="text-[10px] uppercase tracking-widest text-accent font-semibold">
            Admin
          </span>
          <AdminNav />
          <span className="ml-auto text-xs text-neutral-500">
            Signed in as <span className="font-medium">{user.email}</span>
            {" "}
            <Link href="/" className="ml-2 underline">exit</Link>
          </span>
        </div>
      </div>
      {children}
    </>
  );
}
