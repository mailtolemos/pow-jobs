"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Sources" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/users", label: "Users" },
];

export function AdminNav() {
  const path = usePathname() || "/admin";
  return (
    <nav className="flex items-center gap-1">
      {TABS.map((t) => {
        // Exact match for /admin; prefix match for sub-routes
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-2.5 py-1 rounded-md text-sm font-medium transition ${
              active
                ? "bg-ink text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
