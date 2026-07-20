// ============================================================
// M1 — GeoIP point vs timezone-derived point (mismatch map)
// ============================================================

/** Representative coordinates for IANA timezones (approx city centers) */
const TZ_COORDS: Record<string, [number, number]> = {
  'Europe/Moscow': [55.75, 37.62],
  'Europe/London': [51.51, -0.13],
  'Europe/Berlin': [52.52, 13.4],
  'Europe/Paris': [48.86, 2.35],
  'Europe/Warsaw': [52.23, 21.01],
  'Europe/Kyiv': [50.45, 30.52],
  'Europe/Kiev': [50.45, 30.52],
  'Europe/Amsterdam': [52.37, 4.9],
  'Europe/Madrid': [40.42, -3.7],
  'Europe/Rome': [41.9, 12.5],
  'Europe/Istanbul': [41.01, 28.98],
  'America/New_York': [40.71, -74.01],
  'America/Chicago': [41.88, -87.63],
  'America/Denver': [39.74, -104.99],
  'America/Los_Angeles': [34.05, -118.24],
  'America/Toronto': [43.65, -79.38],
  'America/Sao_Paulo': [-23.55, -46.63],
  'America/Mexico_City': [19.43, -99.13],
  'Asia/Tokyo': [35.68, 139.69],
  'Asia/Shanghai': [31.23, 121.47],
  'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Singapore': [1.35, 103.82],
  'Asia/Dubai': [25.2, 55.27],
  'Asia/Kolkata': [22.57, 88.36],
  'Asia/Seoul': [37.57, 126.98],
  'Asia/Bangkok': [13.76, 100.5],
  'Asia/Jakarta': [-6.21, 106.85],
  'Australia/Sydney': [-33.87, 151.21],
  'Australia/Melbourne': [-37.81, 144.96],
  'Pacific/Auckland': [-36.85, 174.76],
  UTC: [0, 0],
  'Etc/UTC': [0, 0],
};

export function timezoneToCoords(tz: string | null | undefined): { lat: number; lon: number } | null {
  if (!tz) return null;
  const hit = TZ_COORDS[tz];
  if (hit) return { lat: hit[0], lon: hit[1] };
  // region prefix fallback
  if (tz.startsWith('Europe/')) return { lat: 50, lon: 10 };
  if (tz.startsWith('America/')) return { lat: 39, lon: -98 };
  if (tz.startsWith('Asia/')) return { lat: 35, lon: 105 };
  if (tz.startsWith('Africa/')) return { lat: 0, lon: 20 };
  if (tz.startsWith('Australia/')) return { lat: -25, lon: 135 };
  return null;
}

/** Haversine distance km */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function geoTimezoneMismatch(
  geoLat: number | null,
  geoLon: number | null,
  browserTimezone: string | null,
  geoTimezone: string | null,
  thresholdKm = 1000
): {
  geoLat: number | null;
  geoLon: number | null;
  tzLat: number | null;
  tzLon: number | null;
  distanceKm: number | null;
  mismatch: boolean;
  browserTimezone: string | null;
  geoTimezone: string | null;
} {
  const tz = timezoneToCoords(browserTimezone);
  if (geoLat == null || geoLon == null || !tz) {
    return {
      geoLat,
      geoLon,
      tzLat: tz?.lat ?? null,
      tzLon: tz?.lon ?? null,
      distanceKm: null,
      mismatch: false,
      browserTimezone,
      geoTimezone,
    };
  }
  const distanceKm = Math.round(haversineKm(geoLat, geoLon, tz.lat, tz.lon));
  return {
    geoLat,
    geoLon,
    tzLat: tz.lat,
    tzLon: tz.lon,
    distanceKm,
    mismatch: distanceKm > thresholdKm,
    browserTimezone,
    geoTimezone,
  };
}
