import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

export async function Nav() {
  const user = await getSessionUser().catch(() => null);
  // Company accounts ONLY see Post a Job (and admin if they're owners). The
  // rest of the candidate experience (feed, profile, browse) is hidden so
  // hiring users don't get confused by a UI that isn't aimed at them.
  const isCompany = user?.account_type === "company";

  return (
    <nav className="border-b border-line bg-paper/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href={isCompany ? "/post-job" : "/"}
          className="flex items-center gap-2 group"
        >
          <Logo size={28} />
          <span className="text-[10px] uppercase tracking-widest text-muted ml-1">alpha</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {isCompany ? (
            <Link href="/post-job" className="text-muted hover:text-ink transition">
              Post a job
            </Link>
          ) : (
            <>
              <Link
                href={user ? "/feed" : "/jobs"}
                className="text-muted hover:text-ink transition"
              >
                {user ? "My feed" : "Browse jobs"}
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
            </>
          )}
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
