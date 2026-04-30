import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";

const APP_URL =
  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pow-jobs.vercel.app";

const SITE_TITLE = "ProWo · Find your next job in tech, crypto & finance.";
const SITE_DESCRIPTION =
  "ProWo connects top talent with the fastest-growing companies in tech, AI, crypto, fintech, banking, trading, and global finance. No noise, just signal.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · ProWo",
  },
  description: SITE_DESCRIPTION,
  applicationName: "ProWo",
  keywords: [
    "tech jobs",
    "crypto jobs",
    "finance jobs",
    "fintech",
    "AI jobs",
    "quant",
    "trading",
    "remote",
    "web3",
    "blockchain",
    "hedge fund",
    "prop trading",
  ],
  authors: [{ name: "ProWo", url: APP_URL }],
  creator: "ProWo",
  publisher: "ProWo",
  // OpenGraph + Twitter so links unfurl nicely on social.
  openGraph: {
    type: "website",
    siteName: "ProWo",
    url: APP_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/logo-mark.svg", width: 480, height: 600, alt: "ProWo" }],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: "@ProWoJobs",
    creator: "@ProWoJobs",
    images: ["/logo-mark.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  // The favicon is auto-detected from /app/icon.svg; this block also points
  // to the SVG mark for share previews and PWA icon hints.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/logo-mark.svg",
  },
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
