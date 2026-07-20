"use client";

import { Fingerprint, Github } from "lucide-react";
import type { Locale } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/messages";

interface HeaderProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export function Header({ locale, onLocaleChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[#0b0f14]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
            <Fingerprint className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-zinc-50 sm:text-lg">
              {t(locale, "brand")}
            </h1>
            <p className="truncate text-[11px] text-zinc-500 sm:text-xs">
              {t(locale, "tagline")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="flex rounded-md border border-zinc-800 bg-zinc-900/80 p-0.5 text-xs"
            role="group"
            aria-label="Language"
          >
            {(["en", "ru"] as Locale[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onLocaleChange(code)}
                className={`rounded px-2.5 py-1 font-medium uppercase transition-colors ${
                  locale === code
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          <a
            href="https://github.com/Evreu1pro/EchoPrint-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
