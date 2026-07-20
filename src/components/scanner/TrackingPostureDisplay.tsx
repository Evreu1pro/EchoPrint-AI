"use client";

import {
  Megaphone,
  Shield,
  ShieldOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Network,
  Fingerprint,
} from "lucide-react";
import type { TrackingPostureReport, SurfaceStatus } from "@/lib/engine/tracking-posture";
import type { Locale } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/messages";

interface Props {
  tracking: TrackingPostureReport;
  locale: Locale;
}

const statusStyle: Record<SurfaceStatus, string> = {
  open: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  restricted: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  blocked: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  unknown: "bg-zinc-500/15 text-zinc-400 border-zinc-600",
};

const statusLabel: Record<SurfaceStatus, { en: string; ru: string }> = {
  open: { en: "OPEN", ru: "ОТКРЫТО" },
  restricted: { en: "LIMITED", ru: "ОГРАНИЧЕНО" },
  blocked: { en: "BLOCKED", ru: "БЛОК" },
  unknown: { en: "?", ru: "?" },
};

function levelColor(level: string): string {
  if (level === "maximum" || level === "strict") return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (level === "standard") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-rose-400 border-rose-500/30 bg-rose-500/10";
}

export function TrackingPostureDisplay({ tracking, locale }: Props) {
  const ads = tracking.adApis.filter((a) => a.category === "ads" || a.category === "cross_site");
  const fp = tracking.adApis.filter((a) => a.category === "fingerprint" || a.category === "identity");
  const privacy = tracking.adApis.filter((a) => a.category === "privacy_signal" || a.category === "network");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Megaphone className="h-5 w-5 text-cyan-400" />
            {t(locale, "sectionTracking")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{tracking.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${levelColor(tracking.protectionLevel)}`}>
            {t(locale, "protectionLevel")}: {tracking.protectionLevel}
          </span>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
            {tracking.browserProfile.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Score row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<ShieldOff className="h-4 w-4 text-rose-400" />}
          label={t(locale, "trackingSurface")}
          value={tracking.trackingSurfaceScore}
          hint={locale === "ru" ? "Выше = больше рекламного/глубокого трекинга" : "Higher = more ad/deep tracking surface"}
          danger
        />
        <Metric
          icon={<Shield className="h-4 w-4 text-emerald-400" />}
          label={t(locale, "protectionScore")}
          value={tracking.protectionScore}
          hint={locale === "ru" ? "Выше = сильнее защита" : "Higher = stronger protection"}
        />
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-xs text-zinc-500">{t(locale, "networkBlocks")}</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {tracking.blockedNetworkCount}
            <span className="text-sm font-normal text-zinc-500">
              /{tracking.networkProbes.length}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            {locale === "ru"
              ? "Скрипты трекеров, которые не загрузились"
              : "Major tracker scripts that failed to load"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-zinc-300">
        <p className="font-medium text-cyan-200">{t(locale, "vsChrome")}</p>
        <p className="mt-1 text-zinc-400">{tracking.vsStockChrome}</p>
      </div>

      {/* Privacy flags */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Flag ok={tracking.privacySignals.gpc === true} label={`GPC: ${tracking.privacySignals.gpc === true ? "on" : tracking.privacySignals.gpc === false ? "off" : "n/a"}`} />
        <Flag ok={tracking.privacySignals.brave} label="Brave" />
        <Flag ok={tracking.privacySignals.rfpLike} label="RFP-like" />
        <Flag
          ok={tracking.privacySignals.thirdPartyCookiesLikelyBlocked === true}
          label={locale === "ru" ? "3P cookies ≈ block" : "3P cookies ≈ blocked"}
        />
      </div>

      <ProbeGroup
        title={t(locale, "adApis")}
        icon={<Megaphone className="h-4 w-4 text-orange-400" />}
        probes={ads}
        locale={locale}
      />
      <ProbeGroup
        title={t(locale, "deepIdentity")}
        icon={<Fingerprint className="h-4 w-4 text-rose-400" />}
        probes={fp}
        locale={locale}
      />
      <ProbeGroup
        title={t(locale, "privacyNetwork")}
        icon={<Network className="h-4 w-4 text-cyan-400" />}
        probes={privacy}
        locale={locale}
      />

      {/* Network probe table */}
      {tracking.networkProbes.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-zinc-300">{t(locale, "trackerScriptProbe")}</h4>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Tracker</th>
                  <th className="px-3 py-2 font-medium">{locale === "ru" ? "Статус" : "Status"}</th>
                  <th className="px-3 py-2 font-medium">ms</th>
                </tr>
              </thead>
              <tbody>
                {tracking.networkProbes.map((n) => (
                  <tr key={n.id} className="border-b border-zinc-900">
                    <td className="px-3 py-2 text-zinc-200">{n.label}</td>
                    <td className="px-3 py-2">
                      {n.blocked ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {locale === "ru" ? "заблокирован" : "blocked"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400">
                          <XCircle className="h-3.5 w-3.5" />
                          {locale === "ru" ? "загружен" : "loaded"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500">
                      {n.latencyMs ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            {locale === "ru"
              ? "Пробы идут только при вашем скане; скрипты не остаются на странице."
              : "Probes run only during your scan; scripts are removed immediately."}
          </p>
        </div>
      )}

      {tracking.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            {t(locale, "recommendations")}
          </h4>
          <ul className="space-y-1.5">
            {tracking.recommendations.map((r, i) => (
              <li key={i} className="text-sm text-zinc-400">
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  danger?: boolean;
}) {
  const tone =
    danger
      ? value >= 60
        ? "text-rose-400"
        : value >= 35
          ? "text-amber-400"
          : "text-emerald-400"
      : value >= 65
        ? "text-emerald-400"
        : value >= 40
          ? "text-amber-400"
          : "text-rose-400";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
        <span className="text-sm font-normal text-zinc-600">/100</span>
      </p>
      <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>
    </div>
  );
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 ${
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-zinc-700 bg-zinc-900 text-zinc-500"
      }`}
    >
      {label}
    </span>
  );
}

function ProbeGroup({
  title,
  icon,
  probes,
  locale,
}: {
  title: string;
  icon: React.ReactNode;
  probes: TrackingPostureReport["adApis"];
  locale: Locale;
}) {
  if (!probes.length) return null;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
        {icon}
        {title}
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {probes.map((p) => (
          <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-zinc-100">{p.name}</p>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${statusStyle[p.status]}`}>
                {statusLabel[p.status][locale]}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{p.detail}</p>
            <p className="mt-1.5 text-[11px] text-zinc-600">{p.trackingImpact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
