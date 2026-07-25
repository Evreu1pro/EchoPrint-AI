"use client";

// ============================================================
// M7 · Data Transparency Lab
// Google column (Privacy Sandbox) | Meta column (Pixel / Advanced Matching)
// + Live Tracker Radar with a "what would they know about me" briefing.
// ============================================================

import { useMemo, useState } from "react";
import type { Module7AdTech, RadarEvent, SandboxProbe } from "@/lib/modules/types";
import { runRadarProbes } from "@/lib/modules/m7-adtech/radar";

interface Props {
  m7: Module7AdTech;
  ru?: boolean;
}

function statusStyle(status: SandboxProbe["status"]): { cls: string; label: string } {
  switch (status) {
    case "open":
      return { cls: "border-rose-800 bg-rose-950/40 text-rose-300", label: "OPEN" };
    case "empty":
      return { cls: "border-amber-800 bg-amber-950/40 text-amber-300", label: "EMPTY" };
    case "blocked":
      return { cls: "border-emerald-800 bg-emerald-950/40 text-emerald-300", label: "BLOCKED" };
    case "error":
      return { cls: "border-zinc-700 bg-zinc-900 text-zinc-400", label: "ERROR" };
    default:
      return { cls: "border-zinc-700 bg-zinc-900 text-zinc-400", label: "N/A" };
  }
}

function ProbeCard({ probe, ru }: { probe: SandboxProbe; ru?: boolean }) {
  const [open, setOpen] = useState(false);
  const s = statusStyle(probe.status);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-zinc-100">{probe.label}</span>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] tracking-wide ${s.cls}`}>
          {s.label}
        </span>
      </div>
      {probe.values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {probe.values.map((v) => (
            <span
              key={v}
              className="rounded border border-blue-800 bg-blue-900/20 px-2 py-0.5 font-mono text-[11px] text-blue-300"
            >
              {v}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{probe.detail}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)
        }
        className="mt-2 text-[11px] text-zinc-500 underline decoration-dotted hover:text-zinc-300"
      >
        {ru ? "Почему это важно" : "Why this matters"}
      </button>
      {open && (
        <p className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-[11px] leading-relaxed text-zinc-400">
          {probe.why}
        </p>
      )}
    </div>
  );
}

function RadarLine({ e }: { e: RadarEvent }) {
  const color =
    e.status === "blocked"
      ? "text-emerald-400"
      : e.status === "timeout"
        ? "text-amber-400"
        : "text-rose-400";
  const word = e.status === "blocked" ? "blocked" : e.status === "timeout" ? "timeout" : "loaded";
  return (
    <div className="whitespace-pre-wrap break-all text-zinc-500">
      <span className="text-zinc-600">[{e.clock}]</span>{" "}
      <span className="text-zinc-300">{e.vendor}</span>{" "}
      <span className="text-zinc-600">
        {e.method} {e.domain}
        {e.path}
      </span>{" "}
      <span className={color}>
        {word}
        {e.ms !== null ? ` ${e.ms}ms` : ""}
      </span>{" "}
      <span className="text-zinc-600">— {e.note}</span>
    </div>
  );
}

export default function M7TransparencyLab({ m7, ru = false }: Props) {
  const [live, setLive] = useState<RadarEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [briefing, setBriefing] = useState(false);

  const events = useMemo(() => (live.length ? live : m7.radar), [live, m7.radar]);
  const googleProbes = m7.sandbox;
  const score = m7.transparencyScore;
  const scoreCls =
    score >= 70
      ? "border-emerald-800 bg-emerald-900/30 text-emerald-400"
      : score >= 40
        ? "border-amber-800 bg-amber-900/30 text-amber-400"
        : "border-rose-800 bg-rose-900/30 text-rose-400";

  const rerun = async () => {
    setRunning(true);
    setLive([]);
    await runRadarProbes((e) => setLive((prev) => [...prev, e]));
    setRunning(false);
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">
            M7 · {ru ? "Лаборатория прозрачности данных" : "Data Transparency Lab"}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {ru
              ? "Что рекламные системы узнали бы о тебе с этого визита. Всё считается в браузере, ничего не отправляется."
              : "What ad platforms would learn from this visit. Everything is computed in-browser and nothing is uploaded."}
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs ${scoreCls}`}>
          {ru ? "Приватность" : "Privacy Score"}: {score}/100
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---- Google column ---- */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            {ru ? "Интересы браузера (Google)" : "Browser interests (Google)"}
          </h3>
          {googleProbes.map((p) => (
            <ProbeCard key={p.id} probe={p} ru={ru} />
          ))}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-400">
            {m7.google.findings.map((f) => (
              <p key={f} className="mb-1 last:mb-0">
                · {f}
              </p>
            ))}
          </div>
        </div>

        {/* ---- Meta column ---- */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-pink-400">
            {ru ? "Социальное сопоставление (Meta)" : "Social matching (Meta)"}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: "Meta Pixel (fbq)", ok: !m7.meta.fbqPresent, v: m7.meta.fbqPresent ? "loaded" : "not loaded" },
              { k: "_fbp", ok: !m7.meta.fbp, v: m7.meta.fbp ? "present" : "absent" },
              { k: "_fbc (ad click)", ok: !m7.meta.fbc, v: m7.meta.fbc ? "present" : "absent" },
              {
                k: "Advanced Matching",
                ok: m7.meta.advancedMatchingAttempts.length === 0,
                v: m7.meta.advancedMatchingAttempts.length
                  ? `${m7.meta.advancedMatchingAttempts.length} read attempt(s)`
                  : "no field reads",
              },
              {
                k: "CAPI beacons",
                ok: m7.meta.capiBeacons === 0,
                v: `${m7.meta.capiBeacons} to facebook.com/tr`,
              },
              { k: "Pixel IDs", ok: m7.meta.pixelIds.length === 0, v: m7.meta.pixelIds.join(", ") || "none" },
            ].map((row) => (
              <div key={row.k} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">{row.k}</div>
                <div
                  className={`mt-0.5 font-mono text-xs ${row.ok ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {row.v}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-400">
            {m7.meta.findings.map((f) => (
              <p key={f} className="mb-1 last:mb-0">
                · {f}
              </p>
            ))}
          </div>
          {m7.meta.advancedMatchingAttempts.length > 0 && (
            <div className="rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-[11px] text-rose-200">
              {ru
                ? "Сторонний скрипт читал чувствительные поля формы:"
                : "A third-party script read sensitive form fields:"}
              <ul className="mt-1 space-y-0.5 font-mono">
                {m7.meta.advancedMatchingAttempts.slice(0, 6).map((a, i) => (
                  <li key={`${a.field}-${i}`}>
                    {a.field} ← {a.reader}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ---- Live radar ---- */}
      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {ru ? "Живой радар трекеров" : "Live tracker radar"}
            <span className="ml-2 font-normal normal-case text-zinc-600">
              {m7.blockedCount} blocked / {m7.loadedCount} loaded
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={rerun}
              disabled={running}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {running
                ? ru
                  ? "зондирую…"
                  : "probing…"
                : ru
                  ? "Перезапустить радар"
                  : "Re-run radar"}
            </button>
            <button
              type="button"
              onClick={() => setBriefing((v) => !v)}
              className="rounded-md border border-amber-800 bg-amber-950/40 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-900/40"
            >
              {ru ? "Что они бы узнали обо мне?" : "What would they know about me?"}
            </button>
          </div>
        </div>
        <div className="h-44 overflow-y-auto rounded-xl border border-zinc-800 bg-black p-3 font-mono text-[11px] leading-relaxed">
          {events.length === 0 ? (
            <p className="text-zinc-600">
              {ru ? "Ни одного ad-tech запроса не зафиксировано." : "No ad-tech request observed."}
            </p>
          ) : (
            events.map((e, i) => <RadarLine key={`${e.domain}-${e.t}-${i}`} e={e} />)
          )}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
          {ru
            ? "Зонды — реальные запросы к эндпоинтам рекламных систем: так видно, кого режет блокировщик. Никакие твои данные в них не передаются — только факт загрузки скрипта."
            : "Probes are real requests to ad-tech endpoints — that is how we can tell what your blocker cuts. No data of yours is sent, only the script load itself is timed."}
        </p>
      </div>

      {briefing && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {m7.wouldKnow.map((block) => (
            <div key={block.vendor} className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                {block.vendor}
              </h4>
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-zinc-300">
                {block.lines.map((l) => (
                  <li key={l}>· {l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-1 text-[11px] leading-relaxed text-zinc-500">
        {m7.findings.map((f) => (
          <p key={f}>· {f}</p>
        ))}
      </div>
    </section>
  );
}
