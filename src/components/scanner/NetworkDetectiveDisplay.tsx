"use client";

import {
  Network,
  Globe,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Server,
} from "lucide-react";
import type { NetworkDetectiveReport } from "@/lib/server/network-detective/types";
import type { Locale } from "@/lib/i18n/messages";
import { t, riskLabel } from "@/lib/i18n/messages";

interface Props {
  report: NetworkDetectiveReport;
  locale: Locale;
}

const riskClass: Record<string, string> = {
  LOW: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  MEDIUM: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  HIGH: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  CRITICAL: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

export function NetworkDetectiveDisplay({ report, locale }: Props) {
  const chKeys = Object.keys(report.headers.clientHints);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Network className="h-5 w-5 text-cyan-400" />
            {t(locale, "sectionNetworkDetective")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{report.summary}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass[report.risk] || ""}`}
        >
          {riskLabel(locale, report.risk)} · {report.riskScore}/100
        </span>
      </div>

      <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[11px] text-zinc-500">
        {report.privacyNote}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card
          icon={<Globe className="h-4 w-4 text-cyan-400" />}
          label={locale === "ru" ? "IP (сервер)" : "IP (server-seen)"}
          value={report.ip.ip || "—"}
          sub={[report.ip.source, report.geo.country, report.geo.city]
            .filter(Boolean)
            .join(" · ")}
        />
        <Card
          icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
          label={locale === "ru" ? "Proxy / VPN" : "Proxy / VPN"}
          value={report.proxy.likelihood.replace(/_/g, " ")}
          sub={`${report.proxy.score}/100`}
        />
        <Card
          icon={<Server className="h-4 w-4 text-rose-400" />}
          label="Client Hints"
          value={String(chKeys.length)}
          sub={
            chKeys.length
              ? chKeys.slice(0, 3).join(", ") + (chKeys.length > 3 ? "…" : "")
              : locale === "ru"
                ? "не пришли на сервер"
                : "none on wire"
          }
        />
      </div>

      {/* Cross-check */}
      {report.crossCheck.performed && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h4 className="text-sm font-semibold text-zinc-200">
            {t(locale, "networkCrossCheck")}
          </h4>
          <ul className="mt-2 space-y-1 text-xs text-zinc-400">
            <li>
              UA match:{" "}
              {report.crossCheck.uaMatch === null
                ? "—"
                : report.crossCheck.uaMatch
                  ? "yes"
                  : "no"}
            </li>
            <li>
              Language match:{" "}
              {report.crossCheck.languageMatch === null
                ? "—"
                : report.crossCheck.languageMatch
                  ? "yes"
                  : "no"}
            </li>
            <li>
              WebRTC vs server IP: {report.crossCheck.webrtcVsPublicIp}
            </li>
          </ul>
          {report.crossCheck.mismatches.length > 0 && (
            <ul className="mt-2 space-y-1">
              {report.crossCheck.mismatches.map((m, i) => (
                <li key={i} className="flex gap-2 text-xs text-amber-300/90">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          )}
          {report.crossCheck.mismatches.length === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {locale === "ru"
                ? "Расхождений client↔server не найдено"
                : "No client↔server mismatches"}
            </p>
          )}
        </div>
      )}

      {/* Findings */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-zinc-300">
          {t(locale, "networkFindings")}
        </h4>
        <ul className="space-y-2">
          {report.findings.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-100">{f.title}</span>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {f.category} · {f.severity}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{f.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Headers preview */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-zinc-300">
          {t(locale, "networkHeaders")}
        </h4>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[280px] text-left text-xs">
            <tbody>
              {(
                [
                  ["User-Agent", report.headers.userAgent],
                  ["Accept-Language", report.headers.acceptLanguage],
                  ["Sec-GPC", report.headers.gpc],
                  ["DNT", report.headers.dnt],
                  ["Sec-Fetch-Site", report.headers.secFetchSite],
                  ["Referer", report.headers.referer],
                ] as const
              ).map(([k, v]) => (
                <tr key={k} className="border-b border-zinc-900">
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{k}</td>
                  <td className="max-w-md truncate px-3 py-2 font-mono text-zinc-300">
                    {v || "—"}
                  </td>
                </tr>
              ))}
              {chKeys.map((k) => (
                <tr key={k} className="border-b border-zinc-900">
                  <td className="whitespace-nowrap px-3 py-2 text-cyan-700">{k}</td>
                  <td className="max-w-md truncate px-3 py-2 font-mono text-zinc-300">
                    {report.headers.clientHints[k]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {report.recommendations.length > 0 && (
        <ul className="space-y-1.5">
          {report.recommendations.map((r, i) => (
            <li key={i} className="text-sm text-zinc-400">
              · {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-lg font-semibold text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-zinc-600">{sub || "—"}</p>
    </div>
  );
}
