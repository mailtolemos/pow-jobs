import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Theme-aware tokens wired to CSS custom properties in globals.css.
      // `bg-paper` / `text-ink` etc. automatically flip when [data-theme="dark"]
      // is set on <html>. Keeps existing call sites working across modes.
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        accent2: "rgb(var(--color-accent2) / <alpha-value>)",
        dim: "rgb(var(--color-muted) / <alpha-value>)",
        good: "rgb(var(--color-good) / <alpha-value>)",
        warn: "rgb(var(--color-warn) / <alpha-value>)",
        bad: "rgb(var(--color-bad) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 4px 12px -4px rgb(var(--color-accent2) / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
