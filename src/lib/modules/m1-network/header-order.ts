// ============================================================
// M1 — HTTP header order fingerprint
// Chrome / Firefox send headers in different orders
// ============================================================

import { fnv1aHash } from '@/lib/utils/helpers';
import type { HeaderOrderInfo } from '../types';

/** Typical first-hop header sequences (educational) */
const CHROME_PREFIX = ['host', 'connection', 'content-length', 'sec-ch-ua', 'sec-ch-ua-mobile', 'user-agent', 'sec-ch-ua-platform'];
const FIREFOX_PREFIX = ['host', 'user-agent', 'accept', 'accept-language', 'accept-encoding'];
const SAFARI_HINTS = ['host', 'accept', 'sec-fetch-site', 'accept-language', 'accept-encoding', 'user-agent'];

/**
 * Extract header names in arrival order when the runtime preserves it.
 * Node/undici often preserves insertion order for Headers.
 */
export function extractHeaderOrder(headers: Headers): HeaderOrderInfo {
  const order: string[] = [];
  headers.forEach((_, key) => {
    order.push(key.toLowerCase());
  });

  // Filter hop-by-hop / edge noise for signature stability
  const filtered = order.filter(
    (h) =>
      !h.startsWith('x-vercel') &&
      !h.startsWith('x-forwarded') &&
      !h.startsWith('cf-') &&
      h !== 'x-real-ip' &&
      h !== 'cdn-loop'
  );

  const signature = fnv1aHash(filtered.join('|'));
  const browserGuess = guessBrowser(filtered);

  return { order: filtered.slice(0, 40), signature, browserGuess };
}

function guessBrowser(order: string[]): HeaderOrderInfo['browserGuess'] {
  const joined = order.join(',');
  const hasSecChUa = order.includes('sec-ch-ua');
  const uaIdx = order.indexOf('user-agent');
  const secChIdx = order.indexOf('sec-ch-ua');

  if (hasSecChUa && secChIdx >= 0 && uaIdx > secChIdx) return 'chrome';
  if (hasSecChUa && order.includes('sec-ch-ua-platform')) return 'chrome';
  if (!hasSecChUa && order.includes('user-agent') && order.indexOf('accept') < order.indexOf('user-agent')) {
    // loose firefox-like
  }
  if (!hasSecChUa && uaIdx >= 0 && order.indexOf('accept') > uaIdx) return 'firefox';
  if (joined.includes('applewebkit') || (!hasSecChUa && order.includes('sec-fetch-site'))) {
    // could be safari
  }
  if (order.includes('sec-ch-ua') && order.some((h) => h.includes('edg'))) return 'edge';

  // Prefix similarity
  if (prefixScore(order, CHROME_PREFIX) > 0.5) return 'chrome';
  if (prefixScore(order, FIREFOX_PREFIX) > 0.5) return 'firefox';
  if (prefixScore(order, SAFARI_HINTS) > 0.4 && !hasSecChUa) return 'safari';

  return order.length ? 'other' : 'unknown';
}

function prefixScore(order: string[], prefix: string[]): number {
  let hits = 0;
  for (const p of prefix) {
    if (order.includes(p)) hits++;
  }
  return hits / prefix.length;
}

export function extractTlsFromHeaders(headers: Headers): {
  ja3: string | null;
  ja4: string | null;
  source: 'cf' | 'proxy-header' | 'unavailable';
  note: string;
} {
  // Cloudflare Bot Management / enterprise
  const cfJa3 = headers.get('cf-ja3-hash') || headers.get('x-ja3-hash');
  const cfJa4 = headers.get('cf-ja4') || headers.get('x-ja4-hash') || headers.get('x-ja4');
  const proxyJa3 = headers.get('x-tls-ja3') || headers.get('x-client-ja3');
  const proxyJa4 = headers.get('x-tls-ja4') || headers.get('x-client-ja4');

  const ja3 = cfJa3 || proxyJa3;
  const ja4 = cfJa4 || proxyJa4;

  if (ja3 || ja4) {
    return {
      ja3,
      ja4,
      source: cfJa3 || cfJa4 ? 'cf' : 'proxy-header',
      note: 'TLS fingerprint provided by edge/proxy. Real JA3 needs TLS-terminating sidecar (Go/Rust) when not on CF.',
    };
  }

  return {
    ja3: null,
    ja4: null,
    source: 'unavailable',
    note:
      'JA3/JA4 not available on plain Next.js (TLS ends at edge). Put Caddy/nginx/Go JA3 module in front and forward X-JA3-Hash / X-JA4-Hash, or use Cloudflare cf-ja3-hash.',
  };
}
