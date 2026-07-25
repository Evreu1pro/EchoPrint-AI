// ============================================================
// Local-only scan history (localStorage, never uploaded)
// ============================================================

import type { FullModuleReport } from '@/lib/modules/types';

export const HISTORY_KEY = 'echoprint-scan-history-v1';
export const HISTORY_MAX = 10;

export interface ScanHistoryEntry {
  id: string;
  savedAt: string;
  label: string;
  summary: {
    trackabilityPercent: number;
    uniqueness: number;
    spoof: number;
    aggressiveness: number;
    vulnerability: number;
    stableId: string;
    protection: number;
    connectionType: string;
    ip: string | null;
    /** ASN of the public IP, e.g. "AS212238" (shown in the History IP column). */
    asn?: string | null;
    /** Operator name resolved from the local ASN database. */
    asOrg?: string | null;
    city?: string | null;
    /** Geo↔timezone distance for this scan, km. */
    geoDistanceKm?: number | null;
  };
  report: FullModuleReport;
}

/** Cached snapshot for useSyncExternalStore (stable reference until data changes). */
let cachedRaw: string | null = null;
let cachedEntries: ScanHistoryEntry[] = [];

function safeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function summarize(report: FullModuleReport): ScanHistoryEntry['summary'] {
  return {
    trackabilityPercent: report.m4.trackabilityPercent,
    uniqueness: report.m4.uniqueness,
    spoof: report.m4.spoof,
    aggressiveness: report.m4.aggressiveness,
    vulnerability: report.m4.vulnerability,
    stableId: report.m2.stableId,
    protection: report.m3.protection.score,
    connectionType: report.m1.ipIntel.connectionType,
    ip: report.m1.ipIntel.ip,
    asn: report.m1.ipIntel.asn,
    asOrg: report.m1.ipIntel.asnDbName || report.m1.ipIntel.asOrg,
    city: report.m1.ipIntel.city,
    geoDistanceKm: report.m1.geoTimezoneMismatch.distanceKm,
  };
}

function parseEntries(raw: string | null): ScanHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScanHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && e.id && e.report && e.summary);
  } catch {
    return [];
  }
}

export function loadHistory(): ScanHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw === cachedRaw) return cachedEntries;
    cachedRaw = raw;
    cachedEntries = parseEntries(raw);
    return cachedEntries;
  } catch {
    return [];
  }
}

export function saveHistory(entries: ScanHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sliced = entries.slice(0, HISTORY_MAX);
    const raw = JSON.stringify(sliced);
    localStorage.setItem(HISTORY_KEY, raw);
    cachedRaw = raw;
    cachedEntries = sliced;
  } catch {
    /* quota / private mode */
  }
}

export function pushHistory(report: FullModuleReport, label?: string): ScanHistoryEntry[] {
  const entry: ScanHistoryEntry = {
    id: safeId(),
    savedAt: new Date().toISOString(),
    label:
      label ||
      `Scan ${new Date().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    summary: summarize(report),
    report,
  };
  const next = [entry, ...loadHistory()].slice(0, HISTORY_MAX);
  saveHistory(next);
  return next;
}

export function removeHistoryEntry(id: string): ScanHistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  saveHistory(next);
  return next;
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    cachedRaw = null;
    cachedEntries = [];
  } catch {
    /* ignore */
  }
}
