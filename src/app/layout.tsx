import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ProWo — Find your next job in tech, crypto & finance.",
  description:
    "ProWo connects top talent with the fastest-growing companies in tech, AI, crypto, fintech, banking, trading, and global finance. No noise, just signal.",
};

// Explicit viewport so phones honour our responsive breakpoints (otherwise
// Mobile Safari assumes a 980px viewport and our layout looks zoomed out).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0C" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body className="bg-paper text-ink overflow-x-hidden">
        <ThemeProvider>
          <Nav />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
