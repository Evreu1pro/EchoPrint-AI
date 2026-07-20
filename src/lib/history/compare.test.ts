import { describe, it, expect } from 'vitest';
import { compareReports } from './compare';
import type { FullModuleReport } from '@/lib/modules/types';

function baseReport(overrides?: {
  stableId?: string;
  protection?: number;
  spoof?: number;
  uniqueness?: number;
}): FullModuleReport {
  const protection = overrides?.protection ?? 0;
  const uniqueness = overrides?.uniqueness ?? 50;
  const spoof = overrides?.spoof ?? 10;
  return {
    version: '3.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    m1: {
      ipIntel: {
        ip: '1.2.3.4',
        asn: 'AS1',
        asOrg: 'Test',
        isp: 'Test',
        connectionType: 'residential',
        isProxy: false,
        isHosting: false,
        isMobile: false,
        isTor: false,
        vpnScore: 0,
        country: 'DE',
        countryCode: 'DE',
        region: null,
        city: 'Berlin',
        lat: 52.5,
        lon: 13.4,
        timezone: 'Europe/Berlin',
        source: 'headers',
      },
      tls: { ja3: null, ja4: null, source: 'unavailable', note: 'n/a' },
      headerOrder: { order: [], signature: 'abc', browserGuess: 'chrome' },
      httpVersion: '2.0',
      webrtcVsHttp: {
        status: 'match',
        httpIp: '1.2.3.4',
        webrtcPublic: ['1.2.3.4'],
        webrtcLocal: [],
        detail: 'ok',
      },
      geoTimezoneMismatch: {
        geoLat: 52.5,
        geoLon: 13.4,
        tzLat: 52.5,
        tzLon: 13.4,
        distanceKm: 0,
        mismatch: false,
        browserTimezone: 'Europe/Berlin',
        geoTimezone: 'Europe/Berlin',
      },
      riskScore: 15,
      findings: [],
    },
    m2: {
      canvas: { text: 't', emoji: 'e', curves: 'c', combined: 'canvas-a' },
      webgl: {
        vendor: 'v',
        renderer: 'GPU-A',
        extensions: [],
        extensionCount: 0,
        triangleHash: 'tri',
        parametersHash: 'par',
      },
      webgpu: { supported: false, adapterInfo: null, featuresHash: null },
      audio: { hash: 'aud', sampleRate: 44100 },
      fonts: { detected: [], count: 10, osGuess: 'Windows', hash: 'f' },
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        screenX: 0,
        screenY: 0,
        devicePixelRatio: 1,
        colorDepth: 24,
        orientation: null,
        hash: 's',
      },
      math: { hash: 'm' },
      stableId: overrides?.stableId ?? 'stable-same',
      entropyBitsEstimate: 28,
    },
    m3: {
      spoofFindings: [],
      spoofScore: spoof,
      extensions: {
        adsBlockedDom: false,
        ethereum: false,
        vueDevtools: false,
        reactDevtools: false,
        suspiciousGlobals: [],
        extensionProbeHits: [],
      },
      protection: {
        score: protection,
        brave: protection > 50,
        rfpCanvasNoise: false,
        gpc: false,
        trackerScriptsBlocked: protection > 50 ? 3 : 0,
        trackerScriptsLoaded: protection > 50 ? 0 : 3,
        signals: [],
      },
    },
    m4: {
      uniqueness,
      uniquenessBits: 28,
      uniquenessLabel: 'test',
      spoof,
      spoofLabel: 'test',
      aggressiveness: protection,
      aggressivenessLabel: 'test',
      vulnerability: 40,
      vulnerabilityLabel: 'test',
      trackabilityPercent: 70,
      trackabilityNarrative: 'test',
      formulaNotes: [],
    },
    m5: {
      temporal: {
        previousStableId: null,
        sameDeviceDifferentSession: false,
        message: null,
      },
      emojiFingerprint: 'emoji',
      vmSignals: [],
      vmProbability: 0,
    },
  };
}

describe('compareReports', () => {
  it('detects same stable_id and protection rise', () => {
    const a = baseReport({ protection: 0 });
    const b = baseReport({ protection: 80 });
    const r = compareReports(a, b);
    expect(r.sameStableId).toBe(true);
    const prot = r.scoreDeltas.find((d) => d.key === 'protection');
    expect(prot?.delta).toBe(80);
    expect(r.notes.some((n) => n.includes('stable_id') || n.includes('Protection'))).toBe(
      true
    );
  });

  it('flags different stable_id', () => {
    const a = baseReport({ stableId: 'aaa' });
    const b = baseReport({ stableId: 'bbb' });
    const r = compareReports(a, b);
    expect(r.sameStableId).toBe(false);
    const sid = r.flags.find((f) => f.key === 'stableId');
    expect(sid?.changed).toBe(true);
  });

  it('computes score deltas as right - left', () => {
    const a = baseReport({ spoof: 10, uniqueness: 40 });
    const b = baseReport({ spoof: 55, uniqueness: 60 });
    const r = compareReports(a, b);
    expect(r.scoreDeltas.find((d) => d.key === 'spoof')?.delta).toBe(45);
    expect(r.scoreDeltas.find((d) => d.key === 'uniqueness')?.delta).toBe(20);
  });
});
