// ============================================================
// Module 1 — Network Detective (server-side types)
// ============================================================

export type ProxyLikelihood = 'unlikely' | 'possible' | 'likely' | 'very_likely';
export type NetworkRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ClientIpInfo {
  /** Best-effort public client IP */
  ip: string | null;
  source: 'cf-connecting-ip' | 'x-real-ip' | 'x-forwarded-for' | 'x-vercel-forwarded-for' | 'unknown';
  isPrivate: boolean;
  isLoopback: boolean;
  version: 4 | 6 | null;
}

export interface GeoHints {
  country: string | null;
  region: string | null;
  city: string | null;
  /** Vercel / Cloudflare edge city when present */
  source: 'vercel' | 'cloudflare' | 'none';
}

export interface HeaderSnapshot {
  userAgent: string | null;
  acceptLanguage: string | null;
  acceptEncoding: string | null;
  accept: string | null;
  referer: string | null;
  origin: string | null;
  host: string | null;
  secFetchSite: string | null;
  secFetchMode: string | null;
  secFetchDest: string | null;
  secFetchUser: string | null;
  dnt: string | null;
  gpc: string | null;
  /** Sec-CH-UA* and related */
  clientHints: Record<string, string>;
  /** All other interesting headers (sanitized) */
  extra: Record<string, string>;
}

export interface ProxySignals {
  score: number; // 0–100 higher = more proxy/VPN/datacenter-like
  likelihood: ProxyLikelihood;
  evidence: string[];
  headersSuggestProxy: boolean;
  multiHopForwarded: boolean;
  datacenterHint: boolean;
}

export interface NetworkFinding {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  category: 'ip' | 'headers' | 'proxy' | 'hints' | 'privacy' | 'mismatch';
}

/** Optional body from browser for server↔client cross-check */
export interface ClientNetworkClaim {
  userAgent?: string;
  language?: string;
  languages?: string[];
  platform?: string;
  timezone?: string;
  /** High-entropy CH as reported by JS */
  clientHints?: {
    mobile?: boolean;
    platform?: string;
    brands?: { brand: string; version: string }[];
    architecture?: string;
    model?: string;
    platformVersion?: string;
  };
  /** WebRTC candidates the client saw */
  webrtcIps?: string[];
}

export interface NetworkDetectiveReport {
  module: 'network-detective';
  version: '1.0.0';
  generatedAt: string;
  /** No persistence — analysis of this request only */
  ephemeral: true;
  ip: ClientIpInfo;
  geo: GeoHints;
  headers: HeaderSnapshot;
  proxy: ProxySignals;
  findings: NetworkFinding[];
  risk: NetworkRisk;
  riskScore: number;
  summary: string;
  recommendations: string[];
  /** Cross-check vs client-reported navigator (if body sent) */
  crossCheck: {
    performed: boolean;
    mismatches: string[];
    uaMatch: boolean | null;
    languageMatch: boolean | null;
    webrtcVsPublicIp: 'match' | 'mismatch' | 'unknown' | 'not_provided';
  };
  /** Privacy notice for UI */
  privacyNote: string;
}
