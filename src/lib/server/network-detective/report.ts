// ============================================================
// Module 1 — Network Detective report builder
// ============================================================

import type {
  ClientNetworkClaim,
  NetworkDetectiveReport,
  NetworkFinding,
  NetworkRisk,
} from './types';
import { extractClientIp, extractGeoHints } from './ip';
import { snapshotHeaders } from './headers';
import { scoreProxy } from './proxy-score';

function riskFromScore(score: number): NetworkRisk {
  if (score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

function normalizeUa(ua: string): string {
  return ua.trim().replace(/\s+/g, ' ').toLowerCase();
}

function crossCheck(
  snapshotUa: string | null,
  snapshotLang: string | null,
  publicIp: string | null,
  claim?: ClientNetworkClaim
): NetworkDetectiveReport['crossCheck'] {
  if (!claim) {
    return {
      performed: false,
      mismatches: [],
      uaMatch: null,
      languageMatch: null,
      webrtcVsPublicIp: 'not_provided',
    };
  }

  const mismatches: string[] = [];
  let uaMatch: boolean | null = null;
  let languageMatch: boolean | null = null;

  if (claim.userAgent && snapshotUa) {
    uaMatch = normalizeUa(claim.userAgent) === normalizeUa(snapshotUa);
    if (!uaMatch) {
      // Soft match: major browser token
      const soft =
        normalizeUa(claim.userAgent).includes('chrome') ===
          normalizeUa(snapshotUa).includes('chrome') &&
        normalizeUa(claim.userAgent).includes('firefox') ===
          normalizeUa(snapshotUa).includes('firefox');
      if (!soft) {
        mismatches.push('navigator.userAgent ≠ HTTP User-Agent header (spoof / intermediary)');
      } else {
        uaMatch = true; // minor version drift OK
      }
    }
  }

  if (claim.language && snapshotLang) {
    const primaryClaim = claim.language.split(',')[0]!.split(';')[0]!.trim().toLowerCase();
    const primaryHeader = snapshotLang.split(',')[0]!.split(';')[0]!.trim().toLowerCase();
    languageMatch =
      primaryClaim === primaryHeader ||
      primaryClaim.startsWith(primaryHeader.split('-')[0]!) ||
      primaryHeader.startsWith(primaryClaim.split('-')[0]!);
    if (!languageMatch) {
      mismatches.push(
        `Language mismatch: JS="${claim.language}" vs Accept-Language="${snapshotLang}"`
      );
    }
  }

  // Client Hints header vs JS brands
  if (claim.clientHints?.platform) {
    // platform in CH headers is quoted often: "Windows"
    // We don't always receive CH on every request without Accept-CH
  }

  let webrtcVsPublicIp: NetworkDetectiveReport['crossCheck']['webrtcVsPublicIp'] =
    'not_provided';
  if (claim.webrtcIps && claim.webrtcIps.length > 0) {
    if (!publicIp) {
      webrtcVsPublicIp = 'unknown';
    } else if (claim.webrtcIps.some((w) => w === publicIp)) {
      webrtcVsPublicIp = 'match';
    } else {
      // Public IP from server may differ from WebRTC if VPN splits or host candidates only local
      const hasPublicCandidate = claim.webrtcIps.some(
        (w) => !w.startsWith('192.168.') && !w.startsWith('10.') && !w.startsWith('172.')
      );
      if (hasPublicCandidate) {
        webrtcVsPublicIp = 'mismatch';
        mismatches.push(
          `WebRTC public candidates [${claim.webrtcIps.filter((w) => !w.startsWith('192.168.') && !w.startsWith('10.')).slice(0, 3).join(', ')}] ≠ server-seen IP ${publicIp}`
        );
      } else {
        webrtcVsPublicIp = 'unknown';
      }
    }
  }

  return {
    performed: true,
    mismatches,
    uaMatch,
    languageMatch,
    webrtcVsPublicIp,
  };
}

/**
 * Build full Network Detective report from an incoming Request.
 * Stateless — nothing is stored.
 */
export function buildNetworkDetectiveReport(
  request: Request,
  claim?: ClientNetworkClaim
): NetworkDetectiveReport {
  const headers = request.headers;
  const ip = extractClientIp(headers);
  const geo = extractGeoHints(headers);
  const headerSnap = snapshotHeaders(headers);
  const proxy = scoreProxy(headers, ip, headerSnap);
  const check = crossCheck(headerSnap.userAgent, headerSnap.acceptLanguage, ip.ip, claim);

  const findings: NetworkFinding[] = [];

  // IP findings
  if (ip.ip) {
    findings.push({
      id: 'public_ip',
      severity: 'info',
      title: 'Server-visible IP',
      detail: `${ip.ip} (from ${ip.source}, IPv${ip.version ?? '?'})`,
      category: 'ip',
    });
  } else {
    findings.push({
      id: 'ip_unknown',
      severity: 'medium',
      title: 'Client IP not resolved',
      detail: 'Edge did not provide a usable client IP header.',
      category: 'ip',
    });
  }

  if (ip.isLoopback) {
    findings.push({
      id: 'loopback',
      severity: 'info',
      title: 'Loopback client',
      detail: 'Request appears local (dev / same machine).',
      category: 'ip',
    });
  }

  if (geo.country) {
    findings.push({
      id: 'geo',
      severity: 'info',
      title: 'Edge geo hint',
      detail: [geo.country, geo.region, geo.city].filter(Boolean).join(' / ') + ` (${geo.source})`,
      category: 'ip',
    });
  }

  // Headers / privacy
  if (headerSnap.gpc === '1') {
    findings.push({
      id: 'gpc_header',
      severity: 'info',
      title: 'GPC header present',
      detail: 'Sec-GPC: 1 — Global Privacy Control signaled to the server.',
      category: 'privacy',
    });
  } else {
    findings.push({
      id: 'gpc_missing',
      severity: 'low',
      title: 'No GPC header',
      detail: 'Server did not receive Sec-GPC: 1.',
      category: 'privacy',
    });
  }

  if (headerSnap.dnt === '1') {
    findings.push({
      id: 'dnt',
      severity: 'info',
      title: 'DNT header',
      detail: 'DNT: 1 (rarely honored by trackers).',
      category: 'privacy',
    });
  }

  const chKeys = Object.keys(headerSnap.clientHints);
  if (chKeys.length >= 3) {
    findings.push({
      id: 'client_hints_rich',
      severity: 'high',
      title: 'Rich Client Hints on wire',
      detail: `Server received ${chKeys.length} Client Hint headers: ${chKeys.slice(0, 6).join(', ')}${chKeys.length > 6 ? '…' : ''}`,
      category: 'hints',
    });
  } else if (chKeys.length > 0) {
    findings.push({
      id: 'client_hints_partial',
      severity: 'medium',
      title: 'Some Client Hints present',
      detail: chKeys.join(', '),
      category: 'hints',
    });
  } else {
    findings.push({
      id: 'client_hints_none',
      severity: 'info',
      title: 'No Client Hints in this request',
      detail: 'Firefox/Safari-like or CH not negotiated (Accept-CH). Less server-side brand/model leak.',
      category: 'hints',
    });
  }

  // Proxy
  if (proxy.score >= 45) {
    findings.push({
      id: 'proxy_likely',
      severity: proxy.score >= 70 ? 'high' : 'medium',
      title: `Proxy/VPN path: ${proxy.likelihood}`,
      detail: proxy.evidence.slice(0, 4).join('; ') || 'Elevated proxy score',
      category: 'proxy',
    });
  } else if (proxy.evidence.length) {
    findings.push({
      id: 'proxy_soft',
      severity: 'low',
      title: 'Weak proxy signals',
      detail: proxy.evidence.slice(0, 3).join('; '),
      category: 'proxy',
    });
  }

  // Cross-check
  for (const m of check.mismatches) {
    findings.push({
      id: `mismatch_${findings.length}`,
      severity: 'high',
      title: 'Client ↔ server mismatch',
      detail: m,
      category: 'mismatch',
    });
  }

  if (check.webrtcVsPublicIp === 'mismatch') {
    findings.push({
      id: 'webrtc_ip_split',
      severity: 'high',
      title: 'WebRTC vs server IP diverge',
      detail: 'Possible split-tunnel VPN, WebRTC leak, or multi-path routing.',
      category: 'mismatch',
    });
  }

  // Accept headers fingerprint-ish
  if (headerSnap.accept && headerSnap.accept.length > 120) {
    findings.push({
      id: 'accept_verbose',
      severity: 'low',
      title: 'Verbose Accept header',
      detail: 'Detailed Accept can contribute to header fingerprinting.',
      category: 'headers',
    });
  }

  // Risk score
  let riskScore = 20;
  riskScore += Math.round(proxy.score * 0.45);
  riskScore += Math.min(25, chKeys.length * 4);
  riskScore += check.mismatches.length * 12;
  if (check.webrtcVsPublicIp === 'mismatch') riskScore += 15;
  if (!headerSnap.gpc) riskScore += 5;
  if (ip.ip && !ip.isPrivate) riskScore += 10; // public IP always "exposed" to this server
  riskScore = Math.max(0, Math.min(100, riskScore));

  const risk = riskFromScore(riskScore);

  const summaryParts: string[] = [];
  summaryParts.push(
    ip.ip
      ? `Edge sees you as ${ip.ip}${geo.country ? ` (${geo.country})` : ''}.`
      : 'Edge could not resolve a public client IP.'
  );
  summaryParts.push(`Proxy likelihood: ${proxy.likelihood} (${proxy.score}/100).`);
  summaryParts.push(
    chKeys.length
      ? `Client Hints on the wire: ${chKeys.length} header(s).`
      : 'No Client Hints on this request.'
  );
  if (check.performed && check.mismatches.length) {
    summaryParts.push(`${check.mismatches.length} client↔server mismatch(es).`);
  }

  const recommendations: string[] = [];
  if (proxy.likelihood === 'unlikely' && chKeys.length >= 3) {
    recommendations.push(
      'Direct path + rich Client Hints: typical stock Chromium — high server-side identity surface.'
    );
  }
  if (check.webrtcVsPublicIp === 'mismatch') {
    recommendations.push('Enable WebRTC leak protection in VPN/browser; re-scan after toggle.');
  }
  if (!headerSnap.gpc) {
    recommendations.push('Enable Global Privacy Control so Sec-GPC reaches servers.');
  }
  if (chKeys.length >= 3) {
    recommendations.push(
      'Reduce Client Hints (Firefox, or Chrome flags / privacy browser) to limit server-side model/platform leak.'
    );
  }
  if (proxy.score >= 45) {
    recommendations.push(
      'Elevated proxy signals — expected on VPN; ensure DNS/WebRTC do not bypass the tunnel.'
    );
  }
  recommendations.push(
    'This module only analyzes the current request and returns the result — no IP is stored by EchoPrint.'
  );

  return {
    module: 'network-detective',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    ephemeral: true,
    ip,
    geo,
    headers: headerSnap,
    proxy,
    findings,
    risk,
    riskScore,
    summary: summaryParts.join(' '),
    recommendations: recommendations.slice(0, 6),
    crossCheck: check,
    privacyNote:
      'Server-side Network Detective inspects only this HTTP request (IP, headers, optional client claim). EchoPrint does not persist the report or write a database.',
  };
}
