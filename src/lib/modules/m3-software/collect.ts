// ============================================================
// M3 — Software layer: spoof, extensions, protection
// Distinguishes empty Chrome vs hardened browser
// ============================================================

import type { Module2Hardware } from '../types';
import type { Module3Software } from '../types';
import { sampleCanvasStability } from './canvas-stability';
import { collectSurface } from './surface';

function detectBrave(): boolean {
  try {
    const n = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } };
    return Boolean(n.brave);
  } catch {
    return false;
  }
}

function detectSpoof(m2: Module2Hardware): Module3Software['spoofFindings'] {
  const findings: Module3Software['spoofFindings'] = [];
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  const renderer = m2.webgl.renderer.toLowerCase();
  const fontOs = m2.fonts.osGuess;

  // UA OS vs fonts OS
  const uaWin = ua.includes('windows');
  const uaMac = ua.includes('mac');
  const uaLin = ua.includes('linux') && !ua.includes('android');

  if (uaWin && fontOs === 'macos') {
    findings.push({
      id: 'ua_font_os',
      severity: 'critical',
      detail: 'UA claims Windows but font set looks macOS',
    });
  }
  if (uaMac && fontOs === 'windows') {
    findings.push({
      id: 'ua_font_os_mac',
      severity: 'critical',
      detail: 'UA claims macOS but font set looks Windows',
    });
  }
  if (uaLin && fontOs === 'windows') {
    findings.push({
      id: 'ua_font_os_lin',
      severity: 'high',
      detail: 'UA claims Linux but Windows fonts detected',
    });
  }

  // UA vs WebGL
  if (uaMac && renderer && !renderer.includes('apple') && !renderer.includes('intel') && !renderer.includes('amd') && renderer !== 'none') {
    if (renderer.includes('nvidia') || renderer.includes('geforce')) {
      findings.push({
        id: 'ua_gpu_mac_nvidia',
        severity: 'high',
        detail: `macOS UA but GPU renderer: ${m2.webgl.renderer}`,
      });
    }
  }
  if (uaWin && renderer.includes('apple') && renderer.includes('m1')) {
    findings.push({
      id: 'ua_gpu_win_apple',
      severity: 'critical',
      detail: 'Windows UA with Apple GPU string',
    });
  }

  // Client Hints vs UA
  const uad = (navigator as Navigator & {
    userAgentData?: { platform?: string; mobile?: boolean; brands?: { brand: string }[] };
  }).userAgentData;
  if (uad?.platform) {
    const chp = uad.platform.toLowerCase();
    if (chp.includes('windows') && !uaWin) {
      findings.push({
        id: 'ch_ua_platform',
        severity: 'high',
        detail: `Sec-CH platform=${uad.platform} but UA has no Windows`,
      });
    }
    if (chp.includes('mac') && !uaMac) {
      findings.push({
        id: 'ch_ua_mac',
        severity: 'high',
        detail: `Sec-CH platform=${uad.platform} but UA has no Mac`,
      });
    }
  }

  // platform vs UA
  if (uaWin && platform && !platform.includes('win')) {
    findings.push({
      id: 'platform_ua',
      severity: 'high',
      detail: `UA Windows but navigator.platform=${navigator.platform}`,
    });
  }

  return findings;
}

/**
 * Known extensions and a resource each one used to expose.
 *
 * Reality check: Manifest V3 requires `web_accessible_resources` to declare
 * which sites may load them, so most modern extensions correctly refuse
 * these probes. A hit therefore means "old or loosely configured extension",
 * not "extension installed" — the absence of hits proves nothing.
 */
const EXTENSION_PROBES: { id: string; name: string; resource: string }[] = [
  { id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', name: 'uBlock Origin', resource: 'img/icon_16.png' },
  { id: 'gighmmpiobklfepjocnamgkkbiglidom', name: 'AdBlock', resource: 'icons/icon16.png' },
  { id: 'bgnkhhnnamicmpeenaelnjfhikgbkllg', name: 'AdGuard', resource: 'icons/16.png' },
  { id: 'nkbihfbeogaeaoehlefnkodbefgpgknn', name: 'MetaMask', resource: 'images/icon-16.png' },
  { id: 'gcbommkclmclpchllfjekcdonpmejbdp', name: 'HTTPS Everywhere', resource: 'icons/icon16.png' },
];

/**
 * Load a chrome-extension:// resource as an image. Unlike fetch(), this is
 * not blocked by CORS, so a successful decode is a genuine positive.
 */
function probeExtension(id: string, resource: string, timeoutMs = 700): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      if (!/^chrome|^edge/i.test(navigator.userAgent) && !('chrome' in window)) {
        resolve(false);
        return;
      }
      const img = new Image();
      const done = (result: boolean) => {
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        resolve(result);
      };
      const timer = window.setTimeout(() => done(false), timeoutMs);
      img.onload = () => done(img.width > 0);
      img.onerror = () => done(false);
      img.src = `chrome-extension://${id}/${resource}`;
    } catch {
      resolve(false);
    }
  });
}

async function probeExtensions(): Promise<string[]> {
  try {
    const results = await Promise.all(
      EXTENSION_PROBES.map(async (probe) => ({
        name: probe.name,
        hit: await probeExtension(probe.id, probe.resource),
      }))
    );
    return results.filter((r) => r.hit).map((r) => r.name);
  } catch {
    return [];
  }
}

function detectExtensions(): Module3Software['extensions'] {
  const suspiciousGlobals: string[] = [];
  const win = window as unknown as Record<string, unknown>;

  const markers = [
    'ethereum',
    '__VUE_DEVTOOLS_GLOBAL_HOOK__',
    '__REACT_DEVTOOLS_GLOBAL_HOOK__',
    '__REDUX_DEVTOOLS_EXTENSION__',
    'solana',
    'coinbaseWalletExtension',
  ];
  for (const m of markers) {
    if (win[m] != null) suspiciousGlobals.push(m);
  }

  // Adblock bait
  let adsBlockedDom = false;
  try {
    const bait = document.createElement('div');
    bait.className = 'adsbox ad-banner adsbygoogle pub_300x250';
    bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);
    const cs = getComputedStyle(bait);
    adsBlockedDom =
      cs.display === 'none' ||
      cs.visibility === 'hidden' ||
      cs.opacity === '0' ||
      bait.offsetParent === null ||
      bait.offsetHeight === 0;
    bait.remove();
  } catch {
    adsBlockedDom = false;
  }

  return {
    adsBlockedDom,
    ethereum: Boolean(win.ethereum),
    vueDevtools: Boolean(win.__VUE_DEVTOOLS_GLOBAL_HOOK__),
    reactDevtools: Boolean(win.__REACT_DEVTOOLS_GLOBAL_HOOK__),
    suspiciousGlobals,
    // Filled in by collectModule3 via the async probe.
    extensionProbeHits: [],
  };
}

async function detectProtection(m2: Module2Hardware): Promise<Module3Software['protection']> {
  const signals: string[] = [];
  let score = 0;

  const brave = detectBrave();
  if (brave) {
    score += 35;
    signals.push('navigator.brave present');
  }

  const gpc =
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  if (gpc) {
    score += 10;
    signals.push('GPC enabled');
  }

  // Canvas noise (RFP / anti-canvas)
  const rfpCanvasNoise = await sampleCanvasStability();
  if (rfpCanvasNoise) {
    score += 25;
    signals.push('Canvas hash unstable across samples (noise / RFP)');
  }

  // Audio noise: M2 renders the DSP fingerprint twice, so a mismatch means
  // the browser is actively randomizing it rather than the device changing.
  const rfpAudioNoise = m2.audio.randomized === true;
  if (rfpAudioNoise) {
    score += 15;
    signals.push('AudioContext output randomized between renders (Brave / RFP)');
  }

  // Tracker script load test (subset — fast)
  const probes = [
    'https://www.googletagmanager.com/gtag/js?id=G-TEST',
    'https://www.google-analytics.com/analytics.js',
  ];
  let blocked = 0;
  let loaded = 0;
  await Promise.all(
    probes.map(
      (url) =>
        new Promise<void>((resolve) => {
          const s = document.createElement('script');
          s.async = true;
          s.src = url;
          const t = window.setTimeout(() => {
            blocked++;
            s.remove();
            resolve();
          }, 2000);
          s.onload = () => {
            window.clearTimeout(t);
            loaded++;
            s.remove();
            resolve();
          };
          s.onerror = () => {
            window.clearTimeout(t);
            blocked++;
            s.remove();
            resolve();
          };
          document.head.appendChild(s);
        })
    )
  );

  if (blocked > 0) {
    score += blocked * 15;
    signals.push(`${blocked}/${probes.length} tracker scripts blocked`);
  }
  if (loaded === probes.length) {
    signals.push('All probe tracker scripts loaded (no ETP/uBlock effect)');
  }

  // Performance entries for prior third parties
  try {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const trackers = entries.filter((e) =>
      /google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar/i.test(e.name)
    );
    if (trackers.length === 0 && entries.length > 5) {
      // weak signal
    }
  } catch {
    /* ignore */
  }

  // Firefox RFP-ish
  if (/firefox/i.test(navigator.userAgent) && navigator.hardwareConcurrency === 2) {
    score += 8;
    signals.push('Firefox + hardwareConcurrency=2 (possible RFP)');
  }

  score = Math.min(100, score);

  return {
    score,
    brave,
    rfpCanvasNoise,
    rfpAudioNoise,
    gpc,
    trackerScriptsBlocked: blocked,
    trackerScriptsLoaded: loaded,
    signals,
  };
}

export async function collectModule3(m2: Module2Hardware): Promise<Module3Software> {
  const spoofFindings = detectSpoof(m2);
  let spoofScore = 0;
  for (const f of spoofFindings) {
    if (f.severity === 'critical') spoofScore += 35;
    else if (f.severity === 'high') spoofScore += 22;
    else spoofScore += 10;
  }
  spoofScore = Math.min(100, spoofScore);

  const extensions = detectExtensions();

  // Run the slow probes together instead of serially.
  const [protection, extensionProbeHits, surface] = await Promise.all([
    detectProtection(m2),
    probeExtensions(),
    collectSurface(),
  ]);
  extensions.extensionProbeHits = extensionProbeHits;

  if (extensions.adsBlockedDom) {
    protection.score = Math.min(100, protection.score + 12);
    protection.signals.push('DOM ad-bait hidden (adblocker)');
  }
  if (extensionProbeHits.length) {
    protection.signals.push(`Extension resources readable: ${extensionProbeHits.join(', ')}`);
  }

  return {
    spoofFindings,
    spoofScore,
    extensions,
    protection,
    surface,
  };
}
