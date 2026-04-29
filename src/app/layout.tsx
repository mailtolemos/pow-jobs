import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ProWo — Find your next move.",
  description:
    "ProWo connects top talent with the fastest-growing companies in crypto, fintech, and global finance. No noise, just signal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body className="bg-paper text-ink">
        <ThemeProvider>
          <Nav />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
