"use client";

import type { Locale } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/messages";

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="mt-auto border-t border-zinc-900 bg-[#070a0e]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-center text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:text-left sm:px-6">
        <p>{t(locale, "footerPrivacy")}</p>
        <div className="flex justify-center gap-4">
          <a
            href="https://github.com/Evreu1pro/EchoPrint-AI"
            className="hover:text-cyan-400"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a href="#how" className="hover:text-cyan-400">
            {t(locale, "footerDocs")}
          </a>
        </div>
      </div>
    </footer>
  );
}
