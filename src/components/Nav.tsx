import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

export async function Nav() {
  const user = await getSessionUser().catch(() => null);

  return (
    <nav className="border-b border-line bg-paper/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white text-[11px] font-bold tracking-tight shadow-soft">
            PJ
          </div>
          <span className="font-semibold text-ink tracking-tight">Pablo Jobs</span>
          <span className="text-[10px] uppercase tracking-widest text-muted ml-1">alpha</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/feed" className="text-muted hover:text-ink transition">
            Browse jobs
          </Link>
          {user ? (
            <Link href="/profile" className="text-muted hover:text-ink transition">
              Profile
            </Link>
          ) : (
            <Link href="/onboarding" className="text-muted hover:text-ink transition">
              Tour
            </Link>
          )}
          <Link href="/email-preview" className="text-muted hover:text-ink transition hidden md:inline">
            Email preview
          </Link>
          {user?.is_admin && (
            <Link href="/admin" className="text-muted hover:text-ink transition">
              Admin
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs text-muted" title={user.email}>
                {user.email}
              </span>
              <form action="/api/auth/signout" method="POST">
                <button className="text-muted hover:text-ink text-xs transition" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/signin"
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent2 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
