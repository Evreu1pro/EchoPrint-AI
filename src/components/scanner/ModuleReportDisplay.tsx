"use client";

import dynamic from "next/dynamic";
import type { FullModuleReport } from "@/lib/modules/types";
import type { Locale } from "@/lib/i18n/messages";

// Map and ad-tech lab touch window/document only — keep them out of SSR.
const M1Map = dynamic(() => import("./M1Map"), { ssr: false });
const M7TransparencyLab = dynamic(() => import("./M7TransparencyLab"), { ssr: false });
import {
  Cpu,
  Shield,
  Crosshair,
  AlertTriangle,
  Fingerprint,
  MapPin,
  Network,
} from "lucide-react";

interface Props {
  report: FullModuleReport;
  locale: Locale;
}

function barColor(score: number, invert = false): string {
  const s = invert ? 100 - score : score;
  if (s >= 70) return "bg-rose-500";
  if (s >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

function ScoreBar({
  label,
  score,
  sub,
  invert,
}: {
  label: string;
  score: number;
  sub: string;
  invert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-medium text-zinc-100">{label}</span>
        <span className="tabular-nums text-zinc-300">{score}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barColor(score, invert)}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{sub}</p>
    </div>
  );
}

/** Simple SVG map: two points + mismatch line */
function MismatchMap({
  geoLat,
  geoLon,
  tzLat,
  tzLon,
  distanceKm,
  mismatch,
}: {
  geoLat: number | null;
  geoLon: number | null;
  tzLat: number | null;
  tzLon: number | null;
  distanceKm: number | null;
  mismatch: boolean;
}) {
  if (geoLat == null || geoLon == null || tzLat == null || tzLon == null) {
    return (
      <p className="text-xs text-zinc-500">
        Map needs GeoIP lat/lon + known timezone coords (unavailable offline / localhost).
      </p>
    );
  }

  // project lon/lat to 0..100 viewBox
  const project = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
  };
  const a = project(geoLat, geoLon);
  const b = project(tzLat, tzLon);

  return (
    <div>
      <svg viewBox="0 0 100 56" className="w-full rounded-lg border border-zinc-800 bg-zinc-950">
        {/* grid */}
        <rect width="100" height="56" fill="#09090b" />
        {[20, 40, 60, 80].map((x) => (
          <line key={x} x1={x} y1={0} x2={x} y2={56} stroke="#27272a" strokeWidth="0.2" />
        ))}
        {[14, 28, 42].map((y) => (
          <line key={y} x1={0} y1={y} x2={100} y2={y} stroke="#27272a" strokeWidth="0.2" />
        ))}
        {mismatch && (
          <line
            x1={a.x}
            y1={a.y * 0.56}
            x2={b.x}
            y2={b.y * 0.56}
            stroke="#f43f5e"
            strokeWidth="0.6"
            strokeDasharray="1.5 1"
          />
        )}
        <circle cx={a.x} cy={a.y * 0.56} r="1.8" fill="#22d3ee" />
        <circle cx={b.x} cy={b.y * 0.56} r="1.8" fill="#a78bfa" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
          GeoIP ({geoLat.toFixed(1)}, {geoLon.toFixed(1)})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
          Timezone point
        </span>
        {distanceKm != null && (
          <span className={mismatch ? "text-rose-400" : "text-emerald-400"}>
            Δ {distanceKm} km {mismatch ? "(MISMATCH >1000km)" : "(ok)"}
          </span>
        )}
      </div>
    </div>
  );
}

export function ModuleReportDisplay({ report, locale }: Props) {
  const { m1, m2, m3, m4, m5 } = report;
  const ru = locale === "ru";

  return (
    <div className="space-y-8">
      {/* CreepJS-style headline */}
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 to-transparent p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {ru ? "Вердикт" : "Verdict"}
        </p>
        <p className="mt-2 text-xl font-semibold leading-snug text-white sm:text-2xl">
          {ru
            ? `Вас можно отследить на ~${m4.trackabilityPercent}% сайтов с fingerprint-пробами`
            : `You can be tracked on ~${m4.trackabilityPercent}% of fingerprinting sites`}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{m4.trackabilityNarrative}</p>
      </div>

      {/* M4 scores */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Crosshair className="h-5 w-5 text-cyan-400" />
          {ru ? "4 скора" : "Four scores"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreBar label={`A · ${ru ? "Уникальность" : "Uniqueness"}`} score={m4.uniqueness} sub={`${m4.uniquenessLabel} · ~${m4.uniquenessBits} bits`} />
          <ScoreBar label={`B · ${ru ? "Подставной" : "Spoof / undercover"}`} score={m4.spoof} sub={m4.spoofLabel} />
          <ScoreBar label={`C · ${ru ? "Агрессивность (блок)" : "Aggressiveness"}`} score={m4.aggressiveness} sub={m4.aggressivenessLabel} invert />
          <ScoreBar label={`D · ${ru ? "Уязвимость" : "Vulnerability"}`} score={m4.vulnerability} sub={m4.vulnerabilityLabel} />
        </div>
        {(m4.formulaNotes.length > 0 || m4.vulnerabilityNotes?.length) && (
          <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <summary className="cursor-pointer text-xs text-zinc-300">
              {ru ? "Из чего складываются скоры" : "How these scores add up"}
            </summary>
            {m4.formulaNotes.length > 0 && (
              <>
                <p className="mt-2 text-[11px] font-semibold text-zinc-400">
                  B · {ru ? "Подставной" : "Spoof"}
                </p>
                <ul className="mt-1 space-y-1 text-[11px] text-zinc-600">
                  {m4.formulaNotes.map((n, i) => (
                    <li key={i}>· {n}</li>
                  ))}
                </ul>
              </>
            )}
            {m4.vulnerabilityNotes?.length ? (
              <>
                <p className="mt-3 text-[11px] font-semibold text-zinc-400">
                  D · {ru ? "Уязвимость" : "Vulnerability"}
                </p>
                <ul className="mt-1 space-y-1 text-[11px] text-zinc-600">
                  {m4.vulnerabilityNotes.map((n, i) => (
                    <li key={i}>· {n}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </details>
        )}

        {m4.recommendations?.length ? (
          <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {ru ? "Что с этим делать" : "What to do about it"}
            </p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-300">
              {m4.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-400">→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* M1 map + network */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Network className="h-5 w-5 text-cyan-400" />
          M1 · {ru ? "Сетевой детектив" : "Network detective"}
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-zinc-400">
              <MapPin className="h-3.5 w-3.5" />
              GeoIP vs Timezone
            </p>
            <M1Map
              geo={
                m1.geoTimezoneMismatch.geoLat !== null && m1.geoTimezoneMismatch.geoLon !== null
                  ? [m1.geoTimezoneMismatch.geoLat, m1.geoTimezoneMismatch.geoLon]
                  : null
              }
              tz={
                m1.geoTimezoneMismatch.tzLat !== null && m1.geoTimezoneMismatch.tzLon !== null
                  ? [m1.geoTimezoneMismatch.tzLat, m1.geoTimezoneMismatch.tzLon]
                  : null
              }
              distanceKm={m1.geoTimezoneMismatch.distanceKm}
              ru={ru}
            />
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
                {ru ? "Схематичная версия (без тайлов)" : "Schematic version (no tiles)"}
              </summary>
              <div className="mt-2">
                <MismatchMap {...m1.geoTimezoneMismatch} />
              </div>
            </details>
          </div>
          <div className="space-y-2 text-xs text-zinc-400">
            <p>
              <span className="text-zinc-500">IP:</span> {m1.ipIntel.ip || "—"} ·{" "}
              {m1.ipIntel.connectionType} · VPN {m1.ipIntel.vpnScore}
            </p>
            <p>
              <span className="text-zinc-500">ASN:</span> {m1.ipIntel.asn || "—"}{" "}
              {m1.ipIntel.asnDbName || m1.ipIntel.asOrg || ""}
              {m1.ipIntel.asnKind ? (
                <span
                  className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    m1.ipIntel.asnKind === "vpn" || m1.ipIntel.asnKind === "proxy"
                      ? "bg-rose-500/15 text-rose-300"
                      : m1.ipIntel.asnKind === "hosting" ||
                          m1.ipIntel.asnKind === "cdn" ||
                          m1.ipIntel.asnKind === "transit"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-zinc-700/40 text-zinc-300"
                  }`}
                >
                  {m1.ipIntel.asnKind}
                  {m1.ipIntel.classificationConfidence
                    ? ` · ${m1.ipIntel.classificationConfidence}`
                    : ""}
                </span>
              ) : null}
            </p>
            <p className="text-[11px] text-zinc-500">
              {ru ? "Источник" : "Source"}: {m1.ipIntel.source}
              {m1.ipIntel.source === "ipwho"
                ? ru
                  ? " · для точных privacy-флагов задайте IPINFO_TOKEN"
                  : " · set IPINFO_TOKEN for ipinfo.io privacy flags"
                : ""}
            </p>
            {m1.ipIntel.classificationReasons?.length ? (
              <ul className="space-y-0.5 text-[11px] text-zinc-500">
                {m1.ipIntel.classificationReasons.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            ) : null}
            {m1.ipHistory?.summary ? (
              <div
                className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                  m1.ipHistory.ipChanged
                    ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-400"
                }`}
              >
                <div className="mb-0.5 font-semibold">
                  {ru ? "История IP" : "IP history"}
                </div>
                {m1.ipHistory.summary}
              </div>
            ) : null}
            <p>
              <span className="text-zinc-500">JA3:</span>{" "}
              {m1.tls.ja3 || m1.tls.note.slice(0, 80)}
            </p>
            <p>
              <span className="text-zinc-500">Header order:</span> {m1.headerOrder.browserGuess}{" "}
              ({m1.headerOrder.signature.slice(0, 8)})
            </p>
            <p>
              <span className="text-zinc-500">WebRTC vs HTTP:</span> {m1.webrtcVsHttp.status}
            </p>
            <p className="text-zinc-500">{m1.webrtcVsHttp.detail}</p>
            <ul className="mt-2 space-y-1">
              {m1.findings.map((f, i) => (
                <li key={i} className="text-zinc-500">
                  · {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* M2 hardware */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Cpu className="h-5 w-5 text-cyan-400" />
          M2 · {ru ? "Железо (stable_id)" : "Hardware (stable_id)"}
        </h3>
        <div className="mb-3 space-y-1">
          <p className="font-mono text-sm text-cyan-300/90">
            <span className="mr-2 font-sans text-[11px] uppercase tracking-wider text-zinc-500">
              browser
            </span>
            {m2.browserId ?? m2.stableId}
          </p>
          {m2.deviceId ? (
            <p className="font-mono text-sm text-violet-300/90">
              <span className="mr-2 font-sans text-[11px] uppercase tracking-wider text-zinc-500">
                device
              </span>
              {m2.deviceId}
            </p>
          ) : null}
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          {ru
            ? "Одинаковый на всех браузерах одного ПК — это нормально. Коллизия «пустой Chrome = основной» объясняется железом."
            : "Same across browsers on one PC — expected. Empty Chrome vs hardened still share this ID."}
        </p>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <Row k="WebGL" v={m2.webgl.renderer.slice(0, 80)} />
          <Row k="Canvas" v={m2.canvas.combined} />
          <Row
            k="Audio"
            v={
              m2.audio.randomized
                ? `randomized · ${m2.audio.samples?.join(" ≠ ") ?? ""}`
                : m2.audio.hash
            }
          />
          <Row k="Fonts" v={`${m2.fonts.count} · ${m2.fonts.osGuess}`} />
          <Row k="WebGPU" v={m2.webgpu.supported ? m2.webgpu.adapterInfo || "yes" : "no"} />
          <Row k="Math" v={m2.math.hash} />
          {m2.platform ? (
            <>
              <Row
                k="CPU / RAM"
                v={`${m2.platform.hardwareConcurrency ?? "?"} cores · ${
                  m2.platform.deviceMemory ?? "?"
                } GB`}
              />
              <Row k="Voices" v={`${m2.platform.voices.count} · ${m2.platform.voices.hash}`} />
              <Row k="Timezone" v={m2.platform.intl.timeZone ?? "—"} />
              <Row k="CSS media" v={m2.platform.css.hash} />
            </>
          ) : null}
          <Row
            k="Screen"
            v={`${m2.screen.width}×${m2.screen.height} dpr=${m2.screen.devicePixelRatio}`}
          />
          <Row
            k="Entropy ~"
            v={`${m2.entropyBitsEstimate} bits${
              m2.oneInN ? ` · ~1 in ${m2.oneInN.toLocaleString()}` : ""
            }${m2.entropyCapBits ? ` (cap ${m2.entropyCapBits})` : ""}`}
          />
        </div>
        {m2.entropyDetail?.length ? (
          <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs">
            <summary className="cursor-pointer text-zinc-300">
              {ru
                ? "Как считаются биты (с поправкой на корреляцию)"
                : "How the bits are counted (correlation-adjusted)"}
            </summary>
            <p className="mt-2 text-[11px] text-zinc-500">
              {ru
                ? "Canvas, WebGL, WebGPU и шрифты описывают одну и ту же связку GPU+ОС, поэтому их биты нельзя складывать напрямую. Потолок — log2(число устройств в мире) ≈ 33 бита."
                : "Canvas, WebGL, WebGPU and fonts all describe the same GPU+OS combo, so their bits cannot be summed directly. Ceiling is log2(devices on Earth) ≈ 33 bits."}
            </p>
            <ul className="mt-2 space-y-1">
              {m2.entropyDetail.map((d) => (
                <li key={d.source} className="flex flex-wrap gap-x-2 text-zinc-400">
                  <span className="min-w-32 text-zinc-300">{d.source}</span>
                  <span className="tabular-nums">
                    {d.rawBits} → {d.countedBits} bits
                  </span>
                  {d.note ? <span className="text-zinc-600">{d.note}</span> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {/* M3 software */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Shield className="h-5 w-5 text-cyan-400" />
          M3 · {ru ? "Софт / защита" : "Software / protection"}
        </h3>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <Pill ok={m3.protection.score >= 50} label={`protection ${m3.protection.score}`} />
          <Pill ok={m3.protection.brave} label="Brave" />
          <Pill ok={m3.protection.rfpCanvasNoise} label="Canvas noise" />
          <Pill ok={Boolean(m3.protection.rfpAudioNoise)} label="Audio noise" />
          <Pill ok={m3.extensions.adsBlockedDom} label="Adblock DOM" />
          <Pill ok={m3.spoofScore < 30} label={`spoof ${m3.spoofScore}`} />
        </div>
        <p className="text-xs text-zinc-500">
          Trackers blocked {m3.protection.trackerScriptsBlocked} / loaded{" "}
          {m3.protection.trackerScriptsLoaded}
        </p>

        {m3.surface ? (
          <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs">
            <summary className="cursor-pointer text-zinc-300">
              {ru
                ? `Где может жить ваш ID (${m3.surface.persistentSlots} хранилищ) и какие API открыты`
                : `Where an ID can live (${m3.surface.persistentSlots} slots) · exposed APIs`}
            </summary>
            <p className="mt-2 text-[11px] text-zinc-500">
              {ru
                ? "«Очистить куки» и «очистить данные сайта» — разные вещи. Ниже — места, куда эта страница только что смогла записать метку (и тут же её удалила)."
                : "“Clear cookies” and “clear site data” are not the same thing. These are the places this page just wrote a marker to — and immediately deleted it again."}
            </p>
            <ul className="mt-2 space-y-1">
              {m3.surface.storage.map((slot) => (
                <li key={slot.id} className="flex flex-wrap items-center gap-x-2">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      slot.writable ? "bg-rose-400" : "bg-zinc-600"
                    }`}
                  />
                  <span className="min-w-28 text-zinc-300">{slot.label}</span>
                  <span className="text-zinc-600">{slot.note}</span>
                </li>
              ))}
            </ul>
            {m3.surface.findings.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-amber-400/80">
                {m3.surface.findings.map((f, i) => (
                  <li key={i}>· {f}</li>
                ))}
              </ul>
            )}
          </details>
        ) : null}
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          {m3.protection.signals.map((s, i) => (
            <li key={i}>· {s}</li>
          ))}
          {m3.spoofFindings.map((f) => (
            <li key={f.id} className="text-amber-400/90">
              · [{f.severity}] {f.detail}
            </li>
          ))}
        </ul>
      </section>

      {/* M5 */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Fingerprint className="h-5 w-5 text-cyan-400" />
          M5 · {ru ? "Продвинутое" : "Advanced"}
        </h3>
        {m5.temporal.message && (
          <p className="mb-2 flex gap-2 text-sm text-amber-300/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {m5.temporal.message}
          </p>
        )}
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <Row k="Emoji FP" v={m5.emojiFingerprint} />
          <Row k="VM probability" v={`${Math.round(m5.vmProbability * 100)}%`} />
          {m5.temporal.similarity != null ? (
            <Row
              k={ru ? "Схожесть с прошлым визитом" : "Similarity to last visit"}
              v={`${Math.round(m5.temporal.similarity * 100)}% · ${m5.temporal.verdict ?? "—"}`}
            />
          ) : null}
          {m5.temporal.changedComponents?.length ? (
            <Row
              k={ru ? "Изменилось" : "Changed since then"}
              v={m5.temporal.changedComponents.join(", ")}
            />
          ) : null}
        </div>
        {m5.vmSignals.length > 0 && (
          <ul className="mt-2 text-xs text-rose-400/80">
            {m5.vmSignals.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        )}
      </section>

      {/* M7 */}
      {report.m7 && <M7TransparencyLab m7={report.m7} ru={ru} />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 rounded border border-zinc-800/80 bg-zinc-950/40 px-2 py-1.5">
      <span className="text-zinc-500">{k}</span>
      <span className="max-w-[60%] truncate font-mono text-zinc-300">{v}</span>
    </div>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 ${
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-zinc-700 text-zinc-500"
      }`}
    >
      {label}
    </span>
  );
}
