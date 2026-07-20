// ============================================================
// M1 — IP Intelligence (ASN, type, VPN/Tor score)
// ============================================================

import type { IpIntel, IpConnectionType } from '../types';

const TOR_EXIT_HINTS = [
  'tor',
  'torservers',
  'calyx',
  'dfri',
  'quetzalcoatl',
  'foundation for applied privacy',
];

const VPN_ORG_HINTS = [
  'mullvad',
  'nordvpn',
  'expressvpn',
  'surfshark',
  'proton',
  'private internet access',
  'pia',
  'cyberghost',
  'ipvanish',
  'windscribe',
  'tunnelbear',
  'hide.me',
  'vpn',
  'proxy',
  'digitalocean',
  'linode',
  'vultr',
  'ovh',
  'hetzner',
  'amazon',
  'google cloud',
  'microsoft azure',
  'cloudflare',
  'contabo',
];

function classifyType(data: {
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
  org?: string;
  as?: string;
  isp?: string;
}): IpConnectionType {
  const blob = `${data.org || ''} ${data.as || ''} ${data.isp || ''}`.toLowerCase();
  if (TOR_EXIT_HINTS.some((t) => blob.includes(t))) return 'tor';
  if (data.mobile) return 'mobile';
  if (data.hosting || data.proxy) {
    if (
      VPN_ORG_HINTS.some(
        (v) => blob.includes(v) && (v.includes('vpn') || v === 'mullvad' || v === 'proton')
      )
    ) {
      return 'vpn_suspected';
    }
    return 'datacenter';
  }
  if (blob.includes('university') || blob.includes('education')) return 'education';
  if (blob.includes('telecom') || blob.includes('mobile') || blob.includes('wireless')) return 'mobile';
  return 'residential';
}

function vpnScoreFrom(data: {
  proxy?: boolean;
  hosting?: boolean;
  org?: string;
  as?: string;
  type: IpConnectionType;
}): number {
  let s = 0;
  if (data.proxy) s += 40;
  if (data.hosting) s += 35;
  if (data.type === 'tor') s += 55;
  if (data.type === 'vpn_suspected') s += 45;
  if (data.type === 'datacenter') s += 30;
  const blob = `${data.org || ''} ${data.as || ''}`.toLowerCase();
  if (VPN_ORG_HINTS.some((v) => blob.includes(v))) s += 20;
  return Math.min(100, s);
}

/**
 * HTTPS-friendly IP intel (ipwho.is free tier).
 */
export async function fetchIpIntel(ip: string | null): Promise<IpIntel> {
  const empty: IpIntel = {
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
    source: ip ? 'error' : 'none',
  };

  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { ...empty, source: 'none' };
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ...empty, source: 'error' };
    const data = (await res.json()) as Record<string, unknown>;
    if (data.success === false) return { ...empty, source: 'error' };

    const connection = (data.connection || {}) as Record<string, unknown>;
    const org = String(connection.org || data.org || '');
    const as = connection.asn != null ? `AS${connection.asn}` : String(data.asn || '');
    const isp = String(connection.isp || data.isp || '');
    const security = (data.security || {}) as Record<string, unknown>;

    const type = classifyType({
      mobile: Boolean(data.is_mobile ?? security.mobile),
      proxy: Boolean(security.proxy || security.vpn),
      hosting: Boolean(security.hosting),
      org,
      as,
      isp,
    });

    return {
      ip: String(data.ip || ip),
      asn: as || null,
      asOrg: org || null,
      isp: isp || null,
      connectionType: type,
      isProxy: Boolean(security.proxy || security.vpn),
      isHosting: Boolean(security.hosting),
      isMobile: Boolean(data.is_mobile),
      isTor: type === 'tor' || Boolean(security.tor),
      vpnScore: vpnScoreFrom({
        proxy: Boolean(security.proxy || security.vpn),
        hosting: Boolean(security.hosting),
        org,
        as,
        type,
      }),
      country: String(data.country || '') || null,
      countryCode: String(data.country_code || '') || null,
      region: String(data.region || '') || null,
      city: String(data.city || '') || null,
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lon: typeof data.longitude === 'number' ? data.longitude : null,
      timezone:
        typeof data.timezone === 'object' && data.timezone
          ? String((data.timezone as { id?: string }).id || '')
          : String(data.timezone || '') || null,
      source: 'ip-api',
    };
  } catch {
    return { ...empty, source: 'error' };
  }
}
