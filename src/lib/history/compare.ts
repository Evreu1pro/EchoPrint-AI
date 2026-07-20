// ============================================================
// Diff two FullModuleReport snapshots (pure, unit-testable)
// ============================================================

import type { FullModuleReport } from '@/lib/modules/types';

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
