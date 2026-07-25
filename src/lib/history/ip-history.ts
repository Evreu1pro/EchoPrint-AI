// ============================================================
// M1 — cross-scan IP history
// ------------------------------------------------------------
// The killer demo: the public IP moved hundreds of km, yet the
// hardware stable_id stayed identical. This module turns the local
// scan history into that sentence, e.g.
//
//   "IP changed 89.58.28.140 → 152.233.21.6 (394 km apart), but
//    hardware same (stable_id 4f2c…). Geo↔timezone jump 394km → 0km."
// ============================================================

import type { Module1Network } from '@/lib/modules/types';
import { haversineKm } from '@/lib/modules/m1-network/geo-timezone';
import type { ScanHistoryEntry } from './store';

/** Short display form of an IP: 89.58.28.140 → 89.58 */
export function shortIp(ip: string | null | undefined): string {
  if (!ip) return '—';
  if (ip.includes(':')) return ip.split(':').slice(0, 2).join(':');
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}` : ip;
}

export interface IpHistoryInput {
  ip: string | null;
  asn: string | null;
  lat: number | null;
  lon: number | null;
  distanceKm: number | null;
  stableId: string;
}

export type IpHistory = NonNullable<Module1Network['ipHistory']>;

/**
 * Builds the M1 IP-history block by comparing the current scan against
 * the most recent stored scan that has a public IP.
 */
export function buildIpHistory(
  current: IpHistoryInput,
  history: ScanHistoryEntry[]
): IpHistory {
  const previous = history.find((e) => e.report?.m1?.ipIntel?.ip);

  if (!previous) {
    return {
      previousIp: null,
      previousAsn: null,
      previousDistanceKm: null,
      ipChanged: false,
      ipMoveKm: null,
      summary: null,
    };
  }

  const prevIntel = previous.report.m1.ipIntel;
  const prevGeo = previous.report.m1.geoTimezoneMismatch;
  const prevStableId = previous.report.m2.stableId;

  const ipChanged = Boolean(prevIntel.ip && current.ip && prevIntel.ip !== current.ip);
  const ipMoveKm =
    prevIntel.lat != null && prevIntel.lon != null && current.lat != null && current.lon != null
      ? Math.round(haversineKm(prevIntel.lat, prevIntel.lon, current.lat, current.lon))
      : null;

  const sameHardware = prevStableId === current.stableId;
  const parts: string[] = [];

  if (ipChanged) {
    parts.push(
      `IP changed ${shortIp(prevIntel.ip)} → ${shortIp(current.ip)}` +
        (ipMoveKm != null ? ` (${ipMoveKm} km apart)` : '')
    );
    if (prevIntel.asn && current.asn && prevIntel.asn !== current.asn) {
      parts.push(`ASN ${prevIntel.asn} → ${current.asn}`);
    }
    parts.push(
      sameHardware
        ? `but hardware same (stable_id ${current.stableId.slice(0, 8)}…)`
        : 'and hardware changed too (different stable_id)'
    );
  } else if (prevIntel.ip) {
    parts.push(`Same IP as previous scan (${shortIp(current.ip)})`);
  }

  if (prevGeo.distanceKm != null && current.distanceKm != null) {
    parts.push(
      prevGeo.distanceKm === current.distanceKm
        ? `Geo↔timezone Δ stayed ${current.distanceKm}km`
        : `Geo jump ${prevGeo.distanceKm}km → ${current.distanceKm}km`
    );
  }

  return {
    previousIp: prevIntel.ip,
    previousAsn: prevIntel.asn,
    previousDistanceKm: prevGeo.distanceKm,
    ipChanged,
    ipMoveKm,
    summary: parts.length ? `${parts.join('. ')}.` : null,
  };
}
