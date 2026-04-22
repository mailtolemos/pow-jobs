import Link from "next/link";

export function Nav() {
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
        <div className="flex items-center gap-6 text-sm">
          <Link href="/onboarding" className="text-neutral-600 hover:text-ink">
            Onboarding
          </Link>
          <Link href="/feed" className="text-neutral-600 hover:text-ink">
            Feed
          </Link>
          <Link href="/email-preview" className="text-neutral-600 hover:text-ink">
            Email preview
          </Link>
          <Link href="/admin" className="text-neutral-600 hover:text-ink">
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
