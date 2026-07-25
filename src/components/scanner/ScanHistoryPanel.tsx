"use client";

import type { Locale } from "@/lib/i18n/messages";
import type { ScanHistoryEntry } from "@/lib/history/store";
import { shortIp } from "@/lib/history/ip-history";
import { History, Trash2, GitCompare, Eye } from "lucide-react";

interface Props {
  locale: Locale;
  entries: ScanHistoryEntry[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onView: (entry: ScanHistoryEntry) => void;
  onCompare: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function ScanHistoryPanel({
  locale,
  entries,
  selectedIds,
  onToggleSelect,
  onView,
  onCompare,
  onRemove,
  onClear,
}: Props) {
  const ru = locale === "ru";

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">
        <div className="mb-1 flex items-center gap-2 font-medium text-zinc-300">
          <History className="h-4 w-4 text-cyan-400" />
          {ru ? "История сканов" : "Scan history"}
        </div>
        {ru
          ? "После скана отчёты сохраняются только в localStorage (макс. 10). Можно сравнивать Chrome и hardened."
          : "After a scan, reports stay in localStorage only (max 10). Compare Chrome vs hardened side by side."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <History className="h-4 w-4 text-cyan-400" />
          {ru ? "История" : "History"}{" "}
          <span className="font-normal text-zinc-500">({entries.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={selectedIds.length !== 2}
            onClick={onCompare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 enabled:hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <GitCompare className="h-3.5 w-3.5" />
            {ru ? "Сравнить 2" : "Compare 2"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            {ru ? "Очистить" : "Clear"}
          </button>
        </div>
      </div>
      <p className="mb-3 text-[11px] text-zinc-500">
        {ru
          ? "Отметьте два скана чекбоксом → Сравнить. Данные не уходят на сервер."
          : "Tick two scans → Compare. Data never leaves this browser."}
      </p>
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {entries.map((e) => {
          const checked = selectedIds.includes(e.id);
          // Same hardware id on a different IP = the money shot of the whole tool.
          const sameIdOtherIp = entries.some(
            (o) =>
              o.id !== e.id &&
              o.summary.stableId === e.summary.stableId &&
              Boolean(o.summary.ip) &&
              Boolean(e.summary.ip) &&
              o.summary.ip !== e.summary.ip
          );
          return (
            <li
              key={e.id}
              className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                checked
                  ? "border-cyan-500/40 bg-cyan-500/5"
                  : "border-zinc-800 bg-zinc-950/40"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleSelect(e.id)}
                className="mt-1 accent-cyan-500"
                aria-label={ru ? "Выбрать для сравнения" : "Select for compare"}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-200">{e.label}</span>
                  <span className="tabular-nums text-zinc-500">
                    {new Date(e.savedAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-zinc-500">
                  <span>track {e.summary.trackabilityPercent}%</span>
                  <span>A {e.summary.uniqueness}</span>
                  <span>B {e.summary.spoof}</span>
                  <span>C {e.summary.aggressiveness}</span>
                  <span>prot {e.summary.protection}</span>
                  <span
                    className={`font-mono ${sameIdOtherIp ? "text-amber-300" : "text-zinc-400"}`}
                    title={
                      (e.summary.ip ?? "") +
                      (e.summary.asn ? ` · ${e.summary.asn} ${e.summary.asOrg ?? ""}` : "") +
                      (e.summary.city ? ` · ${e.summary.city}` : "")
                    }
                  >
                    IP {shortIp(e.summary.ip)}
                  </span>
                  {e.summary.asn ? (
                    <span className="text-zinc-500">{e.summary.asn}</span>
                  ) : null}
                  <span className="text-zinc-500">
                    Δ {e.summary.geoDistanceKm ?? "—"}km
                  </span>
                  <span className="truncate font-mono text-[10px] text-zinc-600">
                    {e.summary.stableId.slice(0, 12)}…
                  </span>
                </div>
                {sameIdOtherIp ? (
                  <div className="mt-1 text-[10px] font-medium text-amber-300/90">
                    {ru
                      ? "тот же stable_id при другом IP — смена IP не спасла"
                      : "same stable_id on a different IP — the IP change did not help"}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onView(e)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  title={ru ? "Открыть" : "View"}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  className="rounded p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
                  title={ru ? "Удалить" : "Remove"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
