"use client";

import type { Locale } from "@/lib/i18n/messages";
import type { ScanHistoryEntry } from "@/lib/history/store";
import { compareReports } from "@/lib/history/compare";
import { GitCompare, ArrowLeft } from "lucide-react";

interface Props {
  locale: Locale;
  left: ScanHistoryEntry;
  right: ScanHistoryEntry;
  onBack: () => void;
}

function fmtDelta(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : `${n}`;
}

function deltaClass(n: number): string {
  if (n === 0) return "text-zinc-500";
  if (n > 0) return "text-amber-300";
  return "text-emerald-300";
}

export function CompareView({ locale, left, right, onBack }: Props) {
  const ru = locale === "ru";
  const diff = compareReports(left.report, right.report);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <GitCompare className="h-5 w-5 text-cyan-400" />
            {ru ? "Сравнение сканов" : "Scan compare"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="text-zinc-300">{left.label}</span>
            {" → "}
            <span className="text-zinc-300">{right.label}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {ru ? "Назад" : "Back"}
        </button>
      </div>

      {diff.notes.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-zinc-300">
          {diff.notes.map((n, i) => (
            <li key={i}>· {n}</li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">
          {ru ? "Скоры (Δ = правый − левый)" : "Scores (Δ = right − left)"}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">{ru ? "Метрика" : "Metric"}</th>
                <th className="px-3 py-2 font-medium">{left.label}</th>
                <th className="px-3 py-2 font-medium">{right.label}</th>
                <th className="px-3 py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {diff.scoreDeltas.map((row) => (
                <tr key={row.key} className="border-t border-zinc-800/80">
                  <td className="px-3 py-2 text-zinc-300">{row.label}</td>
                  <td className="px-3 py-2 tabular-nums text-zinc-400">{row.a}</td>
                  <td className="px-3 py-2 tabular-nums text-zinc-200">{row.b}</td>
                  <td className={`px-3 py-2 tabular-nums font-medium ${deltaClass(row.delta)}`}>
                    {fmtDelta(row.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">
          {ru ? "Сигналы" : "Signals"}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">{ru ? "Поле" : "Field"}</th>
                <th className="px-3 py-2 font-medium">A</th>
                <th className="px-3 py-2 font-medium">B</th>
                <th className="px-3 py-2 font-medium">{ru ? "Изм." : "Chg"}</th>
              </tr>
            </thead>
            <tbody>
              {diff.flags.map((row) => (
                <tr key={row.key} className="border-t border-zinc-800/80">
                  <td className="px-3 py-2 text-zinc-300">{row.label}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-zinc-500">
                    {String(row.a)}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-zinc-300">
                    {String(row.b)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.changed ? (
                      <span className="text-amber-300">{ru ? "да" : "yes"}</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
