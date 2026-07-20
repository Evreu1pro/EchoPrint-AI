// ============================================================
// Module 1 — IP extraction & classification
// ============================================================

import type { ClientIpInfo, GeoHints } from './types';

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
];

function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4.some((re) => re.test(ip));
}

function isLoopback(ip: string): boolean {
  return ip === '::1' || ip.startsWith('127.') || ip === '0:0:0:0:0:0:0:1';
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80:')
  );
}

function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  // strip port from [ipv6]:port or ipv4:port
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']');
    if (end > 0) ip = ip.slice(1, end);
  } else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) {
    ip = ip.split(':')[0]!;
  }
  // X-Forwarded-For may be "client, proxy1, proxy2"
  if (ip.includes(',')) {
    ip = ip.split(',')[0]!.trim();
  }
  if (!ip || ip === 'unknown') return null;
  return ip;
}

function ipVersion(ip: string): 4 | 6 | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return 4;
  if (ip.includes(':')) return 6;
  return null;
}

/**
 * Resolve client IP from common reverse-proxy / edge headers.
 * Prefer Cloudflare → Vercel → X-Real-IP → first X-Forwarded-For hop.
 */
export function extractClientIp(headers: Headers): ClientIpInfo {
  const candidates: { source: ClientIpInfo['source']; value: string | null }[] = [
    { source: 'cf-connecting-ip', value: normalizeIp(headers.get('cf-connecting-ip')) },
    { source: 'x-vercel-forwarded-for', value: normalizeIp(headers.get('x-vercel-forwarded-for')) },
    { source: 'x-real-ip', value: normalizeIp(headers.get('x-real-ip')) },
    { source: 'x-forwarded-for', value: normalizeIp(headers.get('x-forwarded-for')) },
  ];

  for (const c of candidates) {
    if (!c.value) continue;
    const ver = ipVersion(c.value);
    const priv =
      ver === 4 ? isPrivateV4(c.value) : ver === 6 ? isPrivateV6(c.value) : false;
    return {
      ip: c.value,
      source: c.source,
      isPrivate: priv,
      isLoopback: isLoopback(c.value),
      version: ver,
    };
  }

  return {
    ip: null,
    source: 'unknown',
    isPrivate: false,
    isLoopback: false,
    version: null,
  };
}

/** Count hops in X-Forwarded-For */
export function forwardedHopCount(headers: Headers): number {
  const xff = headers.get('x-forwarded-for');
  if (!xff) return 0;
  return xff.split(',').map((s) => s.trim()).filter(Boolean).length;
}

export function extractGeoHints(headers: Headers): GeoHints {
  // Vercel
  const vCountry = headers.get('x-vercel-ip-country');
  const vCity = headers.get('x-vercel-ip-city');
  const vRegion = headers.get('x-vercel-ip-country-region');
  if (vCountry || vCity || vRegion) {
    return {
      country: vCountry,
      region: vRegion,
      city: vCity ? decodeURIComponent(vCity) : null,
      source: 'vercel',
    };
  }

  // Cloudflare
  const cfCountry = headers.get('cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') {
    return {
      country: cfCountry,
      region: headers.get('cf-region') || headers.get('cf-region-code'),
      city: headers.get('cf-ipcity'),
      source: 'cloudflare',
    };
  }

  return { country: null, region: null, city: null, source: 'none' };
}

/**
 * Lightweight datacenter / hosting ASN heuristics from IP alone
 * (not a full GeoIP DB — educational signals only).
 */
export function datacenterIpHeuristic(ip: string | null): boolean {
  if (!ip) return false;
  // Common cloud / documentation ranges (partial educational list)
  // We intentionally keep this conservative to avoid false VPN labels.
  const patterns = [
    /^34\./, // GCP often
    /^35\./,
    /^104\.196\./,
    /^13\.3[2-9]\./, // some AWS
    /^52\./,
    /^54\./,
    /^3\./, // AWS
  ];
  // Do NOT treat all of these as VPN — only as weak "hosting-like" if combined with other signals
  return patterns.some((re) => re.test(ip));
}
