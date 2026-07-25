import { describe, it, expect } from 'vitest';
import { computeModule4 } from './scores';
import type {
  Module1Network,
  Module2Hardware,
  Module3Software,
  Module5Advanced,
} from '../types';

const m1Open: Module1Network = {
  ipIntel: {
    ip: '8.8.8.8',
    asn: null,
    asOrg: null,
    isp: null,
    connectionType: 'residential',
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
  tls: { ja3: null, ja4: null, source: 'unavailable', note: '' },
  headerOrder: { order: [], signature: '', browserGuess: 'chrome' },
  httpVersion: null,
  webrtcVsHttp: {
    status: 'match',
    httpIp: '8.8.8.8',
    webrtcPublic: ['8.8.8.8'],
    webrtcLocal: [],
    detail: '',
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
  riskScore: 10,
  findings: [],
};

const m1Dc: Module1Network = {
  ...m1Open,
  ipIntel: {
    ...m1Open.ipIntel,
    connectionType: 'datacenter',
    isHosting: true,
    vpnScore: 60,
  },
  geoTimezoneMismatch: {
    ...m1Open.geoTimezoneMismatch,
    mismatch: true,
    distanceKm: 5000,
  },
};

const m2: Module2Hardware = {
  canvas: { text: 'a', emoji: 'b', curves: 'c', combined: 'x' },
  webgl: {
    vendor: 'v',
    renderer: 'NVIDIA',
    extensions: [],
    extensionCount: 0,
    triangleHash: 't',
    parametersHash: 'p',
  },
  webgpu: { supported: false, adapterInfo: null, featuresHash: null },
  audio: { hash: 'a', sampleRate: 44100 },
  fonts: { detected: [], count: 20, osGuess: 'Windows', hash: 'f' },
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
  stableId: 'id',
  entropyBitsEstimate: 32,
};

const m3Open: Module3Software = {
  spoofFindings: [],
  spoofScore: 0,
  extensions: {
    adsBlockedDom: false,
    ethereum: false,
    vueDevtools: false,
    reactDevtools: false,
    suspiciousGlobals: [],
    extensionProbeHits: [],
  },
  protection: {
    score: 0,
    brave: false,
    rfpCanvasNoise: false,
    gpc: false,
    trackerScriptsBlocked: 0,
    trackerScriptsLoaded: 4,
    signals: [],
  },
};

const m3Hard: Module3Software = {
  ...m3Open,
  protection: {
    score: 90,
    brave: true,
    rfpCanvasNoise: true,
    gpc: true,
    trackerScriptsBlocked: 4,
    trackerScriptsLoaded: 0,
    signals: ['brave'],
  },
};

const m5: Module5Advanced = {
  temporal: {
    previousStableId: null,
    sameDeviceDifferentSession: false,
    message: null,
  },
  emojiFingerprint: 'e',
  vmSignals: [],
  vmProbability: 0,
};

describe('computeModule4', () => {
  it('maps uniqueness bits into 0–100', () => {
    // Uniqueness is scaled against the 24-bit practical ceiling, so use a
    // sub-ceiling value to exercise the mapping itself.
    const r = computeModule4(
      m1Open,
      { ...m2, entropyBitsEstimate: 18 },
      m3Open,
      m5
    );
    expect(r.uniqueness).toBe(75); // 18/24 * 100
    expect(r.uniquenessBits).toBe(18);
  });

  it('clamps uniqueness at 100 above the 24-bit ceiling', () => {
    const r = computeModule4(m1Open, m2, m3Open, m5);
    expect(r.uniqueness).toBe(100); // 32 bits is past the ceiling
    expect(r.uniquenessBits).toBe(32);
  });

  it('raises spoof for datacenter + geo mismatch', () => {
    const open = computeModule4(m1Open, m2, m3Open, m5);
    const under = computeModule4(m1Dc, m2, m3Open, m5);
    expect(under.spoof).toBeGreaterThan(open.spoof);
    expect(under.spoof).toBeGreaterThanOrEqual(70);
  });

  it('uses protection as aggressiveness', () => {
    const stock = computeModule4(m1Open, m2, m3Open, m5);
    const hard = computeModule4(m1Open, m2, m3Hard, m5);
    expect(stock.aggressiveness).toBe(0);
    expect(hard.aggressiveness).toBe(90);
  });
});
