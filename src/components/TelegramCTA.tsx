// Centralized Telegram-channel CTA so we never copy-paste the URL or icon.
// The channel is the public ProWo broadcast where new approved roles get
// pushed in real time. Three rendering variants cover every placement we
// need across the site.

import Link from "next/link";

export const TELEGRAM_CHANNEL_URL = "https://t.me/+CXngyqnkx3w2Yjhk";

interface Props {
  // "banner"  — full-width call-out card (between content sections)
  // "button"  — inline pill (hero / page-headers / nav-adjacent)
  // "link"    — text + glyph (footer / asides)
  variant?: "banner" | "button" | "link";
  className?: string;
  label?: string;
}

export function TelegramCTA({ variant = "button", className = "", label }: Props) {
  if (variant === "banner") {
    return (
      <Link
        href={TELEGRAM_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-accent transition ${className}`}
      >
        <TelegramGlyph className="shrink-0 w-10 h-10 text-[#26A5E4]" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink">
            {label ?? "Get every new role in your Telegram."}
          </div>
          <div className="text-xs text-muted mt-0.5">
            Join the ProWo channel for new approved tech, crypto &amp; finance roles, pushed the moment they go live.
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#26A5E4] text-white px-3 py-1.5 text-xs font-semibold shrink-0 group-hover:brightness-110 transition whitespace-nowrap">
          Join channel →
        </span>
      </Link>
    );
  }

  if (variant === "link") {
    return (
      <Link
        href={TELEGRAM_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 hover:text-ink transition ${className}`}
      >
        <TelegramGlyph className="w-4 h-4 text-[#26A5E4]" />
        <span>{label ?? "Telegram"}</span>
      </Link>
    );
  }

  // Default: button
  return (
    <Link
      href={TELEGRAM_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg bg-[#26A5E4] text-white px-4 py-2 text-sm font-semibold hover:brightness-110 transition shadow-soft ${className}`}
    >
      <TelegramGlyph className="w-4 h-4" />
      {label ?? "Join our Telegram"}
    </Link>
  );
}

// Telegram brand glyph (paper plane in a circle). Single-path SVG so it
// inherits currentColor and stays crisp at any size.
export function TelegramGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm5.894 8.221-1.97 9.28c-.146.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.022c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.643.135-.953l11.566-4.458c.538-.196 1.006.128.832.938Z" />
    </svg>
  );
}
