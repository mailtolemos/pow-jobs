// Lightweight footer for inner pages (anything that isn't the landing page,
// which has its own richer footer). Carries the contact email + Telegram
// channel + X profile so visitors never hit a dead end.

import Link from "next/link";
import { TelegramCTA } from "./TelegramCTA";
import { XCTA } from "./XCTA";
import { EmailCTA } from "./EmailCTA";

interface Props {
  className?: string;
  contactSubject?: string;
}

export function SiteFooter({ className = "", contactSubject = "ProWo" }: Props) {
  return (
    <footer className={`border-t border-line mt-16 ${className}`}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted">
        <div>© {new Date().getFullYear()} ProWo · Proof of Work</div>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/jobs" className="hover:text-ink transition">
            Browse
          </Link>
          <Link href="/post-job" className="hover:text-ink transition">
            Post a job
          </Link>
          <TelegramCTA variant="link" />
          <XCTA variant="link" />
          <EmailCTA variant="link" subject={contactSubject} />
        </div>
      </div>
    </footer>
  );
}
