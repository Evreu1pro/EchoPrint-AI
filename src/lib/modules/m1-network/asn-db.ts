// ============================================================
// M1 — ASN classification database
// ------------------------------------------------------------
// Why this file exists:
// Free GeoIP APIs (ipwho.is, ip-api) mark plenty of pure hosting
// networks as "residential" because their `security.hosting` flag is
// unreliable. Example from the field:
//
//   152.233.21.6 · AS212238 Datacamp Limited → reported residential, VPN 0
//
// AS212238 (Datacamp / CDN77) is a hosting + proxy/VPN exit network
// (Surfshark, NordVPN and mobile-proxy resellers ride on it). Showing
// "residential" there destroys trust in the whole scanner, so the ASN
// verdict below always overrides the API guess.
// ============================================================

export type AsnKind =
  | 'hosting' // cloud / dedicated / VPS
  | 'cdn' // CDN + proxy edge (often used as VPN exit)
  | 'vpn' // commercial VPN operator
  | 'proxy' // proxy / mobile-proxy reseller
  | 'transit' // tier-1/2 carrier — never end-user
  | 'mobile' // mobile carrier (real eyeball, but mobile)
  | 'isp' // consumer broadband / DSL / cable — a real eyeball line
  | 'business' // business access lines (real users, but corporate)
  | 'education';

export interface AsnRecord {
  name: string;
  kind: AsnKind;
  note?: string;
}

/**
 * Curated ASN → operator map. Not exhaustive (that needs a real feed —
 * see `IPINFO_TOKEN` support in `ip-intel.ts`), but it covers the ASNs
 * that actually show up behind VPNs, proxies and cloud scanners.
 */
export const ASN_DB: Record<number, AsnRecord> = {
  // --- Consumer broadband (so "residential" is knowledge, not a fallback) ---
  // DE
  57353: { name: 'freenet DLS GmbH', kind: 'isp', note: 'German consumer DSL reseller (freenet/md·net wholesale)' },
  3320: { name: 'Deutsche Telekom AG', kind: 'isp' },
  8881: { name: '1&1 Versatel', kind: 'isp' },
  8422: { name: 'NetCologne', kind: 'isp' },
  31334: { name: 'Vodafone Kabel Deutschland', kind: 'isp' },
  6805: { name: 'Telefónica Germany (o2 DSL)', kind: 'isp' },
  9145: { name: 'EWE TEL', kind: 'isp' },
  13184: { name: 'HanseNet / Telefónica DE', kind: 'isp' },
  34086: { name: 'wilhelm.tel', kind: 'isp' },
  29562: { name: 'Unitymedia / Vodafone DE cable', kind: 'isp' },
  8767: { name: 'M-net Telekommunikation', kind: 'isp' },
  25394: { name: 'M-net (business)', kind: 'business' },
  // AT / CH
  8412: { name: 'A1 Telekom Austria', kind: 'isp' },
  6830: { name: 'Liberty Global / UPC', kind: 'isp' },
  3303: { name: 'Swisscom', kind: 'isp' },
  6730: { name: 'Sunrise', kind: 'isp' },
  // Rest of EU
  12322: { name: 'Free / Proxad (FR)', kind: 'isp' },
  3215: { name: 'Orange France', kind: 'isp' },
  5410: { name: 'Bouygues Telecom', kind: 'isp' },
  2856: { name: 'BT (UK)', kind: 'isp' },
  5089: { name: 'Virgin Media (UK)', kind: 'isp' },
  13285: { name: 'TalkTalk / Opal (UK)', kind: 'isp' },
  3269: { name: 'Telecom Italia', kind: 'isp' },
  12874: { name: 'Fastweb (IT)', kind: 'isp' },
  3352: { name: 'Telefónica de España', kind: 'isp' },
  12430: { name: 'Vodafone España', kind: 'isp' },
  8708: { name: 'RCS & RDS (RO)', kind: 'isp' },
  5617: { name: 'Orange Polska', kind: 'isp' },
  1136: { name: 'KPN (NL)', kind: 'isp' },
  33915: { name: 'Ziggo (NL)', kind: 'isp' },
  3243: { name: 'MEO / Altice PT', kind: 'isp' },
  2119: { name: 'Telenor (NO)', kind: 'isp' },
  3301: { name: 'Telia Sweden', kind: 'isp' },
  // RU / UA / CIS
  12389: { name: 'Rostelecom', kind: 'isp' },
  8359: { name: 'MTS (fixed)', kind: 'isp' },
  3216: { name: 'Beeline (fixed)', kind: 'isp' },
  6849: { name: 'Ukrtelecom', kind: 'isp' },
  13188: { name: 'Triolan (UA)', kind: 'isp' },
  // NA
  7922: { name: 'Comcast Cable', kind: 'isp' },
  701: { name: 'Verizon (Fios/DSL)', kind: 'isp' },
  7018: { name: 'AT&T Internet', kind: 'isp' },
  20115: { name: 'Charter / Spectrum', kind: 'isp' },
  22773: { name: 'Cox Communications', kind: 'isp' },
  11351: { name: 'Charter / Spectrum NE', kind: 'isp' },
  5650: { name: 'Frontier Communications', kind: 'isp' },
  209: { name: 'CenturyLink / Lumen retail', kind: 'isp' },
  812: { name: 'Rogers Cable (CA)', kind: 'isp' },
  577: { name: 'Bell Canada', kind: 'isp' },
  6327: { name: 'Shaw / Rogers (CA)', kind: 'isp' },
  // APAC / LATAM
  4713: { name: 'NTT OCN (JP)', kind: 'isp' },
  2516: { name: 'KDDI (JP)', kind: 'isp' },
  17676: { name: 'SoftBank (JP)', kind: 'isp' },
  4766: { name: 'Korea Telecom', kind: 'isp' },
  4134: { name: 'Chinanet', kind: 'isp' },
  4837: { name: 'China Unicom', kind: 'isp' },
  1221: { name: 'Telstra (AU)', kind: 'isp' },
  7545: { name: 'TPG (AU)', kind: 'isp' },
  4230: { name: 'Claro / Embratel (BR)', kind: 'isp' },
  8151: { name: 'Uninet / Telmex (MX)', kind: 'isp' },
  9829: { name: 'BSNL (IN)', kind: 'isp' },
  55836: { name: 'Reliance Jio (IN)', kind: 'isp' },
  24560: { name: 'Airtel Broadband (IN)', kind: 'isp' },

  // --- Datacamp / CDN77 family (the reported false negative) ---
  212238: { name: 'Datacamp Limited', kind: 'cdn', note: 'CDN77 / VPN + mobile-proxy exits (Surfshark, NordVPN)' },
  60068: { name: 'Datacamp Limited', kind: 'cdn', note: 'CDN77 — same operator as AS212238' },
  213035: { name: 'Datacamp Limited', kind: 'cdn' },
  61317: { name: 'Datacamp / Hydra Communications', kind: 'hosting' },

  // --- Commercial VPN operators ---
  136787: { name: 'Tefincom (NordVPN)', kind: 'vpn' },
  9009: { name: 'M247', kind: 'vpn', note: 'ExpressVPN / IPVanish / many VPN exits' },
  39351: { name: '31173 Services (Mullvad)', kind: 'vpn' },
  42473: { name: 'ANEXIA', kind: 'vpn', note: 'Mullvad / Proton exits' },
  62371: { name: 'Private Internet Access', kind: 'vpn' },
  205119: { name: 'Mullvad VPN', kind: 'vpn' },
  198605: { name: 'AVAST (HideMyAss)', kind: 'vpn' },
  200651: { name: 'FlokiNET', kind: 'hosting', note: 'privacy hosting' },
  51852: { name: 'Private Layer', kind: 'hosting' },
  60729: { name: 'Zwiebelfreunde (Tor)', kind: 'hosting', note: 'Tor exit operator' },
  4224: { name: 'Calyx Institute (Tor)', kind: 'hosting', note: 'Tor exit operator' },

  // --- Proxy / mobile-proxy resellers ---
  62240: { name: 'Clouvider', kind: 'proxy' },
  206092: { name: 'IPXO', kind: 'proxy', note: 'IP leasing — proxy pools' },
  401120: { name: 'Censys / scanner range', kind: 'hosting' },
  49981: { name: 'WorldStream', kind: 'hosting' },
  44477: { name: 'Stark Industries Solutions', kind: 'proxy' },
  208046: { name: 'Heficed', kind: 'proxy' },
  210644: { name: 'AEZA Group', kind: 'proxy' },
  202425: { name: 'IP Volume', kind: 'proxy' },
  3223: { name: 'Voxility', kind: 'hosting' },

  // --- Hyperscale cloud ---
  16509: { name: 'Amazon AWS', kind: 'hosting' },
  14618: { name: 'Amazon AWS', kind: 'hosting' },
  7224: { name: 'Amazon AWS', kind: 'hosting' },
  15169: { name: 'Google', kind: 'hosting' },
  396982: { name: 'Google Cloud', kind: 'hosting' },
  19527: { name: 'Google Cloud', kind: 'hosting' },
  8075: { name: 'Microsoft', kind: 'hosting' },
  8068: { name: 'Microsoft Azure', kind: 'hosting' },
  12076: { name: 'Microsoft Azure', kind: 'hosting' },
  13335: { name: 'Cloudflare', kind: 'cdn', note: 'includes WARP egress' },
  132892: { name: 'Cloudflare', kind: 'cdn' },
  394536: { name: 'Cloudflare WARP', kind: 'cdn' },
  16625: { name: 'Akamai', kind: 'cdn' },
  20940: { name: 'Akamai', kind: 'cdn' },
  54113: { name: 'Fastly', kind: 'cdn' },
  32934: { name: 'Meta', kind: 'hosting' },
  714: { name: 'Apple (iCloud Private Relay)', kind: 'cdn', note: 'Private Relay egress' },
  6185: { name: 'Apple', kind: 'hosting' },

  // --- VPS / dedicated hosting ---
  14061: { name: 'DigitalOcean', kind: 'hosting' },
  63949: { name: 'Akamai / Linode', kind: 'hosting' },
  20473: { name: 'Vultr (Constant/Choopa)', kind: 'hosting' },
  16276: { name: 'OVH', kind: 'hosting' },
  35540: { name: 'OVH Canada', kind: 'hosting' },
  24940: { name: 'Hetzner Online', kind: 'hosting' },
  213230: { name: 'Hetzner Cloud', kind: 'hosting' },
  51167: { name: 'Contabo', kind: 'hosting' },
  197540: { name: 'netcup', kind: 'hosting' },
  12876: { name: 'Scaleway / Online SAS', kind: 'hosting' },
  30633: { name: 'Leaseweb USA', kind: 'hosting' },
  60781: { name: 'Leaseweb Netherlands', kind: 'hosting' },
  16265: { name: 'Leaseweb (WorldStream legacy)', kind: 'hosting' },
  29802: { name: 'Hivelocity', kind: 'hosting' },
  53667: { name: 'FranTech / PONYNET (BuyVM)', kind: 'hosting' },
  8100: { name: 'QuadraNet', kind: 'hosting' },
  46652: { name: 'Hostinger', kind: 'hosting' },
  47583: { name: 'Hostinger', kind: 'hosting' },
  22612: { name: 'Namecheap', kind: 'hosting' },
  26347: { name: 'DreamHost', kind: 'hosting' },
  26496: { name: 'GoDaddy', kind: 'hosting' },
  32475: { name: 'SingleHop / INAP', kind: 'hosting' },
  40021: { name: 'NL-Hosting / Kamatera', kind: 'hosting' },
  9370: { name: 'Sakura Internet', kind: 'hosting' },
  45102: { name: 'Alibaba Cloud', kind: 'hosting' },
  37963: { name: 'Alibaba Cloud', kind: 'hosting' },
  132203: { name: 'Tencent Cloud', kind: 'hosting' },
  49505: { name: 'Selectel', kind: 'hosting' },
  197695: { name: 'Reg.ru', kind: 'hosting' },
  200019: { name: 'Alexhost', kind: 'hosting' },
  43350: { name: 'NForce Entertainment', kind: 'hosting' },
  35913: { name: 'Dediserve', kind: 'hosting' },
  62567: { name: 'Digital Energy Technologies', kind: 'hosting' },
  394380: { name: 'Leaseweb USA', kind: 'hosting' },
  36352: { name: 'ColoCrossing', kind: 'hosting' },
  55293: { name: 'A2 Hosting', kind: 'hosting' },
  19551: { name: 'Incapsula / Imperva', kind: 'cdn' },
  393406: { name: 'Datashack', kind: 'hosting' },
  40824: { name: 'WZ Communications', kind: 'proxy' },

  // --- Transit-only (never an eyeball line) ---
  174: { name: 'Cogent Communications', kind: 'transit' },
  3356: { name: 'Lumen / Level3', kind: 'transit' },
  6939: { name: 'Hurricane Electric', kind: 'transit' },
  1299: { name: 'Arelion / Telia Carrier', kind: 'transit' },
  6461: { name: 'Zayo', kind: 'transit' },

  // --- Mobile carriers (real users, but mobile NAT) ---
  20057: { name: 'AT&T Mobility', kind: 'mobile' },
  21928: { name: 'T-Mobile USA', kind: 'mobile' },
  6167: { name: 'Verizon Wireless', kind: 'mobile' },
  25135: { name: 'Vodafone UK', kind: 'mobile' },
  15897: { name: 'Vodafone DE', kind: 'mobile' },
  3209: { name: 'Vodafone GmbH', kind: 'mobile' },
  13036: { name: 'Telefonica / O2 DE', kind: 'mobile' },
  25159: { name: 'Telekom Mobile', kind: 'mobile' },
  31213: { name: 'MegaFon', kind: 'mobile' },
  25513: { name: 'MTS', kind: 'mobile' },
  8402: { name: 'Beeline', kind: 'mobile' },
};

/** Org-name keywords → kind. Used when the ASN itself is unknown. */
const ORG_KEYWORDS: Array<[RegExp, AsnKind]> = [
  [/\b(tor exit|torservers|zwiebelfreunde|calyx|dfri|quintex)\b/i, 'hosting'],
  [/\b(nordvpn|tefincom|expressvpn|surfshark|mullvad|proton ?(vpn|ag)|cyberghost|ipvanish|windscribe|tunnelbear|hide\.?me|purevpn|privatevpn|private internet access|vyprvpn|astrill|hola|zenmate|torguard|perfect privacy)\b/i, 'vpn'],
  [/\b(vpn)\b/i, 'vpn'],
  [/\b(proxy|proxies|socks|mobile ?proxy|residential ?proxy|luminati|bright ?data|oxylabs|smartproxy|packetstream|iproyal|soax)\b/i, 'proxy'],
  [/\b(datacamp|cdn77|cloudflare|fastly|akamai|incapsula|imperva|stackpath|bunny ?cdn|edgecast|limelight|cachefly)\b/i, 'cdn'],
  [/\b(hosting|host|hosted|colo|colocation|datacenter|data ?center|server[s]?|dedicated|vps|cloud|iaas|virtual)\b/i, 'hosting'],
  [/\b(amazon|aws|google|microsoft|azure|oracle cloud|alibaba|tencent|digitalocean|linode|vultr|choopa|ovh|hetzner|contabo|scaleway|leaseweb|netcup|upcloud|kamatera|hostinger|godaddy|namecheap|dreamhost|ionos|1&1|aruba\.it|selectel|timeweb|reg\.ru|beget|firstbyte|aeza|alexhost|frantech|buyvm|quadranet|colocrossing|hivelocity|worldstream|nforce|m247|clouvider|heficed|zenlayer|equinix)\b/i, 'hosting'],
  [/\b(carrier|transit|backbone|cogent|lumen|level ?3|hurricane electric|arelion|telia carrier|zayo)\b/i, 'transit'],
  [/\b(mobile|wireless|cellular|lte|gsm|telecom italia mobile|t-mobile|vodafone|orange|telefonica|beeline|megafon|mts)\b/i, 'mobile'],
  [/\b(university|universit|college|school|academ|education|research and education|renater|jisc|dfn)\b/i, 'education'],
  // Eyeball-network hints run LAST so hosting/VPN keywords always win.
  [
    /\b(dsl|adsl|vdsl|ftth|fttb|fiber|fibre|broadband|breitband|kabel|cable|catv|telekom|deutsche telekom|comcast|spectrum|charter|centurylink|frontier|rostelecom|ukrtelecom|freenet|kpn|swisscom|proxad|virgin media|talktalk|residential (isp|broadband)|isp)\b/i,
    'isp',
  ],
];

/** Parses "AS212238", "212238", "as212238 Datacamp" → 212238 */
export function parseAsnNumber(asn: string | number | null | undefined): number | null {
  if (asn == null) return null;
  if (typeof asn === 'number') return Number.isFinite(asn) ? asn : null;
  const m = /(\d{2,10})/.exec(String(asn));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function lookupAsn(asn: string | number | null | undefined): (AsnRecord & { asn: number }) | null {
  const n = parseAsnNumber(asn);
  if (n == null) return null;
  const hit = ASN_DB[n];
  return hit ? { ...hit, asn: n } : null;
}

export interface AsnVerdict {
  /** Matched DB record, if any. */
  record: (AsnRecord & { asn: number }) | null;
  /** Kind decided from DB first, then org keywords. */
  kind: AsnKind | null;
  /** True when the network can never be a residential eyeball line. */
  isInfrastructure: boolean;
  /** Extra VPN/proxy score contributed by ASN knowledge (0–100). */
  scoreBoost: number;
  reasons: string[];
  /** 'asn-db' is authoritative; 'org-keyword' is a heuristic. */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Decides what a network really is, using ASN first and org text second.
 * This is what lets us print "hosting" for AS212238 even when the GeoIP
 * API insists it is residential.
 */
export function classifyAsn(
  asn: string | number | null | undefined,
  orgBlob = ''
): AsnVerdict {
  const record = lookupAsn(asn);
  const reasons: string[] = [];
  let kind: AsnKind | null = null;
  let confidence: AsnVerdict['confidence'] = 'low';

  if (record) {
    kind = record.kind;
    confidence = 'high';
    reasons.push(
      `AS${record.asn} = ${record.name} → ${record.kind}${record.note ? ` (${record.note})` : ''} [asn-db]`
    );
  } else {
    const blob = orgBlob.toLowerCase();
    for (const [re, k] of ORG_KEYWORDS) {
      if (re.test(blob)) {
        kind = k;
        confidence = 'medium';
        reasons.push(`org name matched /${re.source}/ → ${k} [org-keyword]`);
        break;
      }
    }
  }

  const infra =
    kind === 'hosting' || kind === 'cdn' || kind === 'vpn' || kind === 'proxy' || kind === 'transit';

  let scoreBoost = 0;
  if (kind === 'isp' || kind === 'business' || kind === 'mobile') {
    // Known eyeball network: VPN score stays at zero on purpose.
    return { record, kind, isInfrastructure: false, scoreBoost: 0, reasons, confidence };
  }
  if (kind === 'vpn') scoreBoost = 70;
  else if (kind === 'proxy') scoreBoost = 65;
  else if (kind === 'cdn') scoreBoost = 45;
  else if (kind === 'hosting') scoreBoost = 55;
  else if (kind === 'transit') scoreBoost = 30;
  if (confidence === 'medium') scoreBoost = Math.round(scoreBoost * 0.8);

  return { record, kind, isInfrastructure: infra, scoreBoost, reasons, confidence };
}

/** Maps an ASN kind onto the public IpConnectionType vocabulary. */
export function asnKindToConnectionType(
  kind: AsnKind | null
):
  | 'hosting'
  | 'datacenter'
  | 'vpn_suspected'
  | 'mobile'
  | 'residential'
  | 'business'
  | 'education'
  | null {
  switch (kind) {
    case 'isp':
      return 'residential';
    case 'business':
      return 'business';
    case 'vpn':
    case 'proxy':
      return 'vpn_suspected';
    case 'cdn':
    case 'hosting':
      return 'hosting';
    case 'transit':
      return 'datacenter';
    case 'mobile':
      return 'mobile';
    case 'education':
      return 'education';
    default:
      return null;
  }
}
