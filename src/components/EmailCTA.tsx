// Email CTA: matches XCTA / TelegramCTA so footers can render the three
// social icons consistently. Renders as a small envelope glyph + the
// contact email by default.

import { CONTACT_EMAIL, contactMailto } from "@/lib/contact";

interface Props {
  variant?: "link" | "icon" | "button";
  className?: string;
  label?: string;
  subject?: string;
}

export function EmailCTA({
  variant = "link",
  className = "",
  label,
  subject = "ProWo",
}: Props) {
  const href = contactMailto(subject);

  if (variant === "icon") {
    return (
      <a
        href={href}
        aria-label={`Email ${CONTACT_EMAIL}`}
        title={`Email ${CONTACT_EMAIL}`}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-ink/80 hover:text-ink hover:bg-line/40 transition ${className}`}
      >
        <EmailGlyph className="w-3.5 h-3.5" />
      </a>
    );
  }

  if (variant === "button") {
    return (
      <a
        href={href}
        className={`inline-flex items-center gap-2 rounded-lg bg-surface border border-line text-ink px-4 py-2 text-sm font-semibold hover:border-accent transition ${className}`}
      >
        <EmailGlyph className="w-4 h-4 text-accent" />
        {label ?? CONTACT_EMAIL}
      </a>
    );
  }

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 hover:text-ink transition ${className}`}
    >
      <EmailGlyph className="w-4 h-4 text-accent" />
      <span>{label ?? CONTACT_EMAIL}</span>
    </a>
  );
}

// Envelope glyph — single path so it inherits currentColor and stays
// crisp at any size. Slightly rounded edges to feel modern next to the
// Telegram and X marks.
export function EmailGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 7.4 5.6a1 1 0 0 0 1.2 0L20 7" />
    </svg>
  );
}
