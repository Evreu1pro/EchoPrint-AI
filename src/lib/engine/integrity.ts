// ============================================================
// EchoPrint AI v2 — Integrity & Spoof Detection
// Multi-sample stability, descriptor checks, cross-API drift
// ============================================================

import type { FingerprintData } from '../types';
import { fnv1aHash, safeSync } from '../utils/helpers';

export type IntegritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface IntegrityFinding {
  id: string;
  category:
    | 'canvas_noise'
    | 'webgl_drift'
    | 'audio_noise'
    | 'prototype_tamper'
    | 'property_spoof'
    | 'api_block'
    | 'cross_signal'
    | 'headless'
    | 'privacy_tool';
  severity: IntegritySeverity;
  title: string;
  detail: string;
  evidence: string[];
  confidence: number; // 0-100
}

export interface IntegrityReport {
  score: number; // 0-100, higher = more native / less tampered
  findings: IntegrityFinding[];
  canvasStable: boolean;
  canvasSamples: string[];
  audioStable: boolean;
  spoofProbability: number;
  privacyToolProbability: number;
  summary: string;
}

function sampleCanvasHash(): string {
  return safeSync(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 'no_ctx';

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 280, 60);
    ctx.fillStyle = '#1a73e8';
    ctx.font = '16px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText('EchoIntegrity Σ 🔥 12.34', 4, 8);
    ctx.fillStyle = 'rgba(255, 0, 128, 0.55)';
    ctx.beginPath();
    ctx.arc(200, 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00aa66';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(10.5, 28.5, 90, 22);

    const data = ctx.getImageData(0, 0, 280, 60).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 17) sum = (sum + data[i]) >>> 0;
    return fnv1aHash(`${canvas.toDataURL()}|${sum}`);
  }, 'error');
}

async function sampleAudioHash(): Promise<string> {
  try {
    const OfflineCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!OfflineCtx) return 'unsupported';

    const ctx = new OfflineCtx(1, 44100, 44100);
    const osc = ctx.createOscillator();
    const comp = ctx.createDynamicsCompressor();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    comp.threshold.value = -50;
    comp.knee.value = 40;
    comp.ratio.value = 12;
    comp.attack.value = 0;
    comp.release.value = 0.25;
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);

    const buffer = await ctx.startRendering();
    const channel = buffer.getChannelData(0);
    let hash = 0;
    for (let i = 4500; i < 5000; i++) {
      hash = (hash + Math.floor(Math.abs(channel[i]) * 1e9)) >>> 0;
    }
    return hash.toString(16);
  } catch {
    return 'error';
  }
}

function checkNavigatorTamper(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  if (typeof navigator === 'undefined') return findings;

  const props = [
    'userAgent',
    'platform',
    'languages',
    'hardwareConcurrency',
    'deviceMemory',
    'webdriver',
    'maxTouchPoints',
    'vendor',
    'language',
  ] as const;

  const spoofed: string[] = [];
  for (const prop of props) {
    try {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, prop)
        ?? Object.getOwnPropertyDescriptor(navigator, prop);
      if (!desc) continue;
      // Native getters usually have native code in toString
      if (desc.get) {
        const src = Function.prototype.toString.call(desc.get);
        if (!src.includes('[native code]') && !src.includes('[Native Code]')) {
          spoofed.push(`${prop}: non-native getter`);
        }
      }
    } catch {
      spoofed.push(`${prop}: descriptor inaccessible`);
    }
  }

  // navigator.webdriver should not be configurable in stock Chrome
  try {
    const wd = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
    if (wd && wd.configurable === true && navigator.webdriver === false) {
      spoofed.push('webdriver descriptor is configurable (often spoofed to false)');
    }
  } catch {
    /* ignore */
  }

  if (spoofed.length > 0) {
    findings.push({
      id: 'nav_prototype_tamper',
      category: 'prototype_tamper',
      severity: spoofed.length >= 3 ? 'high' : 'medium',
      title: 'Navigator property tampering',
      detail: 'One or more navigator properties have non-native getters — typical of spoofing extensions or anti-detect browsers.',
      evidence: spoofed,
      confidence: Math.min(95, 40 + spoofed.length * 12),
    });
  }

  return findings;
}

function checkScreenChromeWindow(data: FingerprintData): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  if (typeof window === 'undefined') return findings;

  const { width, height, availWidth, availHeight } = data.hardware.screen;
  const outerW = window.outerWidth;
  const outerH = window.outerHeight;
  const evidence: string[] = [];

  if (outerW > width + 200 || outerH > height + 200) {
    evidence.push(`outer (${outerW}x${outerH}) exceeds screen (${width}x${height})`);
  }
  if (availWidth > width || availHeight > height) {
    evidence.push(`avail size larger than screen`);
  }
  // Headless / automation often reports 0 chrome
  if (outerW === 0 || outerH === 0) {
    evidence.push('window.outerWidth/Height is 0');
  }

  if (evidence.length) {
    findings.push({
      id: 'window_screen_mismatch',
      category: 'cross_signal',
      severity: 'medium',
      title: 'Window / screen geometry mismatch',
      detail: 'Window chrome dimensions disagree with reported screen — common in automation or spoofed environments.',
      evidence,
      confidence: 70,
    });
  }

  return findings;
}

function checkClientHintsVsUA(data: FingerprintData): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const uad = data.navigator.userAgentData;
  if (!uad) return findings;

  const evidence: string[] = [];
  const ua = data.navigator.userAgent.toLowerCase();
  const chPlatform = (uad.platform || '').toLowerCase();

  if (chPlatform.includes('windows') && !ua.includes('windows')) {
    evidence.push(`CH platform=${uad.platform} but UA has no Windows`);
  }
  if (chPlatform.includes('mac') && !ua.includes('mac')) {
    evidence.push(`CH platform=${uad.platform} but UA has no Mac`);
  }
  if (chPlatform.includes('linux') && !ua.includes('linux') && !ua.includes('android')) {
    evidence.push(`CH platform=${uad.platform} but UA has no Linux`);
  }
  if (uad.mobile && data.parsedUA.device.type === 'desktop') {
    evidence.push('CH mobile=true but UA parsed as desktop');
  }
  if (!uad.mobile && (data.parsedUA.device.type === 'mobile' || data.parsedUA.device.type === 'tablet')) {
    evidence.push('CH mobile=false but UA parsed as mobile/tablet');
  }

  const brands = (uad.brands || []).map((b) => b.brand.toLowerCase()).join(' ');
  if (brands.includes('chrome') && !ua.includes('chrome') && !ua.includes('crios')) {
    evidence.push('CH brands include Chrome but UA does not');
  }

  if (evidence.length) {
    findings.push({
      id: 'client_hints_ua_drift',
      category: 'cross_signal',
      severity: 'high',
      title: 'Client Hints vs User-Agent drift',
      detail: 'Sec-CH-UA / high-entropy hints disagree with navigator.userAgent — strong spoof signal.',
      evidence,
      confidence: Math.min(92, 55 + evidence.length * 12),
    });
  }

  return findings;
}

function checkTimezoneLocale(data: FingerprintData): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const evidence: string[] = [];

  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    if (resolved.timeZone && data.misc.timezone && resolved.timeZone !== data.misc.timezone) {
      evidence.push(`Intl TZ=${resolved.timeZone} vs collected=${data.misc.timezone}`);
    }

    // Offset sanity: rebuild expected offset for timezone when possible
    const now = new Date();
    const offsetMin = -now.getTimezoneOffset();
    if (Math.abs(offsetMin - (-data.misc.timezoneOffset)) > 0 && data.misc.timezoneOffset !== now.getTimezoneOffset()) {
      // timezoneOffset in data is usually Date#getTimezoneOffset
      evidence.push(`timezoneOffset snapshot mismatch: live=${now.getTimezoneOffset()} stored=${data.misc.timezoneOffset}`);
    }

    // Language vs locale
    const lang = data.navigator.language || '';
    if (resolved.locale && lang && !resolved.locale.toLowerCase().startsWith(lang.split('-')[0].toLowerCase())) {
      // Soft signal only
      if (Math.random() < 0) {
        /* keep deterministic */
      }
      // Flag only hard conflicts: e.g. ar-* language with en-US locale strongly set
      const langPrimary = lang.split('-')[0].toLowerCase();
      const localePrimary = resolved.locale.split('-')[0].toLowerCase();
      if (langPrimary !== localePrimary && langPrimary.length === 2) {
        evidence.push(`navigator.language=${lang} vs Intl.locale=${resolved.locale}`);
      }
    }
  } catch {
    /* ignore */
  }

  if (evidence.length) {
    findings.push({
      id: 'timezone_locale_drift',
      category: 'cross_signal',
      severity: 'medium',
      title: 'Timezone / locale inconsistency',
      detail: 'Timezone or locale APIs disagree — VPN + spoof, or manual override.',
      evidence,
      confidence: 65,
    });
  }

  return findings;
}

function checkPrivacyTools(data: FingerprintData): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const evidence: string[] = [];

  // Resist Fingerprinting style: rounded times, generic values
  const cores = data.hardware.cpuCores;
  const mem = data.hardware.memory;
  if (cores === 2 && mem === 2 && data.hardware.screen.colorDepth === 24) {
    evidence.push('Low generic hardware values (cores=2, mem=2) typical of RFP / Tor');
  }

  // Empty plugins on Chrome used to be headless; now normal. Check PDF.
  if (!data.misc.pdfViewerEnabled && data.parsedUA.browser.name === 'Chrome') {
    evidence.push('pdfViewerEnabled=false on Chrome');
  }

  // Canvas blocked
  if (!data.canvas.supported) {
    evidence.push('Canvas 2D unavailable / blocked');
  }

  // WebRTC fully blocked
  if (!data.webrtc.enabled) {
    evidence.push('WebRTC disabled');
  }

  if (evidence.length >= 2) {
    findings.push({
      id: 'privacy_hardening',
      category: 'privacy_tool',
      severity: 'info',
      title: 'Privacy hardening signals',
      detail: 'Browser looks hardened (RFP, Tor, strict extensions). Good for privacy; may look anomalous to trackers.',
      evidence,
      confidence: Math.min(85, 30 + evidence.length * 15),
    });
  }

  return findings;
}

function checkAutomationExtras(data: FingerprintData): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  if (typeof window === 'undefined') return findings;
  const evidence: string[] = [];

  if (data.navigator.webdriver) evidence.push('navigator.webdriver=true');

  const win = window as unknown as Record<string, unknown>;
  const markers = [
    '__webdriver_evaluate',
    '__selenium_evaluate',
    '__webdriver_script_function',
    '__webdriver_script_func',
    '__webdriver_script_fn',
    '__fxdriver_evaluate',
    '__driver_unwrapped',
    '__webdriver_unwrapped',
    '__driver_evaluate',
    '__selenium_unwrapped',
    '__fxdriver_unwrapped',
    '_Selenium_IDE_Recorder',
    '_selenium',
    'calledSelenium',
    '$cdc_asdjflasutopfhvcZLmcfl_',
    '$chrome_asyncScriptInfo',
    '__nightmare',
    '_phantom',
    'callPhantom',
    'domAutomation',
    'domAutomationController',
  ];

  for (const m of markers) {
    if (m in win && win[m] != null) evidence.push(`window.${m}`);
  }

  // ChromeDriver cdc_ prefix vars
  try {
    for (const key of Object.getOwnPropertyNames(window)) {
      if (key.match(/^cdc_|^\$cdc_|wdc_/i)) {
        evidence.push(`window.${key}`);
        if (evidence.length > 12) break;
      }
    }
  } catch {
    /* ignore */
  }

  // Permissions query vs Notification mismatch is soft; skip for noise

  // Chrome without chrome.runtime on extension pages is ok; missing window.chrome on Chrome UA is strong
  const ua = data.navigator.userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg') && !('chrome' in window)) {
    evidence.push('Chrome UA without window.chrome');
  }

  if (evidence.length) {
    findings.push({
      id: 'automation_markers',
      category: 'headless',
      severity: evidence.some((e) => e.includes('webdriver')) ? 'critical' : 'high',
      title: 'Automation / headless markers',
      detail: 'Environment exposes bot or WebDriver artifacts.',
      evidence,
      confidence: Math.min(98, 50 + evidence.length * 10),
    });
  }

  return findings;
}

function checkGpuOsConsistency(data: FingerprintData): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const renderer = (data.webgl.renderer || '').toLowerCase();
  const vendor = (data.webgl.vendor || '').toLowerCase();
  const os = data.parsedUA.os.name.toLowerCase();
  const evidence: string[] = [];

  if (!data.webgl.supported) return findings;

  if (os.includes('mac') || os.includes('ios')) {
    if (
      renderer &&
      !renderer.includes('apple') &&
      !renderer.includes('intel') &&
      !renderer.includes('amd') &&
      !renderer.includes('radeon') &&
      !renderer.includes('angle') &&
      renderer !== 'unknown'
    ) {
      evidence.push(`macOS/iOS with unexpected GPU: ${data.webgl.renderer}`);
    }
  }

  if (os.includes('windows')) {
    if (renderer.includes('apple') && renderer.includes('m1')) {
      evidence.push('Windows UA with Apple M-series GPU string');
    }
  }

  // Software renderers
  const soft = ['llvmpipe', 'swiftshader', 'softpipe', 'microsoft basic render', 'gdi generic'];
  for (const s of soft) {
    if (renderer.includes(s) || vendor.includes(s)) {
      evidence.push(`Software renderer: ${s}`);
    }
  }

  if (evidence.length) {
    findings.push({
      id: 'gpu_os_mismatch',
      category: 'cross_signal',
      severity: 'high',
      title: 'GPU / OS inconsistency',
      detail: 'WebGL renderer does not match the claimed operating system or looks virtualized.',
      evidence,
      confidence: 80,
    });
  }

  return findings;
}

/**
 * Run multi-sample integrity analysis against collected fingerprint.
 */
export async function analyzeIntegrity(data: FingerprintData): Promise<IntegrityReport> {
  const findings: IntegrityFinding[] = [];

  // Multi-sample canvas (5 runs, micro-delay)
  const canvasSamples: string[] = [];
  for (let i = 0; i < 5; i++) {
    canvasSamples.push(sampleCanvasHash());
    await new Promise((r) => setTimeout(r, 16));
  }
  const uniqueCanvas = new Set(canvasSamples.filter((h) => h !== 'error'));
  const canvasStable = uniqueCanvas.size <= 1;
  if (!canvasStable && uniqueCanvas.size > 1) {
    findings.push({
      id: 'canvas_noise_injection',
      category: 'canvas_noise',
      severity: 'high',
      title: 'Canvas noise / randomization',
      detail: 'Identical canvas draws produced different hashes across samples — fingerprint noise injection or anti-detect layer.',
      evidence: [
        `uniqueHashes=${uniqueCanvas.size}/5`,
        ...Array.from(uniqueCanvas).slice(0, 4).map((h, i) => `sample${i}=${h.slice(0, 12)}…`),
      ],
      confidence: Math.min(96, 50 + uniqueCanvas.size * 10),
    });
  }

  // Multi-sample audio
  const audioSamples: string[] = [];
  for (let i = 0; i < 3; i++) {
    audioSamples.push(await sampleAudioHash());
  }
  const uniqueAudio = new Set(audioSamples.filter((h) => h !== 'error' && h !== 'unsupported'));
  const audioStable = uniqueAudio.size <= 1;
  if (!audioStable && uniqueAudio.size > 1) {
    findings.push({
      id: 'audio_noise_injection',
      category: 'audio_noise',
      severity: 'medium',
      title: 'AudioContext noise / randomization',
      detail: 'OfflineAudioContext samples diverge — audio fingerprint spoofing.',
      evidence: [`uniqueHashes=${uniqueAudio.size}/3`, ...Array.from(uniqueAudio).map((h) => h.slice(0, 12))],
      confidence: 75,
    });
  }

  // Compare collected canvas hashes with fresh sample
  if (data.canvas.supported && canvasSamples[0] && data.canvas.textHash) {
    // Not expected to match textHash (different draw), but collected hashes should be non-trivial
    if (data.canvas.textHash === data.canvas.geometryHash && data.canvas.textHash === data.canvas.emojiHash) {
      findings.push({
        id: 'canvas_collapsed_hashes',
        category: 'canvas_noise',
        severity: 'medium',
        title: 'Collapsed canvas channel hashes',
        detail: 'Text/geometry/emoji canvas hashes are identical — often a blocker returning empty canvas.',
        evidence: [`hash=${data.canvas.textHash}`],
        confidence: 70,
      });
    }
  }

  findings.push(
    ...checkNavigatorTamper(),
    ...checkScreenChromeWindow(data),
    ...checkClientHintsVsUA(data),
    ...checkTimezoneLocale(data),
    ...checkPrivacyTools(data),
    ...checkAutomationExtras(data),
    ...checkGpuOsConsistency(data)
  );

  // Score: start 100, subtract by severity
  let score = 100;
  let spoofWeight = 0;
  let privacyWeight = 0;

  for (const f of findings) {
    const pen =
      f.severity === 'critical' ? 25 :
      f.severity === 'high' ? 16 :
      f.severity === 'medium' ? 10 :
      f.severity === 'low' ? 5 : 2;
    score -= pen * (f.confidence / 100);

    if (['canvas_noise', 'webgl_drift', 'audio_noise', 'prototype_tamper', 'property_spoof', 'cross_signal', 'headless'].includes(f.category)) {
      spoofWeight += pen * (f.confidence / 100);
    }
    if (f.category === 'privacy_tool' || f.category === 'api_block') {
      privacyWeight += pen * (f.confidence / 100);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const spoofProbability = Math.min(1, spoofWeight / 60);
  const privacyToolProbability = Math.min(1, privacyWeight / 40);

  let summary = 'Browser environment looks native.';
  if (spoofProbability > 0.55) {
    summary = 'Strong signs of fingerprint spoofing or anti-detect tooling.';
  } else if (spoofProbability > 0.3) {
    summary = 'Some integrity issues detected — possible extensions or partial spoofing.';
  } else if (privacyToolProbability > 0.4) {
    summary = 'Privacy hardening active; fingerprint surface reduced.';
  }

  return {
    score,
    findings: findings.sort((a, b) => b.confidence - a.confidence),
    canvasStable,
    canvasSamples,
    audioStable,
    spoofProbability,
    privacyToolProbability,
    summary,
  };
}
