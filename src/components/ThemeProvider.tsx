"use client";

// Tiny no-dependency theme manager. Stores user's pick in localStorage under
// `pablo-theme`. If they haven't picked, we respect OS preference (handled in
// globals.css). The script in ThemeScript below runs BEFORE React hydrates so
// the correct `data-theme` is already on <html> — avoids a light→dark flash.

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface Ctx {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<Ctx | null>(null);

function resolve(t: Theme): "light" | "dark" {
  if (t === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return t;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem("pablo-theme")) as Theme | null;
    const initial: Theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setThemeState(initial);
  }, []);

  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    if (theme !== undefined) {
      try {
        window.localStorage.setItem("pablo-theme", theme);
      } catch {
        // ignore
      }
    }
  }, [theme]);

  // If system mode, re-render when OS preference changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(mql.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const c = useContext(ThemeContext);
  if (!c) {
    // Fallback so components can render even if provider is missing
    return {
      theme: "light",
      resolved: "light",
      setTheme: () => undefined,
    };
  }
  return c;
}

// Inline <script> that runs before hydration to pre-set the attribute,
// preventing a flash of the wrong theme. Include once in <head> via layout.tsx.
export function ThemeScript() {
  const code = `
    (function() {
      try {
        var stored = localStorage.getItem('pablo-theme');
        if (stored === 'light' || stored === 'dark') {
          document.documentElement.setAttribute('data-theme', stored);
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
