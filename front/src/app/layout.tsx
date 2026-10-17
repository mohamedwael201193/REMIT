import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/instrument-sans/wdth.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "REMIT — Provable spending limits for autonomous purchasing agents",
  description:
    "REMIT is mandate governance for agent purchasing: a procurement or treasury team seals a spending mandate, the agent matches quotes inside the limits, and Midnight proves the fill obeyed the mandate before value moves.",
  keywords: [
    "REMIT",
    "agent governance",
    "spending mandates",
    "procurement",
    "autonomous purchasing",
    "zero-knowledge",
    "Midnight",
  ],
  authors: [{ name: "REMIT" }],
  icons: { icon: "/remit-mark.svg" },
  openGraph: {
    title: "REMIT — Provable spending limits for autonomous purchasing agents",
    description:
      "The agent can choose. It cannot exceed. A sealed spending mandate, enforced in zero knowledge, audited one field at a time.",
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
