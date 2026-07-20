// ============================================================
// EchoPrint AI v2 — Exposure Surface & Tracker Intelligence
// Honest model: what CAN track you + real page signals
// (no false "AliExpress detected" on a clean browser)
// ============================================================

import type { FingerprintData } from '../types';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TrackerIntel {
  id: string;
  name: string;
  category: 'ecommerce' | 'social' | 'adtech' | 'analytics' | 'cdn';
  riskLevel: RiskLevel;
  regions: string[];
  fingerprintVectors: string[];
  domains: string[];
  storagePatterns: RegExp[];
  scriptPatterns: RegExp[];
  notes: string;
}

/** Educational threat models — used for matching real page artifacts only */
export const TRACKER_INTEL: TrackerIntel[] = [
  {
    id: 'meta',
    name: 'Meta (Facebook / Instagram)',
    category: 'social',
    riskLevel: 'CRITICAL',
    regions: ['global'],
    fingerprintVectors: ['canvas', 'webgl', 'audio', 'fonts', 'webrtc', 'behavioral'],
    domains: ['facebook.com', 'facebook.net', 'fbcdn.net', 'connect.facebook.net', 'fbevents.js'],
    storagePatterns: [/^_fbp$/, /^_fbc$/, /fr$/, /xs$/],
    scriptPatterns: [/fbevents\.js/i, /connect\.facebook\.net/i, /fbq\s*\(/],
    notes: 'Aggressive cross-site ID graph via pixel + login state.',
  },
  {
    id: 'google',
    name: 'Google Ads / Analytics',
    category: 'adtech',
    riskLevel: 'CRITICAL',
    regions: ['global'],
    fingerprintVectors: ['canvas', 'webgl', 'audio', 'fonts', 'client_hints', 'behavioral'],
    domains: ['google-analytics.com', 'googletagmanager.com', 'doubleclick.net', 'googleadservices.com', 'googlesyndication.com'],
    storagePatterns: [/^_ga/, /^_gid$/, /^_gcl_/, /^IDE$/],
    scriptPatterns: [/gtag\/js/i, /googletagmanager/i, /google-analytics/i, /gtag\s*\(/],
    notes: 'Widest ad ecosystem; Client Hints + cookie + conversion linker.',
  },
  {
    id: 'tiktok',
    name: 'TikTok / ByteDance',
    category: 'social',
    riskLevel: 'CRITICAL',
    regions: ['global', 'apac'],
    fingerprintVectors: ['canvas', 'webgl', 'audio', 'fonts', 'sensors', 'battery', 'behavioral'],
    domains: ['tiktok.com', 'byteoversea.com', 'ttwstatic.com', 'analytics.tiktok.com'],
    storagePatterns: [/^_ttp$/, /^tt_/, /msToken/i],
    scriptPatterns: [/analytics\.tiktok\.com/i, /ttq\s*\./],
    notes: 'Heavy device + behavioral signals; mobile-first graph.',
  },
  {
    id: 'amazon',
    name: 'Amazon Ads',
    category: 'ecommerce',
    riskLevel: 'HIGH',
    regions: ['global'],
    fingerprintVectors: ['canvas', 'webgl', 'fonts', 'behavioral'],
    domains: ['amazon-adsystem.com', 'assoc-amazon.com', 'advertising.amazon.com'],
    storagePatterns: [/^ad-id$/, /^ad-privacy$/, /csm-hit/i],
    scriptPatterns: [/amazon-adsystem/i, /apstag/i],
    notes: 'Retail + DSP identity; strong on product sites.',
  },
  {
    id: 'aliexpress',
    name: 'AliExpress / Alibaba',
    category: 'ecommerce',
    riskLevel: 'CRITICAL',
    regions: ['eu', 'global', 'cn'],
    fingerprintVectors: ['canvas', 'webgl', 'audio', 'fonts', 'battery', 'behavioral'],
    domains: ['alicdn.com', 'mmstat.com', 'alipay.com', 'aliexpress.com', 'taobao.com'],
    storagePatterns: [/cna/i, /isg/i, /tfstk/i, /_m_h5_tk/],
    scriptPatterns: [/aplus_v2/i, /sufei_data/i, /AWSC\/awsc/i, /mmstat\.com/i],
    notes: 'Device risk scoring + cross-border data flows.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Insight',
    category: 'adtech',
    riskLevel: 'HIGH',
    regions: ['global'],
    fingerprintVectors: ['canvas', 'fonts', 'behavioral'],
    domains: ['licdn.com', 'linkedin.com', 'snap.licdn.com'],
    storagePatterns: [/^li_/, /^AnalyticsSyncHistory$/, /^UserMatchHistory$/],
    scriptPatterns: [/snap\.licdn\.com/i, /insight\.min\.js/i],
    notes: 'B2B identity graph via Insight Tag.',
  },
  {
    id: 'microsoft',
    name: 'Microsoft / Bing UET',
    category: 'adtech',
    riskLevel: 'HIGH',
    regions: ['global'],
    fingerprintVectors: ['canvas', 'webgl', 'client_hints', 'behavioral'],
    domains: ['bat.bing.com', 'clarity.ms', 'msn.com'],
    storagePatterns: [/^_uetsid$/, /^_uetvid$/, /^CLID$/],
    scriptPatterns: [/bat\.bing\.com/i, /clarity\.ms/i, /uetq/i],
    notes: 'Ads + Clarity session replay.',
  },
  {
    id: 'x_twitter',
    name: 'X (Twitter)',
    category: 'social',
    riskLevel: 'HIGH',
    regions: ['global'],
    fingerprintVectors: ['canvas', 'webgl', 'behavioral'],
    domains: ['ads-twitter.com', 't.co', 'twimg.com', 'twitter.com', 'x.com'],
    storagePatterns: [/^personalization_id$/, /^muc_ads$/, /^guest_id/],
    scriptPatterns: [/static\.ads-twitter\.com/i, /twq\s*\(/],
    notes: 'Pixel + conversion API; login graph when authenticated.',
  },
  {
    id: 'yandex',
    name: 'Yandex Metrica',
    category: 'analytics',
    riskLevel: 'HIGH',
    regions: ['cis', 'eu'],
    fingerprintVectors: ['canvas', 'webgl', 'audio', 'fonts', 'webrtc'],
    domains: ['mc.yandex.ru', 'yandex.ru', 'yastatic.net'],
    storagePatterns: [/^_ym_/, /^yabs-/],
    scriptPatterns: [/mc\.yandex\.ru/i, /metrika\/tag/i, /ym\s*\(/],
    notes: 'Strong CIS footprint; WebVisor session replay.',
  },
  {
    id: 'hotjar',
    name: 'Hotjar / Contentsquare',
    category: 'analytics',
    riskLevel: 'MEDIUM',
    regions: ['global'],
    fingerprintVectors: ['behavioral'],
    domains: ['hotjar.com', 'static.hotjar.com'],
    storagePatterns: [/^_hj/],
    scriptPatterns: [/static\.hotjar\.com/i, /hjSiteSettings/i],
    notes: 'Session replay + heatmaps; less fingerprint, more behavior.',
  },
];

export interface ExposureVector {
  id: string;
  name: string;
  available: boolean;
  severity: RiskLevel;
  description: string;
  mitigation: string;
}

export interface LiveTrackerHit {
  tracker: TrackerIntel;
  confidence: number;
  matched: { type: 'domain' | 'script' | 'cookie' | 'storage'; value: string }[];
  riskScore: number;
}

export interface ExposureReport {
  vectors: ExposureVector[];
  exposedCount: number;
  totalVectors: number;
  exposureScore: number; // 0-100 higher = more exposed
  liveHits: LiveTrackerHit[];
  pageScanned: boolean;
  overallRisk: RiskLevel;
  recommendations: string[];
}

export interface PageArtifacts {
  scriptSrcs: string[];
  performanceUrls: string[];
  cookies: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
}

/** Collect real third-party / storage artifacts from the current page */
export function collectPageArtifacts(): PageArtifacts {
  const scriptSrcs: string[] = [];
  const performanceUrls: string[] = [];
  const cookies: string[] = [];
  const localStorageKeys: string[] = [];
  const sessionStorageKeys: string[] = [];

  if (typeof document !== 'undefined') {
    document.querySelectorAll('script[src]').forEach((el) => {
      const src = (el as HTMLScriptElement).src;
      if (src) scriptSrcs.push(src);
    });
    try {
      cookies.push(
        ...document.cookie
          .split(';')
          .map((c) => c.trim().split('=')[0])
          .filter(Boolean)
      );
    } catch {
      /* ignore */
    }
  }

  if (typeof performance !== 'undefined' && performance.getEntriesByType) {
    try {
      for (const e of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
        if (e.name) performanceUrls.push(e.name);
      }
    } catch {
      /* ignore */
    }
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) localStorageKeys.push(k);
    }
  } catch {
    /* ignore */
  }

  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) sessionStorageKeys.push(k);
    }
  } catch {
    /* ignore */
  }

  return { scriptSrcs, performanceUrls, cookies, localStorageKeys, sessionStorageKeys };
}

function buildVectors(data: FingerprintData): ExposureVector[] {
  return [
    {
      id: 'canvas',
      name: 'Canvas 2D',
      available: data.canvas.supported,
      severity: 'HIGH',
      description: 'GPU/font rasterization leaves a stable bitmap hash usable as a device ID.',
      mitigation: 'Browser RFP, canvas poisoner, or block toDataURL (breaks sites).',
    },
    {
      id: 'webgl',
      name: 'WebGL GPU',
      available: data.webgl.supported,
      severity: 'CRITICAL',
      description: `Renderer exposed: ${data.webgl.renderer || 'n/a'}. Strong hardware identifier.`,
      mitigation: 'WebGL block / generic renderer (Firefox RFP, Tor).',
    },
    {
      id: 'audio',
      name: 'AudioContext',
      available: data.audio.supported,
      severity: 'HIGH',
      description: 'OfflineAudio processing stack produces stable float noise signatures.',
      mitigation: 'Disable AudioContext or use noise injection carefully.',
    },
    {
      id: 'fonts',
      name: 'Font enumeration',
      available: data.fonts.count > 0,
      severity: 'MEDIUM',
      description: `${data.fonts.count} fonts measurable — high entropy on desktop.`,
      mitigation: 'Standard font set, remote fonts only, or Tor Browser.',
    },
    {
      id: 'webrtc',
      name: 'WebRTC IP leak',
      available: data.webrtc.enabled && (data.webrtc.localIPs.length > 0 || !!data.webrtc.publicIP),
      severity: 'CRITICAL',
      description:
        data.webrtc.localIPs.length || data.webrtc.publicIP
          ? `IPs observed: ${[...data.webrtc.localIPs, data.webrtc.publicIP].filter(Boolean).join(', ')}`
          : 'WebRTC available (no ICE candidates in this scan).',
      mitigation: 'Disable WebRTC or use browser/VPN WebRTC protection.',
    },
    {
      id: 'client_hints',
      name: 'Client Hints',
      available: !!data.navigator.userAgentData,
      severity: 'HIGH',
      description: 'Sec-CH-UA high-entropy fields can reveal model, platform version, architecture.',
      mitigation: 'Reduce Client Hints (Firefox) or privacy browser.',
    },
    {
      id: 'sensors',
      name: 'Device sensors',
      available: data.sensors.deviceMotion || data.sensors.deviceOrientation || data.sensors.accelerometer,
      severity: 'MEDIUM',
      description: 'Motion/orientation APIs aid mobile re-identification.',
      mitigation: 'Permission deny / OS privacy toggles.',
    },
    {
      id: 'battery',
      name: 'Battery API',
      available: data.battery.supported,
      severity: 'LOW',
      description: 'Battery level/charging used historically as a short-lived ID.',
      mitigation: 'Most modern browsers restricted; still check mobile WebViews.',
    },
    {
      id: 'media_devices',
      name: 'Media devices',
      available: data.mediaDevices.cameras + data.mediaDevices.microphones + data.mediaDevices.speakers > 0,
      severity: 'MEDIUM',
      description: `${data.mediaDevices.cameras} cam / ${data.mediaDevices.microphones} mic / ${data.mediaDevices.speakers} out`,
      mitigation: 'Deny permissions; labels only after grant.',
    },
    {
      id: 'storage',
      name: 'Persistent storage',
      available: data.storage.localStorage || data.storage.indexedDB,
      severity: 'HIGH',
      description: 'localStorage / IndexedDB enable evercookies and first-party IDs.',
      mitigation: 'Clear site data, containers, strict partitioning.',
    },
    {
      id: 'speech',
      name: 'Speech synthesis voices',
      available: data.misc.speechVoices.length > 0,
      severity: 'LOW',
      description: `${data.misc.speechVoices.length} voices — OS/locale fingerprint.`,
      mitigation: 'Limited; often ignored by casual trackers.',
    },
    {
      id: 'timezone',
      name: 'Timezone & locale',
      available: !!data.misc.timezone,
      severity: 'MEDIUM',
      description: `${data.misc.timezone} / ${data.navigator.language}`,
      mitigation: 'Match VPN exit to locale; avoid mismatches (looks spoofed).',
    },
  ];
}

function matchTrackers(artifacts: PageArtifacts): LiveTrackerHit[] {
  const haystack = [
    ...artifacts.scriptSrcs,
    ...artifacts.performanceUrls,
  ].join('\n');

  const hits: LiveTrackerHit[] = [];

  for (const t of TRACKER_INTEL) {
    const matched: LiveTrackerHit['matched'] = [];

    for (const d of t.domains) {
      if (haystack.toLowerCase().includes(d.toLowerCase())) {
        matched.push({ type: 'domain', value: d });
      }
    }
    for (const re of t.scriptPatterns) {
      if (re.test(haystack)) {
        matched.push({ type: 'script', value: re.source });
      }
    }
    for (const re of t.storagePatterns) {
      for (const c of artifacts.cookies) {
        if (re.test(c)) matched.push({ type: 'cookie', value: c });
      }
      for (const k of artifacts.localStorageKeys) {
        if (re.test(k)) matched.push({ type: 'storage', value: k });
      }
      for (const k of artifacts.sessionStorageKeys) {
        if (re.test(k)) matched.push({ type: 'storage', value: `session:${k}` });
      }
    }

    // Deduplicate matched values
    const uniq = new Map(matched.map((m) => [`${m.type}:${m.value}`, m]));
    const uniqueMatched = Array.from(uniq.values());

    if (uniqueMatched.length === 0) continue;

    const confidence = Math.min(98, 25 + uniqueMatched.length * 18);
    const base =
      t.riskLevel === 'CRITICAL' ? 40 :
      t.riskLevel === 'HIGH' ? 28 :
      t.riskLevel === 'MEDIUM' ? 18 : 10;
    const riskScore = Math.min(100, base + uniqueMatched.length * 12);

    hits.push({ tracker: t, confidence, matched: uniqueMatched, riskScore });
  }

  return hits.sort((a, b) => b.riskScore - a.riskScore);
}

function riskFromScore(score: number, hasCriticalHit: boolean): RiskLevel {
  if (hasCriticalHit || score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

/**
 * Analyze fingerprint exposure surface + real page tracker hits.
 * Does NOT claim platform tracking solely because Canvas exists.
 */
export function analyzeExposure(data: FingerprintData, artifacts?: PageArtifacts): ExposureReport {
  const pageArtifacts = artifacts ?? collectPageArtifacts();
  const vectors = buildVectors(data);
  const exposed = vectors.filter((v) => v.available);
  const exposureScore = Math.round(
    (exposed.reduce((s, v) => {
      const w = v.severity === 'CRITICAL' ? 12 : v.severity === 'HIGH' ? 9 : v.severity === 'MEDIUM' ? 6 : 3;
      return s + w;
    }, 0) /
      (vectors.length * 9)) *
      100
  );

  const liveHits = matchTrackers(pageArtifacts);
  const liveBoost = Math.min(40, liveHits.reduce((s, h) => s + h.riskScore * 0.15, 0));
  const combined = Math.min(100, Math.round(exposureScore * 0.7 + liveBoost));

  const recommendations: string[] = [];
  if (vectors.find((v) => v.id === 'webrtc')?.available) {
    recommendations.push('Disable or protect WebRTC to stop local/public IP leakage.');
  }
  if (vectors.find((v) => v.id === 'webgl')?.available) {
    recommendations.push('WebGL renderer is a strong hardware ID — consider Firefox RFP or a privacy browser.');
  }
  if (data.fonts.count > 80) {
    recommendations.push('Large font sets increase uniqueness on desktop — reduce installed fonts for anonymity.');
  }
  if (liveHits.length === 0) {
    recommendations.push('No known third-party tracker artifacts on this page (expected on EchoPrint itself).');
  } else {
    recommendations.push(
      `Live tracker artifacts: ${liveHits.map((h) => h.tracker.name).join(', ')}. Clear site data or use containers.`
    );
  }
  recommendations.push('Prefer browsers with total cookie protection / strict tracking prevention.');
  recommendations.push('Keep timezone, language, and VPN region consistent to avoid looking spoofed.');

  return {
    vectors,
    exposedCount: exposed.length,
    totalVectors: vectors.length,
    exposureScore: combined,
    liveHits,
    pageScanned: true,
    overallRisk: riskFromScore(combined, liveHits.some((h) => h.tracker.riskLevel === 'CRITICAL' && h.confidence > 50)),
    recommendations: recommendations.slice(0, 6),
  };
}
