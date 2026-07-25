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
  title: "EchoPrint AI — M1–M5 fingerprint lab",
  description:
    "Educational scanner: network intel, hardware stable_id, spoof/protection scores. History stays local.",
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
    title: "EchoPrint AI — M1–M5 fingerprint lab",
    description:
      "Separate empty Chrome from hardened browsers. Uniqueness, spoof, protection, vulnerability.",
    type: "website",
    url: "https://echo-print-ai.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "EchoPrint AI",
    description: "M1–M5 browser fingerprint integrity lab",
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
