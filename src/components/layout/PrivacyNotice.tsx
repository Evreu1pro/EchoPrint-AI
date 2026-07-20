"use client";

import { Shield } from "lucide-react";
import type { Locale } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/messages";

export function PrivacyNotice({ locale }: { locale: Locale }) {
  return (
    <div className="mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-left">
      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
      <div>
        <p className="text-sm font-medium text-cyan-100">{t(locale, "privacyTitle")}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
          {t(locale, "privacyBody")}
        </p>
      </div>
    </div>
  );
}
