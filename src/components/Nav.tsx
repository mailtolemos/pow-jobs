import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export async function Nav() {
  const user = await getSessionUser().catch(() => null);

  return (
    <nav className="border-b border-neutral-200 bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white text-xs font-bold">
            PoW
          </div>
          <span className="font-semibold text-ink">PoW Jobs</span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 ml-1">alpha</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/feed" className="text-neutral-600 hover:text-ink">
            Feed
          </Link>
          {user ? (
            <Link href="/profile" className="text-neutral-600 hover:text-ink">
              Profile
            </Link>
          ) : (
            <Link href="/onboarding" className="text-neutral-600 hover:text-ink">
              Tour
            </Link>
          )}
          <Link href="/email-preview" className="text-neutral-600 hover:text-ink hidden md:inline">
            Email preview
          </Link>
          {user?.is_admin && (
            <Link href="/admin" className="text-neutral-600 hover:text-ink">
              Admin
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs text-neutral-500" title={user.email}>
                {user.email}
              </span>
              <form action="/api/auth/signout" method="POST">
                <button className="text-neutral-500 hover:text-ink text-xs" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/signin"
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
