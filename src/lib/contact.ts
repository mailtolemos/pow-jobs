// Single source of truth for the public contact channel. Imported anywhere
// we render a "contact us" CTA so we never drift on the address.

export const CONTACT_EMAIL = "hi@prowo.io";

// Convenience helper that yields a `mailto:` URL with an optional subject
// pre-filled — useful when we want the inbox to triage quickly (e.g. "Edit
// my submitted role" vs. "General question").
export function contactMailto(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${CONTACT_EMAIL}${qs ? `?${qs}` : ""}`;
}
