// Centralized link to the ProWo X (formerly Twitter) account. Discrete
// by default — surfaced as a small glyph + handle in footers and nav rows.
// Mirrors TelegramCTA's API so footers can drop both side by side.

import Link from "next/link";

export const X_PROFILE_URL = "https://x.com/ProWoJobs";
export const X_HANDLE = "@ProWoJobs";

interface Props {
  variant?: "link" | "icon" | "button";
  className?: string;
  label?: string;
}

export function XCTA({ variant = "link", className = "", label }: Props) {
  if (variant === "icon") {
    // Just the glyph in a circle — for tight nav rows.
    return (
      <Link
        href={X_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Follow ProWo on X (${X_HANDLE})`}
        title={`Follow ProWo on X (${X_HANDLE})`}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-ink/80 hover:text-ink hover:bg-line/40 transition ${className}`}
      >
        <XGlyph className="w-3.5 h-3.5" />
      </Link>
    );
  }

  if (variant === "button") {
    return (
      <Link
        href={X_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-lg bg-ink text-paper px-4 py-2 text-sm font-semibold hover:opacity-90 transition shadow-soft ${className}`}
      >
        <XGlyph className="w-4 h-4" />
        {label ?? `Follow ${X_HANDLE}`}
      </Link>
    );
  }

  // Default: discrete inline link with glyph + handle, matches TelegramCTA's
  // "link" variant so footers can lay them out symmetrically.
  return (
    <Link
      href={X_PROFILE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 hover:text-ink transition ${className}`}
    >
      <XGlyph className="w-4 h-4" />
      <span>{label ?? X_HANDLE}</span>
    </Link>
  );
}

// X logo (the post-rebrand mark). Single-path SVG so it inherits
// currentColor and stays crisp at any size — keep it on a transparent
// background so it picks up the surrounding text colour.
export function XGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
