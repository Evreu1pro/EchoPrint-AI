// ============================================================
// M1 — IP Intelligence (ASN, type, VPN/proxy score)
// ------------------------------------------------------------
// Provider chain:
//   1. ipinfo.io  — used when IPINFO_TOKEN is set (best ASN + privacy data)
//   2. ipwho.is   — free fallback, no token needed
// Whatever the provider says, the local ASN database in `asn-db.ts`
// has the final word on connection type: an API that calls
// AS212238 (Datacamp) "residential" is simply wrong.
// ============================================================

import type { IpIntel, IpConnectionType } from '../types';
import { classifyAsn, asnKindToConnectionType, type AsnVerdict } from './asn-db';

const TOR_EXIT_HINTS = [
  'tor exit',
  'torservers',
  'zwiebelfreunde',
  'calyx',
  'dfri',
  'quetzalcoatl',
  'foundation for applied privacy',
  'quintex',
];

interface RawIntel {
  ip: string;
  asn: string | null;
  org: string;
  isp: string;
  proxy: boolean;
  hosting: boolean;
  mobile: boolean;
  tor: boolean;
  vpn: boolean;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  source: IpIntel['source'];
}

function emptyIntel(ip: string | null, source: IpIntel['source']): IpIntel {
  return {
    ip,
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
    source,
  };
}

// ---------------------------------------------------------------
// Providers
// ---------------------------------------------------------------

async function fetchFromIpinfo(ip: string, token: string): Promise<RawIntel | null> {
  try {
    const url = 'https://ipinfo.io/' + encodeURIComponent(ip) + '/json?token=' + encodeURIComponent(token);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;

    // Free plan: `org` = "AS212238 Datacamp Limited".
    // Paid plans add `asn` and `privacy` objects.
    const orgField = String(data.org || '');
    const asnObj = (data.asn || {}) as Record<string, unknown>;
    const privacy = (data.privacy || {}) as Record<string, unknown>;
    const company = (data.company || {}) as Record<string, unknown>;

    const asnFromOrg = /^(AS\d+)/i.exec(orgField)?.[1] ?? null;
    const asn = asnObj.asn ? String(asnObj.asn) : asnFromOrg;
    const org = String(asnObj.name || company.name || orgField.replace(/^AS\d+\s*/i, '') || '');

    const loc = String(data.loc || '');
    const [latStr, lonStr] = loc.split(',');

    return {
      ip: String(data.ip || ip),
      asn,
      org,
      isp: String(company.name || org || ''),
      proxy: Boolean(privacy.proxy || privacy.relay),
      hosting: Boolean(privacy.hosting || String(asnObj.type || '') === 'hosting'),
      mobile: String(asnObj.type || '') === 'isp' && Boolean(privacy.mobile),
      tor: Boolean(privacy.tor),
      vpn: Boolean(privacy.vpn),
      country: String(data.country || '') || null,
      countryCode: String(data.country || '') || null,
      region: String(data.region || '') || null,
      city: String(data.city || '') || null,
      lat: latStr ? Number(latStr) : null,
      lon: lonStr ? Number(lonStr) : null,
      timezone: String(data.timezone || '') || null,
      source: 'ipinfo',
    };
  } catch {
    return null;
  }
}

async function fetchFromIpwho(ip: string): Promise<RawIntel | null> {
  try {
    const url = 'https://ipwho.is/' + encodeURIComponent(ip);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data.success === false) return null;

    const connection = (data.connection || {}) as Record<string, unknown>;
    const security = (data.security || {}) as Record<string, unknown>;
    const org = String(connection.org || data.org || '');
    const asn = connection.asn != null ? `AS${connection.asn}` : String(data.asn || '') || null;

    return {
      ip: String(data.ip || ip),
      asn,
      org,
      isp: String(connection.isp || data.isp || ''),
      proxy: Boolean(security.proxy),
      hosting: Boolean(security.hosting),
      mobile: Boolean(data.is_mobile ?? security.mobile),
      tor: Boolean(security.tor),
      vpn: Boolean(security.vpn),
      country: String(data.country || '') || null,
      countryCode: String(data.country_code || '') || null,
      region: String(data.region || '') || null,
      city: String(data.city || '') || null,
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lon: typeof data.longitude === 'number' ? data.longitude : null,
      timezone:
        typeof data.timezone === 'object' && data.timezone
          ? String((data.timezone as { id?: string }).id || '') || null
          : String(data.timezone || '') || null,
      source: 'ipwho',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Classification (ASN database wins over API flags)
// ---------------------------------------------------------------

export interface Classification {
  type: IpConnectionType;
  isHosting: boolean;
  isProxy: boolean;
  isMobile: boolean;
  isTor: boolean;
  vpnScore: number;
  reasons: string[];
  asnVerdict: AsnVerdict;
}

export function classifyIntel(raw: {
  asn: string | null;
  org?: string;
  isp?: string;
  proxy?: boolean;
  hosting?: boolean;
  mobile?: boolean;
  tor?: boolean;
  vpn?: boolean;
}): Classification {
  const blob = `${raw.org || ''} ${raw.isp || ''} ${raw.asn || ''}`.trim();
  const verdict = classifyAsn(raw.asn, blob);
  const reasons = [...verdict.reasons];

  const lower = blob.toLowerCase();
  const torByName = TOR_EXIT_HINTS.some((t) => lower.includes(t));
  const isTor = Boolean(raw.tor) || torByName;

  const dbType = asnKindToConnectionType(verdict.kind);
  let type: IpConnectionType;

  if (isTor) {
    type = 'tor';
    reasons.push('Tor exit signal');
  } else if (dbType) {
    type = raw.vpn && (dbType === 'hosting' || dbType === 'datacenter') ? 'vpn_suspected' : dbType;
  } else if (raw.vpn || raw.proxy) {
    type = 'vpn_suspected';
    reasons.push('provider privacy flag: proxy/vpn');
  } else if (raw.hosting) {
    type = 'hosting';
    reasons.push('provider privacy flag: hosting');
  } else if (raw.mobile) {
    type = 'mobile';
    reasons.push('provider flag: mobile carrier');
  } else if (raw.asn) {
    type = 'residential';
    reasons.push('no ASN-db or keyword match → treated as residential (low confidence)');
  } else {
    type = 'unknown';
  }

  const isHosting =
    verdict.kind === 'hosting' ||
    verdict.kind === 'cdn' ||
    verdict.kind === 'transit' ||
    Boolean(raw.hosting);
  const isProxy = Boolean(raw.proxy || raw.vpn) || verdict.kind === 'vpn' || verdict.kind === 'proxy';
  const isMobile = Boolean(raw.mobile) || verdict.kind === 'mobile';

  // ---- VPN/proxy score -------------------------------------------------
  let score = verdict.scoreBoost;
  if (raw.proxy) score += 25;
  if (raw.vpn) score += 25;
  if (isTor) score += 55;
  if (raw.hosting) score += 20;
  if (type === 'residential' && !isProxy && !isHosting) score = Math.min(score, 5);
  const vpnScore = Math.max(0, Math.min(100, score));

  if (verdict.isInfrastructure && !raw.hosting && !raw.proxy && !raw.vpn) {
    reasons.push(
      'GeoIP provider reported no hosting/proxy flag — overridden by ASN database (would otherwise print "residential")'
    );
  }

  return { type, isHosting, isProxy, isMobile, isTor, vpnScore, reasons, asnVerdict: verdict };
}

// ---------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------

function readToken(): string | null {
  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const token = env?.IPINFO_TOKEN || env?.NEXT_PUBLIC_IPINFO_TOKEN;
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

/**
 * HTTPS-friendly IP intel. Uses ipinfo.io when IPINFO_TOKEN is configured,
 * otherwise ipwho.is, and always re-classifies through the local ASN DB.
 */
export async function fetchIpIntel(ip: string | null): Promise<IpIntel> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return emptyIntel(ip, 'none');
  }

  const token = readToken();
  let raw: RawIntel | null = null;
  if (token) raw = await fetchFromIpinfo(ip, token);
  if (!raw) raw = await fetchFromIpwho(ip);

  if (!raw) {
    // Even with no provider data, the ASN may be known from headers upstream.
    return emptyIntel(ip, 'error');
  }

  const cls = classifyIntel(raw);

  return {
    ip: raw.ip,
    asn: raw.asn,
    asOrg: raw.org || null,
    isp: raw.isp || null,
    connectionType: cls.type,
    isProxy: cls.isProxy,
    isHosting: cls.isHosting,
    isMobile: cls.isMobile,
    isTor: cls.isTor,
    vpnScore: cls.vpnScore,
    country: raw.country,
    countryCode: raw.countryCode,
    region: raw.region,
    city: raw.city,
    lat: raw.lat,
    lon: raw.lon,
    timezone: raw.timezone,
    source: raw.source,
    asnKind: cls.asnVerdict.kind,
    asnDbName: cls.asnVerdict.record?.name ?? null,
    classificationConfidence: cls.asnVerdict.confidence,
    classificationReasons: cls.reasons,
  };
}
