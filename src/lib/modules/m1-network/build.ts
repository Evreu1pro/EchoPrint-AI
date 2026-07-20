// ============================================================
// M1 — assemble server network module report
// ============================================================

import type { Module1Network } from '../types';
import { extractClientIp } from './ip';
import { fetchIpIntel } from './ip-intel';
import { extractHeaderOrder, extractTlsFromHeaders } from './header-order';
import { geoTimezoneMismatch } from './geo-timezone';

export interface M1ClientBody {
  timezone?: string;
  webrtcIps?: string[];
  userAgent?: string;
  language?: string;
}

function splitWebrtc(ips: string[] = []) {
  const local: string[] = [];
  const pub: string[] = [];
  for (const ip of ips) {
    if (
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
      ip.startsWith('fd') ||
      ip.startsWith('fe80') ||
      ip === '::1'
    ) {
      local.push(ip);
    } else {
      pub.push(ip);
    }
  }
  return { local, pub };
}

export async function buildModule1(request: Request, body?: M1ClientBody): Promise<Module1Network> {
  const headers = request.headers;
  const ipInfo = extractClientIp(headers);
  const ipIntel = await fetchIpIntel(ipInfo.ip);
  const headerOrder = extractHeaderOrder(headers);
  const tls = extractTlsFromHeaders(headers);

  const httpVersion =
    (request as Request & { httpVersion?: string }).httpVersion ||
    headers.get('x-http-version') ||
    null;

  const { local, pub } = splitWebrtc(body?.webrtcIps);
  let webrtcStatus: Module1Network['webrtcVsHttp']['status'] = 'not_provided';
  let webrtcDetail = 'No WebRTC IPs provided by client.';

  if (body?.webrtcIps?.length) {
    if (!ipIntel.ip) {
      webrtcStatus = 'unknown';
      webrtcDetail = 'WebRTC candidates present but HTTP IP unknown.';
    } else if (pub.length === 0) {
      webrtcStatus = 'local_only';
      webrtcDetail = `Only local WebRTC candidates (${local.slice(0, 3).join(', ')}). HTTP IP ${ipIntel.ip}.`;
      if (ipIntel.isTor || ipIntel.connectionType === 'tor') {
        webrtcDetail += ' Public path looks TOR/VPN while WebRTC is LAN-only — classic isolation pattern.';
      }
    } else if (pub.includes(ipIntel.ip)) {
      webrtcStatus = 'match';
      webrtcDetail = 'WebRTC public candidate matches HTTP IP.';
    } else {
      webrtcStatus = 'mismatch';
      webrtcDetail = `WebRTC public [${pub.slice(0, 3).join(', ')}] ≠ HTTP IP ${ipIntel.ip} — split tunnel / leak / multi-path.`;
    }
  }

  // TOR public IP + only local WebRTC = very high spoof signal handled in M4
  if (
    (ipIntel.isTor || ipIntel.connectionType === 'tor' || ipIntel.vpnScore >= 50) &&
    webrtcStatus === 'local_only'
  ) {
    webrtcDetail += ' High undercover score: anonymized HTTP egress + private WebRTC.';
  }

  const geoMismatch = geoTimezoneMismatch(
    ipIntel.lat,
    ipIntel.lon,
    body?.timezone ?? null,
    ipIntel.timezone
  );

  const findings: string[] = [];
  if (ipIntel.asn) findings.push(`ASN ${ipIntel.asn} (${ipIntel.asOrg || ipIntel.isp || '?'})`);
  findings.push(`Connection type: ${ipIntel.connectionType}, VPN score ${ipIntel.vpnScore}`);
  if (tls.ja3) findings.push(`JA3: ${tls.ja3.slice(0, 16)}…`);
  else findings.push(tls.note);
  findings.push(`Header order guess: ${headerOrder.browserGuess} (sig ${headerOrder.signature})`);
  if (geoMismatch.mismatch) {
    findings.push(
      `Geo↔Timezone mismatch: ~${geoMismatch.distanceKm} km between IP geo and timezone ${body?.timezone}`
    );
  }
  if (webrtcStatus === 'mismatch') findings.push(webrtcDetail);

  let riskScore = 15;
  riskScore += Math.round(ipIntel.vpnScore * 0.35);
  if (geoMismatch.mismatch) riskScore += 35;
  if (webrtcStatus === 'mismatch') riskScore += 25;
  if (ipIntel.isTor) riskScore += 20;
  if (headerOrder.browserGuess === 'other') riskScore += 8;
  riskScore = Math.min(100, riskScore);

  return {
    ipIntel,
    tls: {
      ja3: tls.ja3,
      ja4: tls.ja4,
      source: tls.source,
      note: tls.note,
    },
    headerOrder,
    httpVersion,
    webrtcVsHttp: {
      status: webrtcStatus,
      httpIp: ipIntel.ip,
      webrtcPublic: pub,
      webrtcLocal: local,
      detail: webrtcDetail,
    },
    geoTimezoneMismatch: geoMismatch,
    riskScore,
    findings,
  };
}
