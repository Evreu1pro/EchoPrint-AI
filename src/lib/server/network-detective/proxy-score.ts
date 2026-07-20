// ============================================================
// Module 1 — Proxy / VPN / multi-hop scoring
// ============================================================

import type { ClientIpInfo, HeaderSnapshot, ProxySignals } from './types';
import { datacenterIpHeuristic, forwardedHopCount } from './ip';
import { headerProxyEvidence } from './headers';

export function scoreProxy(
  headers: Headers,
  ip: ClientIpInfo,
  snapshot: HeaderSnapshot
): ProxySignals {
  let score = 0;
  const evidence: string[] = [];

  const headerEv = headerProxyEvidence(headers, snapshot);
  evidence.push(...headerEv);
  if (headerEv.length) {
    score += Math.min(35, headerEv.length * 12);
  }

  const hops = forwardedHopCount(headers);
  const multiHopForwarded = hops >= 3;
  if (hops >= 3) {
    score += 20;
    evidence.push(`Many X-Forwarded-For hops (${hops}) — multi-proxy path`);
  } else if (hops === 2) {
    score += 8;
    evidence.push(`X-Forwarded-For hops: ${hops}`);
  }

  const datacenterHint = datacenterIpHeuristic(ip.ip);
  if (datacenterHint) {
    score += 15;
    evidence.push('IP matches weak hosting/cloud range heuristic (not proof of VPN)');
  }

  if (ip.isPrivate && !ip.isLoopback) {
    score += 10;
    evidence.push('Resolved IP is private RFC1918 — unexpected on public edge');
  }

  // Headless / automation often odd Accept-Language
  if (!snapshot.acceptLanguage) {
    score += 8;
    evidence.push('Missing Accept-Language');
  }

  if (!snapshot.userAgent) {
    score += 15;
    evidence.push('Missing User-Agent');
  } else if (/headless|phantom|selenium|puppeteer|playwright/i.test(snapshot.userAgent)) {
    score += 25;
    evidence.push('User-Agent contains automation keywords');
  }

  // Tor exit rough: not reliable without DB; skip hard labels

  score = Math.max(0, Math.min(100, score));

  let likelihood: ProxySignals['likelihood'];
  if (score >= 70) likelihood = 'very_likely';
  else if (score >= 45) likelihood = 'likely';
  else if (score >= 25) likelihood = 'possible';
  else likelihood = 'unlikely';

  return {
    score,
    likelihood,
    evidence,
    headersSuggestProxy: headerEv.length > 0,
    multiHopForwarded,
    datacenterHint,
  };
}
