"use client";

import { AlertTriangle, Radar, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { ExposureReport } from "@/lib/engine/exposure";
import type { Locale } from "@/lib/i18n/messages";
import { t, riskLabel } from "@/lib/i18n/messages";

interface Props {
  exposure: ExposureReport;
  locale: Locale;
}

const riskColor: Record<string, string> = {
  LOW: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  MEDIUM: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  HIGH: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  CRITICAL: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

export function TargetDetectionSummary({ exposure, locale }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-cyan-400" />
          <span className="font-medium text-zinc-100">{t(locale, "sectionExposure")}</span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskColor[exposure.overallRisk] || ""}`}
        >
          {riskLabel(locale, exposure.overallRisk)} · {exposure.exposureScore}/100
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        {exposure.exposedCount}/{exposure.totalVectors} {t(locale, "vectorsTitle").toLowerCase()} ·{" "}
        {exposure.liveHits.length} live hits
      </p>
    </div>
  );
}

export function TargetDetectionDisplay({ exposure, locale }: Props) {
  return (
    <div className="space-y-6">
      <TargetDetectionSummary exposure={exposure} locale={locale} />

      {/* Vectors */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t(locale, "vectorsTitle")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {exposure.vectors.map((v) => (
            <div
              key={v.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-100">{v.name}</p>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    v.available
                      ? "bg-rose-500/15 text-rose-300"
                      : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {v.available ? t(locale, "available") : t(locale, "blocked")}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{v.description}</p>
              <p className="mt-2 text-[11px] text-zinc-600">
                <span className="text-zinc-500">{t(locale, "mitigation")}:</span> {v.mitigation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Live trackers */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <ShieldAlert className="h-4 w-4" />
          {t(locale, "sectionLiveTrackers")}
        </h3>
        {exposure.liveHits.length === 0 ? (
          <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <p>{t(locale, "sectionNoLive")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exposure.liveHits.map((hit) => (
              <div
                key={hit.tracker.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-zinc-100">{hit.tracker.name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskColor[hit.tracker.riskLevel]}`}>
                    {hit.tracker.riskLevel} · {t(locale, "confidence")} {hit.confidence}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{hit.tracker.notes}</p>
                <ul className="mt-2 space-y-1">
                  {hit.matched.slice(0, 8).map((m, i) => (
                    <li key={i} className="font-mono text-[11px] text-zinc-400">
                      <span className="text-cyan-600">{m.type}</span> {m.value}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {exposure.recommendations.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-300">{t(locale, "recommendations")}</h3>
          <ul className="space-y-1.5">
            {exposure.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
