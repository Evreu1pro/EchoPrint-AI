// ============================================================
// Diff two FullModuleReport snapshots (pure, unit-testable)
// ============================================================

import type { FullModuleReport } from '@/lib/modules/types';
import { haversineKm } from '@/lib/modules/m1-network/geo-timezone';

export interface ScoreDelta {
  key: string;
  label: string;
  a: number;
  b: number;
  delta: number;
}

export interface FlagDelta {
  key: string;
  label: string;
  a: string | boolean | number | null;
  b: string | boolean | number | null;
  changed: boolean;
}

export interface CompareResult {
  sameStableId: boolean;
  scoreDeltas: ScoreDelta[];
  flags: FlagDelta[];
  notes: string[];
}

function delta(key: string, label: string, a: number, b: number): ScoreDelta {
  return { key, label, a, b, delta: b - a };
}

function flag(
  key: string,
  label: string,
  a: string | boolean | number | null,
  b: string | boolean | number | null
): FlagDelta {
  return { key, label, a, b, changed: a !== b };
}

export function compareReports(
  left: FullModuleReport,
  right: FullModuleReport
): CompareResult {
  const scoreDeltas: ScoreDelta[] = [
    delta('trackability', 'Trackability %', left.m4.trackabilityPercent, right.m4.trackabilityPercent),
    delta('uniqueness', 'A Uniqueness', left.m4.uniqueness, right.m4.uniqueness),
    delta('spoof', 'B Spoof', left.m4.spoof, right.m4.spoof),
    delta('aggressiveness', 'C Aggressiveness', left.m4.aggressiveness, right.m4.aggressiveness),
    delta('vulnerability', 'D Vulnerability', left.m4.vulnerability, right.m4.vulnerability),
    delta('protection', 'M3 Protection', left.m3.protection.score, right.m3.protection.score),
    delta('m1Risk', 'M1 Risk', left.m1.riskScore, right.m1.riskScore),
  ];

  const flags: FlagDelta[] = [
    flag('stableId', 'stable_id', left.m2.stableId, right.m2.stableId),
    flag('canvas', 'Canvas hash', left.m2.canvas.combined, right.m2.canvas.combined),
    flag('webgl', 'WebGL renderer', left.m2.webgl.renderer, right.m2.webgl.renderer),
    flag('brave', 'Brave', left.m3.protection.brave, right.m3.protection.brave),
    flag('adblock', 'Adblock DOM', left.m3.extensions.adsBlockedDom, right.m3.extensions.adsBlockedDom),
    flag(
      'connection',
      'IP type',
      left.m1.ipIntel.connectionType,
      right.m1.ipIntel.connectionType
    ),
    flag('ip', 'Public IP', left.m1.ipIntel.ip, right.m1.ipIntel.ip),
    flag('asn', 'ASN', left.m1.ipIntel.asn, right.m1.ipIntel.asn),
    flag(
      'asnOrg',
      'ASN operator',
      left.m1.ipIntel.asnDbName || left.m1.ipIntel.asOrg,
      right.m1.ipIntel.asnDbName || right.m1.ipIntel.asOrg
    ),
    flag('city', 'GeoIP city', left.m1.ipIntel.city, right.m1.ipIntel.city),
    flag(
      'geoDistance',
      'Geo↔tz Δ km',
      left.m1.geoTimezoneMismatch.distanceKm,
      right.m1.geoTimezoneMismatch.distanceKm
    ),
    flag(
      'geoMismatch',
      'Geo↔tz mismatch',
      left.m1.geoTimezoneMismatch.mismatch,
      right.m1.geoTimezoneMismatch.mismatch
    ),
    flag(
      'webrtc',
      'WebRTC vs HTTP',
      left.m1.webrtcVsHttp.status,
      right.m1.webrtcVsHttp.status
    ),
  ];

  const sameStableId = left.m2.stableId === right.m2.stableId;
  const notes: string[] = [];

  if (sameStableId) {
    notes.push('Same hardware stable_id — likely same machine across browsers/sessions.');
  } else {
    notes.push('Different stable_id — different hardware profile or spoofed canvas/WebGL stack.');
  }

  // --- IP mobility vs hardware persistence -------------------------------
  const leftIp = left.m1.ipIntel.ip;
  const rightIp = right.m1.ipIntel.ip;
  const ipChanged = Boolean(leftIp && rightIp && leftIp !== rightIp);

  const geoMoveKm =
    left.m1.ipIntel.lat != null &&
    left.m1.ipIntel.lon != null &&
    right.m1.ipIntel.lat != null &&
    right.m1.ipIntel.lon != null
      ? Math.round(
          haversineKm(
            left.m1.ipIntel.lat,
            left.m1.ipIntel.lon,
            right.m1.ipIntel.lat,
            right.m1.ipIntel.lon
          )
        )
      : null;

  if (ipChanged) {
    const move = geoMoveKm != null ? ` (${geoMoveKm} km apart)` : '';
    notes.push(
      sameStableId
        ? `IP changed ${leftIp} → ${rightIp}${move}, but hardware same — the network switch did not break re-identification.`
        : `IP changed ${leftIp} → ${rightIp}${move} and stable_id changed too.`
    );
    if (left.m1.ipIntel.asn !== right.m1.ipIntel.asn) {
      notes.push(
        `ASN ${left.m1.ipIntel.asn || '?'} (${left.m1.ipIntel.asnDbName || left.m1.ipIntel.asOrg || '?'}) → ` +
          `${right.m1.ipIntel.asn || '?'} (${right.m1.ipIntel.asnDbName || right.m1.ipIntel.asOrg || '?'}); ` +
          `type ${left.m1.ipIntel.connectionType} → ${right.m1.ipIntel.connectionType}.`
      );
    }
  }

  const leftKm = left.m1.geoTimezoneMismatch.distanceKm;
  const rightKm = right.m1.geoTimezoneMismatch.distanceKm;
  if (leftKm != null && rightKm != null && leftKm !== rightKm) {
    notes.push(
      rightKm < leftKm
        ? `Geo jump ${leftKm}km → ${rightKm}km — GeoIP and browser timezone now agree${rightKm === 0 ? ' exactly' : ''}, the path looks like a real local user.`
        : `Geo jump ${leftKm}km → ${rightKm}km — GeoIP drifted away from the browser timezone.`
    );
  }

  const protDelta = right.m3.protection.score - left.m3.protection.score;
  if (Math.abs(protDelta) >= 20) {
    notes.push(
      protDelta > 0
        ? `Protection rose by ${protDelta} — more aggressive blocking (Brave/uBlock/RFP path).`
        : `Protection fell by ${Math.abs(protDelta)} — more open ad/tracking surface.`
    );
  }

  const spoofDelta = right.m4.spoof - left.m4.spoof;
  if (Math.abs(spoofDelta) >= 15) {
    notes.push(
      spoofDelta > 0
        ? `Undercover score up +${spoofDelta} (geo/tz, VPN, WebRTC, software spoof).`
        : `Undercover score down ${spoofDelta} — path looks more consistent.`
    );
  }

  return { sameStableId, scoreDeltas, flags, notes };
}
