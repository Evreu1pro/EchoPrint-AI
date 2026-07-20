import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EchoPrint AI — Browser fingerprint integrity lab",
  description:
    "Client-side educational scanner for browser uniqueness, spoof/integrity detection, and tracker exposure. No data leaves your device.",
  keywords: [
    "browser fingerprint",
    "canvas fingerprint",
    "webgl fingerprint",
    "privacy",
    "anti-detect",
    "tracker exposure",
    "device integrity",
  ],
  authors: [{ name: "EchoPrint AI" }],
  openGraph: {
    title: "EchoPrint AI — Browser fingerprint integrity lab",
    description:
      "Measure uniqueness, integrity (spoof noise), and tracker exposure — fully in your browser.",
    type: "website",
    url: "https://echo-print-ai.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "EchoPrint AI",
    description: "Browser fingerprint integrity lab",
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
        <Toaster />
      </body>
    </html>
  );
}
