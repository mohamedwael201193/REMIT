import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/instrument-sans/wdth.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "REMIT — Private execution infrastructure",
  description:
    "REMIT is a privacy-first dark-pool trading protocol. Delegate execution to an agent inside a private mandate — Midnight proves the fill obeyed the mandate before value moves.",
  keywords: [
    "REMIT",
    "private execution",
    "dark pool",
    "mandates",
    "zero-knowledge",
    "Midnight",
  ],
  authors: [{ name: "REMIT" }],
  icons: { icon: "/remit-mark.svg" },
  openGraph: {
    title: "REMIT — Trade on your rules. Without revealing the rules.",
    description:
      "A dark pool where the trader's rules are as private as the trade, and just as enforced.",
    siteName: "REMIT",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1512",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
