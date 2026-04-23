"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={theme === "system" ? `System (${resolved})` : theme}
      className="rounded-lg border border-line text-muted hover:text-ink hover:border-accent/60 px-2.5 py-1 text-xs font-medium transition"
    >
      {resolved === "dark" ? "☾ Dark" : "☀ Light"}
    </button>
  );
}
