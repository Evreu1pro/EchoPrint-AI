// ============================================================
// Module 1 — Request header snapshot (server view)
// ============================================================

import type { HeaderSnapshot } from './types';

const CH_PREFIXES = ['sec-ch-ua', 'sec-ch-prefers', 'sec-ch-device', 'sec-ch-dpr', 'sec-ch-viewport', 'sec-ch-width', 'sec-ch-lang', 'ect', 'rtt', 'downlink', 'save-data'];

const INTERESTING = new Set([
  'via',
  'forwarded',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-scheme',
  'x-request-id',
  'x-correlation-id',
  'cf-ray',
  'cf-visitor',
  'cf-warp-tag-id',
  'true-client-ip',
  'fastly-client-ip',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-original-forwarded-for',
  'cdn-loop',
  'priority',
  'purpose',
  'x-purpose',
  'x-moz',
  'upgrade-insecure-requests',
  'sec-gpc',
  'service-worker-navigation-preload',
  'x-requested-with',
]);

function get(headers: Headers, name: string): string | null {
  const v = headers.get(name);
  return v && v.length > 0 ? v : null;
}

export function snapshotHeaders(headers: Headers): HeaderSnapshot {
  const clientHints: Record<string, string> = {};
  const extra: Record<string, string> = {};

  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (CH_PREFIXES.some((p) => lower === p || lower.startsWith(p + '-'))) {
      clientHints[lower] = value.slice(0, 500);
      return;
    }
    if (INTERESTING.has(lower)) {
      extra[lower] = value.slice(0, 500);
    }
  });

  // Always capture common CH keys explicitly
  for (const name of [
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-ch-ua-platform-version',
    'sec-ch-ua-arch',
    'sec-ch-ua-bitness',
    'sec-ch-ua-model',
    'sec-ch-ua-full-version-list',
    'sec-ch-viewport-width',
    'sec-ch-dpr',
    'sec-ch-prefers-color-scheme',
  ]) {
    const v = get(headers, name);
    if (v) clientHints[name] = v;
  }

  return {
    userAgent: get(headers, 'user-agent'),
    acceptLanguage: get(headers, 'accept-language'),
    acceptEncoding: get(headers, 'accept-encoding'),
    accept: get(headers, 'accept'),
    referer: get(headers, 'referer'),
    origin: get(headers, 'origin'),
    host: get(headers, 'host'),
    secFetchSite: get(headers, 'sec-fetch-site'),
    secFetchMode: get(headers, 'sec-fetch-mode'),
    secFetchDest: get(headers, 'sec-fetch-dest'),
    secFetchUser: get(headers, 'sec-fetch-user'),
    dnt: get(headers, 'dnt'),
    gpc: get(headers, 'sec-gpc') || get(headers, 'sec-gpc'.toLowerCase()),
    clientHints,
    extra,
  };
}

export function headerProxyEvidence(headers: Headers, snapshot: HeaderSnapshot): string[] {
  const evidence: string[] = [];

  if (snapshot.extra['via']) {
    evidence.push(`Via header present: ${snapshot.extra['via'].slice(0, 80)}`);
  }
  if (snapshot.extra['forwarded']) {
    evidence.push(`Forwarded header present`);
  }
  if (snapshot.extra['cdn-loop']) {
    evidence.push(`CDN-Loop: ${snapshot.extra['cdn-loop']}`);
  }
  if (headers.get('x-forwarded-for')?.includes(',')) {
    const hops = headers.get('x-forwarded-for')!.split(',').length;
    evidence.push(`X-Forwarded-For has ${hops} hops`);
  }
  // Multiple conflicting client IP headers
  const ips = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('true-client-ip'),
    headers.get('x-client-ip'),
  ].filter(Boolean);
  const unique = new Set(ips.map((i) => i!.split(',')[0]!.trim()));
  if (unique.size > 1) {
    evidence.push(`Conflicting client-IP headers (${unique.size} distinct values)`);
  }

  return evidence;
}
