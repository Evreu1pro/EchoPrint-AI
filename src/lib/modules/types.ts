// ============================================================
// EchoPrint multi-module contracts (M1–M5)
// ============================================================

export type IpConnectionType =
  | 'residential'
  | 'mobile'
  | 'datacenter'
  | 'hosting'
  | 'education'
  | 'business'
  | 'tor'
  | 'vpn_suspected'
  | 'unknown';

export interface IpIntel {
  ip: string | null;
  asn: string | null;
  asOrg: string | null;
  isp: string | null;
  connectionType: IpConnectionType;
  isProxy: boolean;
  isHosting: boolean;
  isMobile: boolean;
  isTor: boolean;
  vpnScore: number; // 0–100
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null; // from GeoIP
  source: 'ip-api' | 'ipinfo' | 'ipwho' | 'headers' | 'none' | 'error';
  /** Kind resolved from the local ASN database (hosting/cdn/vpn/proxy/transit/mobile/education). */
  asnKind?: string | null;
  /** Operator name from the local ASN database, e.g. "Datacamp Limited". */
  asnDbName?: string | null;
  /** high = ASN database hit, medium = org-name keyword, low = guess. */
  classificationConfidence?: 'high' | 'medium' | 'low';
  /** Human-readable trail of why this connection type was chosen. */
  classificationReasons?: string[];
}

export interface TlsFingerprint {
  ja3: string | null;
  ja4: string | null;
  source: 'cf' | 'proxy-header' | 'unavailable';
  note: string;
}

export interface HeaderOrderInfo {
  order: string[];
  signature: string;
  browserGuess: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other' | 'unknown';
}

export interface Module1Network {
  ipIntel: IpIntel;
  tls: TlsFingerprint;
  headerOrder: HeaderOrderInfo;
  httpVersion: string | null;
  webrtcVsHttp: {
    status: 'match' | 'mismatch' | 'local_only' | 'unknown' | 'not_provided';
    httpIp: string | null;
    webrtcPublic: string[];
    webrtcLocal: string[];
    detail: string;
  };
  /** Cross-scan network history (same browser, previous IPs). */
  ipHistory?: {
    previousIp: string | null;
    previousAsn: string | null;
    previousDistanceKm: number | null;
    ipChanged: boolean;
    /** Distance between the previous and current GeoIP points, km. */
    ipMoveKm: number | null;
    summary: string | null;
  };
  geoTimezoneMismatch: {
    geoLat: number | null;
    geoLon: number | null;
    /** Approximate lat/lon from browser timezone */
    tzLat: number | null;
    tzLon: number | null;
    distanceKm: number | null;
    mismatch: boolean;
    browserTimezone: string | null;
    geoTimezone: string | null;
  };
  riskScore: number;
  findings: string[];
}

export interface Module2Hardware {
  canvas: { text: string; emoji: string; curves: string; combined: string };
  webgl: {
    vendor: string;
    renderer: string;
    extensions: string[];
    extensionCount: number;
    triangleHash: string;
    parametersHash: string;
  };
  webgpu: { supported: boolean; adapterInfo: string | null; featuresHash: string | null };
  audio: { hash: string; sampleRate: number };
  fonts: { detected: string[]; count: number; osGuess: string; hash: string };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    screenX: number;
    screenY: number;
    devicePixelRatio: number;
    colorDepth: number;
    orientation: string | null;
    hash: string;
  };
  math: { hash: string };
  /** Stable across browsers on same machine */
  stableId: string;
  entropyBitsEstimate: number;
  /** Per-signal entropy contribution after the correlation discount. */
  entropyDetail?: { source: string; rawBits: number; countedBits: number; note?: string }[];
  /** Information-theoretic ceiling used when capping the estimate. */
  entropyCapBits?: number;
  /** ~1 in N devices share this fingerprint (2^bits, capped by population). */
  oneInN?: number;
}

export interface Module3Software {
  spoofFindings: { id: string; severity: string; detail: string }[];
  spoofScore: number; // 0–100 higher = more fake
  extensions: {
    adsBlockedDom: boolean;
    ethereum: boolean;
    vueDevtools: boolean;
    reactDevtools: boolean;
    suspiciousGlobals: string[];
    extensionProbeHits: string[];
  };
  protection: {
    score: number; // 0–100 higher = more protected
    brave: boolean;
    rfpCanvasNoise: boolean;
    gpc: boolean;
    trackerScriptsBlocked: number;
    trackerScriptsLoaded: number;
    signals: string[];
  };
}

export interface Module4Scores {
  /** A — uniqueness 0–100 (higher = more unique / trackable by rarity) */
  uniqueness: number;
  uniquenessBits: number;
  uniquenessLabel: string;
  /** B — spoof / undercover 0–100 (higher = more fake) */
  spoof: number;
  spoofLabel: string;
  /** C — aggressiveness / tracker cutting 0–100 (higher = more blocking) */
  aggressiveness: number;
  aggressivenessLabel: string;
  /** D — vulnerability 0–100 (higher = more exposed/vulnerable) */
  vulnerability: number;
  vulnerabilityLabel: string;
  /** Trackability narrative 0–100 */
  trackabilityPercent: number;
  trackabilityNarrative: string;
  formulaNotes: string[];
}

export interface Module5Advanced {
  temporal: {
    previousStableId: string | null;
    sameDeviceDifferentSession: boolean;
    message: string | null;
  };
  emojiFingerprint: string;
  vmSignals: string[];
  vmProbability: number;
}

export interface FullModuleReport {
  version: '3.0.0';
  generatedAt: string;
  m1: Module1Network;
  m2: Module2Hardware;
  m3: Module3Software;
  m4: Module4Scores;
  m5: Module5Advanced;
}
