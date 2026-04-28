// Robust HTML → plain text. Critical fix: HTML entities must be decoded
// BEFORE tags are stripped, otherwise encoded markup like
// `&lt;div class="content-intro"&gt;&lt;p&gt;` survives the tag-strip pass
// and gets re-introduced as live HTML in the output.
//
// We loop decode→strip up to a few times so even nested-encoded payloads
// (which Greenhouse and Ashby occasionally emit) come out clean.

const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
};

function decodeEntities(s: string): string {
  // Named entities
  let out = s.replace(/&[a-zA-Z]+;/g, (m) => ENTITY_MAP[m] ?? m);
  // Numeric entities (decimal + hex)
  out = out.replace(/&#(\d+);/g, (_, n) => {
    const code = Number(n);
    return Number.isFinite(code) ? String.fromCodePoint(code) : "";
  });
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => {
    const code = parseInt(n, 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : "";
  });
  return out;
}

function stripTagsOnce(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol|section|article)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
}

// Public: turn arbitrary HTML / mojibake-encoded HTML into clean prose.
// Idempotent and safe to call on already-plain text.
export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  let prev = "";
  let out = String(input);
  // Loop decode→strip up to 3 times so double-encoded markup unwinds.
  for (let i = 0; i < 3 && out !== prev; i++) {
    prev = out;
    out = decodeEntities(out);
    out = stripTagsOnce(out);
  }
  return out
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Pull a short, readable snippet for previews (Telegram broadcast,
// /jobs cards, etc.). Drops obvious boilerplate intros (e.g. "About us:").
export function htmlToSnippet(input: string | null | undefined, maxChars = 280): string {
  const text = htmlToText(input);
  if (!text) return "";
  // Take the first paragraph that looks like real content.
  const paras = text.split(/\n+/).map((p) => p.trim()).filter((p) => p.length >= 30);
  let chosen = paras[0] ?? text;
  // Skip generic openers; jump to next paragraph if first is a fluff intro.
  const fluff = /^(about (us|the role|the company|us:)|hi[,!]|ready to|join us)/i;
  if (paras.length > 1 && fluff.test(chosen)) chosen = paras[1];
  if (chosen.length > maxChars) {
    chosen = chosen.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
  }
  return chosen;
}
