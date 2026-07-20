// ============================================================
// Full client+server pipeline M1–M5
// ============================================================

import type { FullModuleReport, Module1Network } from './types';
import { collectModule2 } from './m2-hardware/collect';
import { collectModule3 } from './m3-software/collect';
import { collectModule5 } from './m5-advanced/collect';
import { computeModule4 } from './m4-scoring/scores';

export type ProgressFn = (stage: string, pct: number) => void;

async function fetchM1(body: {
  timezone: string;
  webrtcIps: string[];
  userAgent: string;
  language: string;
}): Promise<Module1Network | null> {
  try {
    const res = await fetch('/api/fp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { m1?: Module1Network };
    return json.m1 ?? null;
  } catch {
    return null;
  }
}

function emptyM1(): Module1Network {
  return {
    ipIntel: {
      ip: null,
      asn: null,
      asOrg: null,
      isp: null,
      connectionType: 'unknown',
      isProxy: false,
      isHosting: false,
      isMobile: false,
      isTor: false,
      vpnScore: 0,
      country: null,
      countryCode: null,
      region: null,
      city: null,
      lat: null,
      lon: null,
      timezone: null,
      source: 'none',
    },
    tls: {
      ja3: null,
      ja4: null,
      source: 'unavailable',
      note: 'API unavailable (static host or offline)',
    },
    headerOrder: { order: [], signature: '', browserGuess: 'unknown' },
    httpVersion: null,
    webrtcVsHttp: {
      status: 'not_provided',
      httpIp: null,
      webrtcPublic: [],
      webrtcLocal: [],
      detail: 'Server module not reached',
    },
    geoTimezoneMismatch: {
      geoLat: null,
      geoLon: null,
      tzLat: null,
      tzLon: null,
      distanceKm: null,
      mismatch: false,
      browserTimezone: null,
      geoTimezone: null,
    },
    riskScore: 0,
    findings: ['Server M1 skipped'],
  };
}

async function collectWebrtcIps(): Promise<string[]> {
  try {
    const ips = new Set<string>();
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => resolve(), 1500);
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          clearTimeout(t);
          resolve();
          return;
        }
        const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
        if (m) ips.add(m[1]!);
      };
    });
    pc.close();
    return Array.from(ips);
  } catch {
    return [];
  }
}

export async function runFullModulePipeline(
  onProgress?: ProgressFn
): Promise<FullModuleReport> {
  onProgress?.('Hardware (M2): canvas ×3, WebGL, WebGPU, audio, fonts', 10);
  const m2 = await collectModule2();

  onProgress?.('WebRTC candidates for M1 cross-check', 25);
  const webrtcIps = await collectWebrtcIps();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  onProgress?.('Network detective (M1): IP intel, headers, JA3 hooks', 40);
  const m1 =
    (await fetchM1({
      timezone,
      webrtcIps,
      userAgent: navigator.userAgent,
      language: navigator.language,
    })) || emptyM1();

  onProgress?.('Software layer (M3): spoof, extensions, protection', 60);
  const m3 = await collectModule3(m2);

  onProgress?.('Advanced (M5): temporal ID, emoji, VM', 80);
  const m5 = collectModule5(m2);

  onProgress?.('Scoring (M4): A/B/C/D', 92);
  const m4 = computeModule4(m1, m2, m3, m5);

  onProgress?.('Complete', 100);

  return {
    version: '3.0.0',
    generatedAt: new Date().toISOString(),
    m1,
    m2,
    m3,
    m4,
    m5,
  };
}
