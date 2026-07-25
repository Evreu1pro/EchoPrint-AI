import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EchoPrint AI — Browser fingerprint & exposure lab",
  description:
    "Educational lab: network intel, hardware stable_id, spoof/protection scores, AdTech transparency (M7). History stays in localStorage.",
  keywords: [
    "browser fingerprint",
    "canvas fingerprint",
    "webgl fingerprint",
    "privacy",
    "anti-detect",
    "tracker exposure",
    "device integrity",
    "JA3",
    "Privacy Sandbox",
    "AdTech transparency",
    "stable_id",
  ],
  authors: [{ name: "Evreu1pro" }, { name: "EchoPrint AI" }],
  metadataBase: new URL("https://echo-print-ai.vercel.app"),
  openGraph: {
    title: "EchoPrint AI — fingerprint & exposure lab",
    description:
      "Separate empty Chrome from hardened browsers. Network map, stable_id, A/B/C/D scores, AdTech radar. Local-first history.",
    type: "website",
    url: "https://echo-print-ai.vercel.app",
    siteName: "EchoPrint AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "EchoPrint AI",
    description:
      "Browser fingerprint lab — network intel, stable_id, scores, AdTech transparency",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070a0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased bg-[#070a0e] text-zinc-100`}
      >
        {children}
      </body>
    </html>
  );
}
