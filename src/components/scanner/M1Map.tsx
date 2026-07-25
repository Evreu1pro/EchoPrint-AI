"use client";

// ============================================================
// M1 · Cross-reference validation map
// GeoIP point vs browser-timezone point on real OpenStreetMap tiles.
//
// Zero dependencies on purpose: no leaflet / react-leaflet.
//  - keeps the bundle small (leaflet + react-leaflet ≈ 150 kB) for a tool
//    whose whole point is "nothing extra runs in your browser";
//  - no leaflet.css import, no marker-icon SSR hacks in Next.js app router;
//  - Web Mercator is ~40 lines of math, and we only need 2 points + a line.
//
// Privacy note: raster tiles are fetched from tile.openstreetmap.org, which
// means OSM sees your IP. The map therefore has an explicit off switch and the
// scan itself never depends on it.
// ============================================================

import { useMemo, useState } from "react";

const TILE = 256;
const TILE_HOSTS = ["a", "b", "c"];

export interface M1MapProps {
  /** GeoIP point [lat, lon] */
  geo: [number, number] | null;
  /** Timezone-derived point [lat, lon] */
  tz: [number, number] | null;
  /** Distance in km (already computed server-side; recomputed if absent) */
  distanceKm?: number | null;
  /** Mismatch threshold used by M1, km */
  thresholdKm?: number;
  /** GeoIP accuracy circle radius, km */
  accuracyKm?: number;
  height?: number;
  ru?: boolean;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Web Mercator: lat/lon -> absolute pixel coords at zoom z */
function project(lat: number, lon: number, z: number): { x: number; y: number } {
  const world = TILE * 2 ** z;
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

/** meters per pixel at a given latitude and zoom */
function metersPerPixel(lat: number, z: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

/** Largest zoom where both points still fit inside the viewport with padding */
function fitZoom(
  a: [number, number],
  b: [number, number],
  width: number,
  height: number,
  padding: number
): number {
  for (let z = 12; z >= 1; z--) {
    const pa = project(a[0], a[1], z);
    const pb = project(b[0], b[1], z);
    if (
      Math.abs(pa.x - pb.x) <= width - padding * 2 &&
      Math.abs(pa.y - pb.y) <= height - padding * 2
    ) {
      return z;
    }
  }
  return 1;
}

export default function M1Map({
  geo,
  tz,
  distanceKm,
  thresholdKm = 1000,
  accuracyKm = 50,
  height = 280,
  ru = false,
}: M1MapProps) {
  const [tilesOn, setTilesOn] = useState(true);
  const width = 720; // logical canvas; scaled responsively by CSS

  const view = useMemo(() => {
    if (!geo || !tz) return null;
    const z = fitZoom(geo, tz, width, height, 56);
    const pGeo = project(geo[0], geo[1], z);
    const pTz = project(tz[0], tz[1], z);
    const centerX = (pGeo.x + pTz.x) / 2;
    const centerY = (pGeo.y + pTz.y) / 2;
    const originX = centerX - width / 2;
    const originY = centerY - height / 2;

    const tiles: { key: string; url: string; left: number; top: number }[] = [];
    const maxTile = 2 ** z;
    const x0 = Math.floor(originX / TILE);
    const x1 = Math.floor((originX + width) / TILE);
    const y0 = Math.floor(originY / TILE);
    const y1 = Math.floor((originY + height) / TILE);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        if (y < 0 || y >= maxTile) continue;
        const wrapped = ((x % maxTile) + maxTile) % maxTile;
        const host = TILE_HOSTS[Math.abs(wrapped + y) % TILE_HOSTS.length];
        tiles.push({
          key: `${z}/${x}/${y}`,
          url:
            "https://" +
            host +
            ".tile.openstreetmap.org/" +
            z +
            "/" +
            wrapped +
            "/" +
            y +
            ".png",
          left: x * TILE - originX,
          top: y * TILE - originY,
        });
      }
    }

    const delta = distanceKm ?? haversineKm(geo, tz);
    return {
      z,
      geoPt: { x: pGeo.x - originX, y: pGeo.y - originY },
      tzPt: { x: pTz.x - originX, y: pTz.y - originY },
      tiles,
      delta,
      accuracyPx: (accuracyKm * 1000) / metersPerPixel(geo[0], z),
    };
  }, [geo, tz, distanceKm, accuracyKm, height]);

  if (!geo || !tz || !view) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
        {ru
          ? "Нет координат: GeoIP или таймзона недоступны — карта скрыта."
          : "No coordinates: GeoIP or timezone unavailable — map hidden."}
      </div>
    );
  }

  const mismatch = view.delta > thresholdKm;
  const lineColor = mismatch ? "#f43f5e" : view.delta > 300 ? "#f59e0b" : "#22c55e";
  const verdict = mismatch
    ? ru
      ? "MISMATCH — таймзона не совпадает со страной IP"
      : "MISMATCH — timezone contradicts the IP country"
    : view.delta > 300
      ? ru
        ? "тот же регион, но не тот город"
        : "same region, different city"
      : ru
        ? "согласовано"
        : "consistent";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div
        className="relative w-full select-none bg-zinc-900"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            width,
            height,
            transform: `scale(var(--m1-scale, 1))`,
          }}
        >
          {/* raster tiles */}
          {tilesOn &&
            view.tiles.map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={t.key}
                src={t.url}
                alt=""
                width={TILE}
                height={TILE}
                loading="lazy"
                referrerPolicy="no-referrer"
                draggable={false}
                className="absolute opacity-70 grayscale"
                style={{ left: t.left, top: t.top }}
              />
            ))}

          {/* vector overlay */}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0"
            style={{ width, height }}
          >
            {!tilesOn && (
              <g stroke="#27272a" strokeWidth={1}>
                {Array.from({ length: 12 }, (_, i) => (
                  <line key={`v${i}`} x1={i * 60} y1={0} x2={i * 60} y2={height} />
                ))}
                {Array.from({ length: 6 }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * 56} x2={width} y2={i * 56} />
                ))}
              </g>
            )}

            {/* GeoIP accuracy circle */}
            <circle
              cx={view.geoPt.x}
              cy={view.geoPt.y}
              r={Math.max(8, view.accuracyPx)}
              fill="#ef4444"
              fillOpacity={0.12}
              stroke="#ef4444"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
            />

            {/* connection line */}
            <line
              x1={view.geoPt.x}
              y1={view.geoPt.y}
              x2={view.tzPt.x}
              y2={view.tzPt.y}
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray="6 6"
            />
            <text
              x={(view.geoPt.x + view.tzPt.x) / 2}
              y={(view.geoPt.y + view.tzPt.y) / 2 - 8}
              textAnchor="middle"
              fill={lineColor}
              fontSize={12}
              fontFamily="ui-monospace, monospace"
              paintOrder="stroke"
              stroke="#09090b"
              strokeWidth={3}
            >
              Δ {Math.round(view.delta)} km
            </text>

            {/* IP marker */}
            <circle cx={view.geoPt.x} cy={view.geoPt.y} r={7} fill="#ef4444" stroke="#fff" strokeWidth={2} />
            {/* timezone marker */}
            <circle cx={view.tzPt.x} cy={view.tzPt.y} r={7} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => setTilesOn((v) => !v)}
          className="absolute right-2 top-2 rounded-md border border-zinc-700 bg-zinc-900/90 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800"
          title={
            ru
              ? "Тайлы грузятся с openstreetmap.org — это единственный внешний запрос на странице"
              : "Tiles come from openstreetmap.org — the only third-party request on this page"
          }
        >
          {tilesOn ? (ru ? "тайлы: вкл" : "tiles: on") : ru ? "тайлы: выкл" : "tiles: off"}
        </button>
        <span className="absolute bottom-1 right-2 text-[9px] text-zinc-500">© OpenStreetMap</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
          IP {geo[0].toFixed(2)}, {geo[1].toFixed(2)}
        </span>
        <span
          className={
            mismatch ? "text-rose-400" : view.delta > 300 ? "text-amber-400" : "text-emerald-400"
          }
        >
          Δ {Math.round(view.delta)} km · {verdict}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
          TZ {tz[0].toFixed(2)}, {tz[1].toFixed(2)}
        </span>
      </div>

      <p className="border-t border-zinc-800 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
        {ru
          ? `Красный круг — точность GeoIP (~${accuracyKm} км). Синяя точка — центр таймзоны браузера. Anti-fraud смотрит именно на эту дистанцию: >${thresholdKm} км обычно значит VPN, при котором забыли сменить системную таймзону.`
          : `Red circle = GeoIP accuracy (~${accuracyKm} km). Blue dot = center of the browser timezone. Anti-fraud systems watch exactly this distance: >${thresholdKm} km usually means a VPN with the system timezone left untouched.`}
      </p>
    </div>
  );
}
