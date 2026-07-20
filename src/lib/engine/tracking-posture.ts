// ============================================================
// EchoPrint AI v2.1 — Tracking Posture & Deep Ad-Tech Surface
// Differentiates stock Chrome (high harvest) vs hardened browsers
// ============================================================

export type ProtectionLevel =
  | 'none'
  | 'basic'
  | 'standard'
  | 'strict'
  | 'maximum';

export type SurfaceStatus = 'open' | 'restricted' | 'blocked' | 'unknown';

export interface AdApiProbe {
  id: string;
  name: string;
  category: 'ads' | 'identity' | 'cross_site' | 'fingerprint' | 'network' | 'privacy_signal';
  status: SurfaceStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detail: string;
  /** Why this matters for tracking */
  trackingImpact: string;
}

export interface NetworkBlockProbe {
  id: string;
  url: string;
  label: string;
  blocked: boolean;
  latencyMs: number | null;
  method: 'script' | 'image' | 'fetch';
}

export interface TrackingPostureReport {
  /** 0–100: higher = more exposed to ads/deep tracking */
  trackingSurfaceScore: number;
  /** 0–100: higher = stronger privacy protections active */
  protectionScore: number;
  protectionLevel: ProtectionLevel;
  browserProfile:
    | 'stock_chrome'
    | 'chromium_hardened'
    | 'brave'
    | 'firefox_strict'
    | 'safari_itp'
    | 'tor_like'
    | 'edge'
    | 'other';
  adApis: AdApiProbe[];
  openCriticalCount: number;
  blockedNetworkCount: number;
  networkProbes: NetworkBlockProbe[];
  privacySignals: {
    gpc: boolean | null;
    dnt: string | null;
    cookiesEnabled: boolean;
    thirdPartyCookiesLikelyBlocked: boolean | null;
    storageAccessApi: boolean;
    brave: boolean;
    rfpLike: boolean;
  };
  summary: string;
  recommendations: string[];
  /** Human-readable comparison anchor */
  vsStockChrome: string;
}

function apiOpen(exists: boolean, restricted = false): SurfaceStatus {
  if (!exists) return 'blocked';
  if (restricted) return 'restricted';
  return 'open';
}

function win(): Record<string, unknown> {
  return typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
}

function nav(): Record<string, unknown> {
  return typeof navigator !== 'undefined' ? (navigator as unknown as Record<string, unknown>) : {};
}

function doc(): Record<string, unknown> {
  return typeof document !== 'undefined' ? (document as unknown as Record<string, unknown>) : {};
}

async function detectBrave(): Promise<boolean> {
  const n = nav();
  try {
    const brave = n.brave as { isBrave?: () => Promise<boolean> } | undefined;
    if (brave && typeof brave.isBrave === 'function') {
      return await brave.isBrave();
    }
  } catch {
    /* ignore */
  }
  const ua = String(n.userAgent || '').toLowerCase();
  return ua.includes('brave');
}

function isFirefox(): boolean {
  return /firefox\//i.test(String(nav().userAgent || '')) && !/seamonkey/i.test(String(nav().userAgent || ''));
}

function isSafari(): boolean {
  const ua = String(nav().userAgent || '');
  return /safari/i.test(ua) && !/chrome|chromium|android|crios|fxios/i.test(ua);
}

function isChromeFamily(brave: boolean): boolean {
  const ua = String(nav().userAgent || '');
  return /chrome|crios|chromium/i.test(ua) && !/edg/i.test(ua) && !brave;
}

function isEdge(): boolean {
  return /edg\//i.test(String(nav().userAgent || ''));
}

/** RFP / Tor-like genericized environment heuristics */
function detectRfpLike(): boolean {
  if (!isFirefox() && !/tor/i.test(String(nav().userAgent || ''))) {
    // Still check genericization
  }
  const cores = Number(nav().hardwareConcurrency || 0);
  const mem = Number(nav().deviceMemory || 0);
  const screenW = typeof screen !== 'undefined' ? screen.width : 0;
  const screenH = typeof screen !== 'undefined' ? screen.height : 0;
  // Classic RFP: cores often 2, mem 2, letterboxing screens
  const genericHw = cores === 2 && (mem === 2 || mem === 0);
  const letterbox =
    screenW > 0 &&
    screenH > 0 &&
    (screenW % 200 === 0 || screenH % 100 === 0) &&
    [1000, 1200, 1400, 1600, 1800, 2000].includes(screenW);
  return genericHw || (isFirefox() && letterbox && cores <= 4);
}

function probeAdApis(): AdApiProbe[] {
  const w = win();
  const n = nav();
  const d = doc();
  const probes: AdApiProbe[] = [];

  // --- Privacy signals (good when present) ---
  const gpc = n.globalPrivacyControl;
  probes.push({
    id: 'gpc',
    name: 'Global Privacy Control (GPC)',
    category: 'privacy_signal',
    status: gpc === true ? 'open' : gpc === false ? 'restricted' : 'blocked',
    severity: 'medium',
    detail:
      gpc === true
        ? 'GPC enabled — sites should honor “do not sell/share”.'
        : gpc === false
          ? 'GPC explicitly false.'
          : 'GPC not exposed (common in stock Chrome).',
    trackingImpact: 'When true, reduces legal/sale sharing; does not stop fingerprinting.',
  });

  const dnt = n.doNotTrack != null ? String(n.doNotTrack) : null;
  probes.push({
    id: 'dnt',
    name: 'Do Not Track',
    category: 'privacy_signal',
    status: dnt === '1' ? 'open' : 'blocked',
    severity: 'low',
    detail: dnt != null ? `navigator.doNotTrack = ${dnt}` : 'DNT not set / ignored by most adtech.',
    trackingImpact: 'Mostly obsolete; rarely honored by trackers.',
  });

  // --- Chrome Privacy Sandbox / deep ad identity ---
  const hasTopics =
    typeof d.browsingTopics === 'function' ||
    typeof (document as unknown as { browsingTopics?: unknown }).browsingTopics === 'function';
  probes.push({
    id: 'topics_api',
    name: 'Topics API (ad interest topics)',
    category: 'ads',
    status: apiOpen(hasTopics),
    severity: 'critical',
    detail: hasTopics
      ? 'document.browsingTopics available — browser can expose interest topics to sites/ads.'
      : 'Topics API not available (blocked, disabled, or non-Chromium).',
    trackingImpact: 'Cross-site interest cohorts without classic third-party cookies.',
  });

  const hasProtectedAudience =
    typeof n.joinAdInterestGroup === 'function' ||
    typeof n.runAdAuction === 'function' ||
    typeof n.leaveAdInterestGroup === 'function' ||
    typeof n.updateAdInterestGroups === 'function';
  probes.push({
    id: 'protected_audience',
    name: 'Protected Audience (FLEDGE)',
    category: 'ads',
    status: apiOpen(hasProtectedAudience),
    severity: 'critical',
    detail: hasProtectedAudience
      ? 'Interest-group / on-device auction APIs present — deep retargeting surface.'
      : 'Protected Audience APIs not present.',
    trackingImpact: 'Remarketing-like cohorts inside the browser.',
  });

  const hasSharedStorage =
    typeof w.sharedStorage !== 'undefined' ||
    typeof (window as unknown as { sharedStorage?: unknown }).sharedStorage !== 'undefined';
  probes.push({
    id: 'shared_storage',
    name: 'Shared Storage API',
    category: 'cross_site',
    status: apiOpen(hasSharedStorage),
    severity: 'high',
    detail: hasSharedStorage
      ? 'window.sharedStorage available — cross-site storage for ads/measurement.'
      : 'Shared Storage not available.',
    trackingImpact: 'Cross-site creative selection & measurement without classic cookies.',
  });

  const hasAttribution =
    typeof d.attributionReporting !== 'undefined' ||
    typeof (document as unknown as { attributionReporting?: unknown }).attributionReporting !==
      'undefined' ||
    typeof HTMLAnchorElement !== 'undefined' &&
      'attributionSrc' in HTMLAnchorElement.prototype;
  probes.push({
    id: 'attribution_reporting',
    name: 'Attribution Reporting API',
    category: 'ads',
    status: apiOpen(!!hasAttribution),
    severity: 'high',
    detail: hasAttribution
      ? 'Conversion / click attribution APIs available to advertisers.'
      : 'Attribution Reporting not exposed.',
    trackingImpact: 'Links ad click → conversion across sites.',
  });

  const hasPrivateAggregation = typeof w.privateAggregation !== 'undefined';
  probes.push({
    id: 'private_aggregation',
    name: 'Private Aggregation API',
    category: 'ads',
    status: apiOpen(hasPrivateAggregation),
    severity: 'medium',
    detail: hasPrivateAggregation
      ? 'Private Aggregation present (Privacy Sandbox measurement).'
      : 'Private Aggregation not present.',
    trackingImpact: 'Aggregate cross-site measurement for ads.',
  });

  const hasFencedFrame =
    typeof w.FencedFrameConfig !== 'undefined' ||
    (typeof customElements !== 'undefined' && !!customElements.get('fencedframe')) ||
    'HTMLFencedFrameElement' in w;
  probes.push({
    id: 'fenced_frames',
    name: 'Fenced Frames',
    category: 'ads',
    status: apiOpen(hasFencedFrame),
    severity: 'medium',
    detail: hasFencedFrame
      ? 'Fenced frames supported — used with Protected Audience creatives.'
      : 'Fenced frames not detected.',
    trackingImpact: 'Isolated ad frames that still participate in auctions.',
  });

  // --- Identity / fingerprint harvest (always relevant) ---
  const hasUAData = typeof n.userAgentData !== 'undefined';
  let highEntropyOpen = false;
  if (hasUAData) {
    const uad = n.userAgentData as { getHighEntropyValues?: (h: string[]) => Promise<unknown> };
    highEntropyOpen = typeof uad.getHighEntropyValues === 'function';
  }
  probes.push({
    id: 'client_hints_he',
    name: 'Client Hints (high-entropy)',
    category: 'identity',
    status: apiOpen(highEntropyOpen),
    severity: 'high',
    detail: highEntropyOpen
      ? 'getHighEntropyValues available — model, platform version, architecture can leak.'
      : 'High-entropy Client Hints not available (Firefox/Safari-like).',
    trackingImpact: 'Stable device/OS identity for ad graphs.',
  });

  const hasWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  })();
  probes.push({
    id: 'webgl_unmasked',
    name: 'WebGL GPU unmasked',
    category: 'fingerprint',
    status: apiOpen(hasWebGL),
    severity: 'critical',
    detail: hasWebGL
      ? 'WebGL available — UNMASKED_RENDERER typically exposes GPU model.'
      : 'WebGL blocked — large fingerprint reduction.',
    trackingImpact: 'One of the strongest hardware identifiers.',
  });

  const hasCanvas = (() => {
    try {
      return !!document.createElement('canvas').getContext('2d');
    } catch {
      return false;
    }
  })();
  probes.push({
    id: 'canvas_2d',
    name: 'Canvas 2D fingerprint',
    category: 'fingerprint',
    status: apiOpen(hasCanvas),
    severity: 'high',
    detail: hasCanvas ? 'Canvas 2D open for toDataURL / getImageData hashing.' : 'Canvas blocked.',
    trackingImpact: 'Classic cross-site browser fingerprint.',
  });

  const hasAudio = typeof w.OfflineAudioContext !== 'undefined' || typeof w.webkitOfflineAudioContext !== 'undefined';
  probes.push({
    id: 'audio_context',
    name: 'OfflineAudioContext',
    category: 'fingerprint',
    status: apiOpen(hasAudio),
    severity: 'high',
    detail: hasAudio ? 'Audio stack fingerprinting possible.' : 'AudioContext blocked.',
    trackingImpact: 'Stable secondary device hash.',
  });

  // WebRTC
  const hasRTC =
    typeof w.RTCPeerConnection !== 'undefined' || typeof w.webkitRTCPeerConnection !== 'undefined';
  probes.push({
    id: 'webrtc',
    name: 'WebRTC (IP candidates)',
    category: 'network',
    status: apiOpen(hasRTC),
    severity: 'critical',
    detail: hasRTC
      ? 'RTCPeerConnection available — can leak local/public IPs via ICE.'
      : 'WebRTC unavailable / disabled.',
    trackingImpact: 'Bypasses VPN poorly configured; links sessions to IP.',
  });

  // Storage Access / third-party cookies era
  const hasStorageAccess = typeof d.hasStorageAccess === 'function' || typeof d.requestStorageAccess === 'function';
  probes.push({
    id: 'storage_access_api',
    name: 'Storage Access API',
    category: 'cross_site',
    status: apiOpen(hasStorageAccess),
    severity: 'medium',
    detail: hasStorageAccess
      ? 'Site can request cross-site cookie access (embedded contexts).'
      : 'Storage Access API not present.',
    trackingImpact: 'Controlled third-party cookie access after prompt.',
  });

  // Cookie deprecation label (Chrome 3PCD)
  const hasCookieDeprecation = typeof n.cookieDeprecationLabel !== 'undefined';
  probes.push({
    id: 'cookie_deprecation_label',
    name: 'Cookie Deprecation Label',
    category: 'ads',
    status: apiOpen(hasCookieDeprecation),
    severity: 'low',
    detail: hasCookieDeprecation
      ? 'Chrome 3PCD labeling API present.'
      : 'No cookie deprecation label API.',
    trackingImpact: 'Signals third-party cookie phase-out mode to sites.',
  });

  // Interest cohort leftover
  const hasFloc =
    typeof (doc() as { interestCohort?: unknown }).interestCohort === 'function' ||
    typeof (n as { interestCohort?: unknown }).interestCohort === 'function';
  probes.push({
    id: 'floc_legacy',
    name: 'FLoC / interestCohort (legacy)',
    category: 'ads',
    status: apiOpen(hasFloc),
    severity: 'medium',
    detail: hasFloc ? 'Legacy interestCohort still present.' : 'FLoC removed (expected).',
    trackingImpact: 'Old cohort API; should be gone in modern browsers.',
  });

  // Battery — soft ID
  const hasBattery = typeof n.getBattery === 'function';
  probes.push({
    id: 'battery_api',
    name: 'Battery Status API',
    category: 'fingerprint',
    status: apiOpen(hasBattery),
    severity: 'low',
    detail: hasBattery ? 'Battery API still callable (short-lived ID).' : 'Battery API blocked.',
    trackingImpact: 'Weak session correlator on some platforms.',
  });

  // Network Information
  const hasConnection = typeof n.connection !== 'undefined';
  probes.push({
    id: 'network_information',
    name: 'Network Information API',
    category: 'fingerprint',
    status: apiOpen(hasConnection),
    severity: 'low',
    detail: hasConnection
      ? 'effectiveType/downlink/rtt exposed — weak environment signal.'
      : 'Network Information not exposed.',
    trackingImpact: 'Helps segment users (4G vs Wi‑Fi).',
  });

  // Keyboard / HID (rare but Chrome-y)
  probes.push({
    id: 'hid_usb',
    name: 'WebHID / WebUSB',
    category: 'identity',
    status: apiOpen(typeof n.hid !== 'undefined' || typeof n.usb !== 'undefined'),
    severity: 'medium',
    detail:
      typeof n.hid !== 'undefined' || typeof n.usb !== 'undefined'
        ? 'Device APIs present (permissioned) — can fingerprint peripherals when granted.'
        : 'WebHID/WebUSB not present.',
    trackingImpact: 'Strong identity if user grants device access.',
  });

  // Sensors
  probes.push({
    id: 'generic_sensors',
    name: 'Generic Sensor APIs',
    category: 'fingerprint',
    status: apiOpen(
      'Accelerometer' in w || 'Gyroscope' in w || 'DeviceMotionEvent' in w
    ),
    severity: 'medium',
    detail:
      'Accelerometer' in w || 'Gyroscope' in w || 'DeviceMotionEvent' in w
        ? 'Motion/orientation sensors available (esp. mobile).'
        : 'Sensor APIs not detected.',
    trackingImpact: 'Mobile re-identification & bot checks.',
  });

  // Performance timing buffer (resource tracking)
  const hasResourceTiming =
    typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function';
  probes.push({
    id: 'resource_timing',
    name: 'Resource Timing (third-party visibility)',
    category: 'network',
    status: apiOpen(hasResourceTiming),
    severity: 'medium',
    detail: hasResourceTiming
      ? 'Page can observe loaded third-party resource timings.'
      : 'Resource Timing unavailable.',
    trackingImpact: 'Helps detect ad/tracker load success and user environment.',
  });

  // third-party cookie heuristic via partitioned cookie support
  probes.push({
    id: 'cookie_store',
    name: 'Cookie Store API',
    category: 'cross_site',
    status: apiOpen(typeof w.cookieStore !== 'undefined'),
    severity: 'low',
    detail:
      typeof w.cookieStore !== 'undefined'
        ? 'Async Cookie Store API available.'
        : 'Cookie Store API not present.',
    trackingImpact: 'Easier cookie management for advanced trackers.',
  });

  return probes;
}

/**
 * Lightweight network probes — detect ad-blocker / tracker blocking.
 * Runs only on user-initiated scan; uses short timeouts.
 */
export async function probeTrackerNetworkBlocks(): Promise<NetworkBlockProbe[]> {
  const targets: { id: string; url: string; label: string; method: 'script' | 'image' | 'fetch' }[] =
    [
      {
        id: 'ga',
        url: 'https://www.google-analytics.com/analytics.js',
        label: 'Google Analytics',
        method: 'script',
      },
      {
        id: 'gtm',
        url: 'https://www.googletagmanager.com/gtag/js?id=G-TEST',
        label: 'Google Tag Manager',
        method: 'script',
      },
      {
        id: 'doubleclick',
        url: 'https://stats.g.doubleclick.net/dc.js',
        label: 'DoubleClick',
        method: 'script',
      },
      {
        id: 'facebook_pixel',
        url: 'https://connect.facebook.net/en_US/fbevents.js',
        label: 'Meta Pixel',
        method: 'script',
      },
      {
        id: 'hotjar',
        url: 'https://static.hotjar.com/c/hotjar-0.js',
        label: 'Hotjar',
        method: 'script',
      },
    ];

  const results: NetworkBlockProbe[] = [];

  await Promise.all(
    targets.map(async (t) => {
      const start = performance.now();
      const blocked = await probeScriptBlocked(t.url, 2500);
      results.push({
        id: t.id,
        url: t.url,
        label: t.label,
        blocked,
        latencyMs: blocked ? null : Math.round(performance.now() - start),
        method: t.method,
      });
    })
  );

  return results;
}

function probeScriptBlocked(url: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.async = true;
    s.src = url;
    let done = false;
    const finish = (blocked: boolean) => {
      if (done) return;
      done = true;
      s.remove();
      resolve(blocked);
    };
    const timer = window.setTimeout(() => finish(true), timeoutMs);
    s.onload = () => {
      window.clearTimeout(timer);
      // Loaded into page — not blocked (script may still no-op)
      finish(false);
    };
    s.onerror = () => {
      window.clearTimeout(timer);
      finish(true);
    };
    try {
      document.head.appendChild(s);
    } catch {
      window.clearTimeout(timer);
      finish(true);
    }
  });
}

async function estimateThirdPartyCookiesBlocked(): Promise<boolean | null> {
  // Best-effort without external origin: Storage Access API + Chrome 3PCD signals
  try {
    if (typeof document !== 'undefined' && 'hasStorageAccess' in document) {
      // Presence alone doesn't mean blocked; try cookieStore partitioned if any
      const n = nav();
      if (typeof n.cookieDeprecationLabel === 'object' || typeof n.cookieDeprecationLabel === 'function') {
        return true; // in deprecation path
      }
    }
    // Safari ITP / Firefox ETP often block 3p by default — infer from browser family
    if (isSafari()) return true;
    if (isFirefox()) {
      // Firefox ETP standard blocks trackers; cookies still partial
      return true;
    }
    // brave handled by caller
    if (isChromeFamily(false)) return false;
    return null;
  } catch {
    return null;
  }
}

function classifyBrowser(
  rfpLike: boolean,
  brave: boolean
): TrackingPostureReport['browserProfile'] {
  if (brave) return 'brave';
  if (rfpLike || /tor/i.test(String(nav().userAgent || ''))) return 'tor_like';
  if (isFirefox()) return 'firefox_strict';
  if (isSafari()) return 'safari_itp';
  if (isEdge()) return 'edge';
  if (isChromeFamily(brave)) return 'stock_chrome';
  return 'other';
}

function scoreFromProbes(
  probes: AdApiProbe[],
  network: NetworkBlockProbe[],
  privacy: TrackingPostureReport['privacySignals']
): { trackingSurfaceScore: number; protectionScore: number; protectionLevel: ProtectionLevel } {
  let surface = 0;
  let maxSurface = 0;

  for (const p of probes) {
    if (p.category === 'privacy_signal') continue;
    const w =
      p.severity === 'critical' ? 14 :
      p.severity === 'high' ? 10 :
      p.severity === 'medium' ? 6 : 3;
    maxSurface += w;
    if (p.status === 'open') surface += w;
    else if (p.status === 'restricted') surface += w * 0.4;
  }

  // Network: if trackers load freely, increase surface; if blocked, increase protection
  const loaded = network.filter((n) => !n.blocked).length;
  const blocked = network.filter((n) => n.blocked).length;
  surface += loaded * 4;
  maxSurface += network.length * 4;

  let trackingSurfaceScore = maxSurface > 0 ? Math.round((surface / maxSurface) * 100) : 50;
  trackingSurfaceScore = Math.max(0, Math.min(100, trackingSurfaceScore));

  // Protection score inverse + bonuses
  let protectionScore = 100 - trackingSurfaceScore;
  if (privacy.gpc === true) protectionScore += 8;
  if (privacy.brave) protectionScore += 12;
  if (privacy.rfpLike) protectionScore += 18;
  if (privacy.thirdPartyCookiesLikelyBlocked) protectionScore += 10;
  if (blocked >= 3) protectionScore += 15;
  if (blocked >= 5) protectionScore += 8;
  if (loaded >= 4) protectionScore -= 12;
  protectionScore = Math.max(0, Math.min(100, Math.round(protectionScore)));

  let protectionLevel: ProtectionLevel;
  if (protectionScore >= 80) protectionLevel = 'maximum';
  else if (protectionScore >= 65) protectionLevel = 'strict';
  else if (protectionScore >= 45) protectionLevel = 'standard';
  else if (protectionScore >= 25) protectionLevel = 'basic';
  else protectionLevel = 'none';

  return { trackingSurfaceScore, protectionScore, protectionLevel };
}

function buildSummary(report: Omit<TrackingPostureReport, 'summary' | 'recommendations' | 'vsStockChrome'>): {
  summary: string;
  recommendations: string[];
  vsStockChrome: string;
} {
  const openAds = report.adApis.filter(
    (a) => a.status === 'open' && (a.category === 'ads' || a.category === 'cross_site')
  );
  const openFp = report.adApis.filter((a) => a.status === 'open' && a.category === 'fingerprint');

  let summary = '';
  if (report.browserProfile === 'stock_chrome' && report.protectionLevel === 'none') {
    summary =
      'Stock Chromium profile with a wide open ad & fingerprint surface. High-entropy Client Hints, WebGL, and Privacy Sandbox ad APIs make deep tracking easy even without extensions.';
  } else if (report.protectionLevel === 'maximum' || report.protectionLevel === 'strict') {
    summary =
      'Hardened environment: many ad/identity APIs are missing or tracker scripts are blocked. This should score very differently from a clean Chrome install.';
  } else if (report.blockedNetworkCount >= 3) {
    summary =
      'Partial protection: ad/tracker network endpoints are blocked (extension or built-in ETP), but browser fingerprint APIs may still be open.';
  } else {
    summary = `Protection level: ${report.protectionLevel}. Tracking surface ${report.trackingSurfaceScore}/100 with ${openAds.length} open ad/cross-site APIs and ${openFp.length} open fingerprint APIs.`;
  }

  const recommendations: string[] = [];
  if (report.trackingSurfaceScore >= 60) {
    recommendations.push(
      'Switch to Firefox (strict ETP), Brave, or Mullvad Browser — stock Chrome exposes the largest ad-tech surface.'
    );
  }
  if (report.adApis.find((a) => a.id === 'topics_api' && a.status === 'open')) {
    recommendations.push('Disable Privacy Sandbox / ad topics in chrome://settings/adPrivacy if available.');
  }
  if (report.adApis.find((a) => a.id === 'webrtc' && a.status === 'open')) {
    recommendations.push('Enable WebRTC leak protection in VPN or browser settings.');
  }
  if (report.blockedNetworkCount === 0 && report.networkProbes.length > 0) {
    recommendations.push(
      'No major tracker scripts were blocked — install uBlock Origin (or use Brave shields / Firefox ETP strict).'
    );
  }
  if (report.privacySignals.gpc !== true) {
    recommendations.push('Enable Global Privacy Control where supported (Firefox / Brave / extension).');
  }
  if (report.adApis.find((a) => a.id === 'webgl_unmasked' && a.status === 'open')) {
    recommendations.push('WebGL GPU is visible — strongest hardware ID; privacy browsers reduce or spoof it.');
  }
  recommendations.push('Fingerprint uniqueness alone is not privacy: Chrome can look “common” yet still overshare to ads.');

  let vsStockChrome = '';
  if (report.browserProfile === 'stock_chrome' && report.protectionScore < 40) {
    vsStockChrome =
      'Matches a typical clean Chrome: ad APIs + fingerprint APIs open, few network blocks. This is the high-harvest baseline.';
  } else if (report.protectionScore >= 65) {
    vsStockChrome =
      'Clearly safer than stock Chrome: lower tracking surface and/or tracker scripts blocked. If results still look identical to Chrome, re-scan after hard-refresh.';
  } else {
    vsStockChrome =
      'Between stock Chrome and full lockdown — some protections active, but deep fingerprint or ad APIs remain.';
  }

  return { summary, recommendations: recommendations.slice(0, 7), vsStockChrome };
}

/**
 * Full tracking posture analysis (async for network probes).
 */
export async function analyzeTrackingPosture(options?: {
  runNetworkProbes?: boolean;
}): Promise<TrackingPostureReport> {
  const runNet = options?.runNetworkProbes !== false;
  const adApis = probeAdApis();
  const networkProbes = runNet ? await probeTrackerNetworkBlocks() : [];
  const brave = await detectBrave();
  const rfpLike = detectRfpLike();
  let thirdPartyCookiesLikelyBlocked = await estimateThirdPartyCookiesBlocked();
  if (brave) thirdPartyCookiesLikelyBlocked = true;
  if (isChromeFamily(brave) && thirdPartyCookiesLikelyBlocked === false) {
    /* stock chrome baseline */
  }

  const privacySignals = {
    gpc: typeof nav().globalPrivacyControl === 'boolean' ? Boolean(nav().globalPrivacyControl) : null,
    dnt: nav().doNotTrack != null ? String(nav().doNotTrack) : null,
    cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
    thirdPartyCookiesLikelyBlocked,
    storageAccessApi: typeof document !== 'undefined' && 'hasStorageAccess' in document,
    brave,
    rfpLike,
  };

  // If Brave, mark some ad APIs as restricted even if present
  if (brave) {
    for (const p of adApis) {
      if (['topics_api', 'protected_audience', 'shared_storage'].includes(p.id) && p.status === 'open') {
        p.status = 'restricted';
        p.detail += ' (Brave may block or farble in practice.)';
      }
    }
  }

  const { trackingSurfaceScore, protectionScore, protectionLevel } = scoreFromProbes(
    adApis,
    networkProbes,
    privacySignals
  );

  const openCriticalCount = adApis.filter(
    (a) => a.status === 'open' && a.severity === 'critical' && a.category !== 'privacy_signal'
  ).length;
  const blockedNetworkCount = networkProbes.filter((n) => n.blocked).length;
  const browserProfile = classifyBrowser(rfpLike, brave);

  const partial = {
    trackingSurfaceScore,
    protectionScore,
    protectionLevel,
    browserProfile,
    adApis,
    openCriticalCount,
    blockedNetworkCount,
    networkProbes,
    privacySignals,
  };

  const { summary, recommendations, vsStockChrome } = buildSummary(partial);

  return {
    ...partial,
    summary,
    recommendations,
    vsStockChrome,
  };
}
