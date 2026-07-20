// ============================================================
// EchoPrint AI - Main Fingerprint Collector
// Главный сборщик всех fingerprint данных
// ============================================================

import type { FingerprintData, ScanProgress, PerformanceInfo } from '../types';

export type ProgressCallback = (progress: ScanProgress) => void;

// Динамический импорт FingerprintJS для избежания проблем
let FingerprintJSLoaded: typeof import('@fingerprintjs/fingerprintjs').default | null = null;

async function loadFingerprintJS() {
  if (!FingerprintJSLoaded) {
    try {
      const fpjsModule = await import('@fingerprintjs/fingerprintjs');
      FingerprintJSLoaded = fpjsModule.default;
    } catch {
      console.warn('FingerprintJS not available');
      return null;
    }
  }
  return FingerprintJSLoaded;
}

/**
 * Главный сборщик fingerprint данных
 */
export async function collectFingerprint(
  onProgress?: ProgressCallback
): Promise<FingerprintData> {
  const startTime = globalThis.performance.now();
  let signalsCollected = 0;
  const totalSignals = 16;

  const updateProgress = (stage: string, currentSignal: string) => {
    signalsCollected++;
    onProgress?.({
      stage,
      progress: Math.round((signalsCollected / totalSignals) * 100),
      currentSignal,
      signalsCollected,
      totalSignals
    });
  };

  // Динамические импорты модулей
  const { getCanvasFingerprint } = await import('./canvas');
  const { getWebGLFingerprint } = await import('./webgl');
  const { getAudioFingerprint } = await import('./audio');
  const { getFontsInfo } = await import('./fonts');
  const { getWebRTCLeak } = await import('./webrtc');
  const { getHardwareInfo } = await import('./hardware');
  const { getNavigatorInfo, parseUserAgent } = await import('./navigator');
  const { getSensorsInfo } = await import('./sensors');
  const { getStorageInfo } = await import('./storage');
  const { getMiscInfo, getMediaQueriesInfo, getBatteryInfo, getPerformanceInfo, getMediaDevicesFull } = await import('./misc');

  // 1. Canvas Fingerprint
  updateProgress('Canvas fingerprint', 'Canvas 2D');
  const canvas = getCanvasFingerprint();
  await delay(40);

  // 2. WebGL Fingerprint
  updateProgress('WebGL fingerprint', 'WebGL');
  const webgl = getWebGLFingerprint();
  await delay(40);

  // 3. Audio Fingerprint
  updateProgress('Audio fingerprint', 'AudioContext');
  const audio = await getAudioFingerprint();
  await delay(40);

  // 4. Fonts
  updateProgress('Font enumeration', 'Fonts');
  const fonts = getFontsInfo();
  await delay(40);

  // 5. WebRTC
  updateProgress('WebRTC leak check', 'WebRTC');
  const webrtc = await getWebRTCLeak();
  await delay(40);

  // 6. Media Devices
  updateProgress('Media devices', 'Media Devices');
  const mediaDevices = await getMediaDevicesFull();
  await delay(40);

  // 7. Hardware
  updateProgress('Hardware signals', 'Hardware');
  const hardware = getHardwareInfo();
  await delay(40);

  // 8. Navigator
  updateProgress('Navigator & Client Hints', 'Navigator');
  const navigatorInfo = await getNavigatorInfo();
  const parsedUA = parseUserAgent(navigatorInfo.userAgent);
  await delay(40);

  // 9. Sensors
  updateProgress('Sensor APIs', 'Sensors');
  const sensors = getSensorsInfo();
  await delay(40);

  // 10. Battery
  updateProgress('Battery API', 'Battery');
  const battery = await getBatteryInfo();
  await delay(40);

  // 11. Media Queries
  updateProgress('CSS media features', 'Media Queries');
  const mediaQueries = getMediaQueriesInfo();
  await delay(40);

  // 12. Storage
  updateProgress('Storage APIs', 'Storage');
  const storage = await getStorageInfo();
  await delay(40);

  // 13. Performance
  updateProgress('Performance timing', 'Performance');
  const perfData = getPerformanceInfo();
  const perfResult: PerformanceInfo = {
    domContentLoaded: perfData.timing.domContentLoaded,
    loadComplete: perfData.timing.loadComplete,
    domInteractive: perfData.timing.domInteractive,
    memory: perfData.memory,
    timingAnomaly: false
  };
  await delay(40);

  // 14. Misc
  updateProgress('Locale, voices, network', 'Misc');
  const misc = getMiscInfo();
  await delay(40);

  // 15. FingerprintJS
  updateProgress('FingerprintJS visitorId', 'FingerprintJS');
  let fpjs: FingerprintData['fpjs'] = null;
  try {
    const FPJS = await loadFingerprintJS();
    if (FPJS) {
      const fp = await FPJS.load();
      const result = await fp.get();
      fpjs = {
        visitorId: result.visitorId,
        components: result.components as Record<string, { value: unknown; duration: number }>
      };
    }
  } catch (e) {
    console.warn('FingerprintJS error:', e);
    fpjs = null;
  }
  await delay(100);

  // Final progress
  updateProgress('Finalizing collection', 'Done');

  const scanDuration = globalThis.performance.now() - startTime;

  return {
    canvas,
    webgl,
    audio,
    fonts,
    webrtc,
    mediaDevices,
    hardware,
    navigator: navigatorInfo,
    parsedUA,
    sensors,
    battery,
    mediaQueries,
    storage,
    performance: perfResult,
    misc,
    fpjs,
    timestamp: new Date().toISOString(),
    scanDuration,
    totalSignals: 100
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Быстрый сбор только критичных данных
 */
export async function collectQuickFingerprint(): Promise<Partial<FingerprintData>> {
  const { getNavigatorInfo, parseUserAgent } = await import('./navigator');
  const { getHardwareInfo } = await import('./hardware');

  const [navigatorInfo, hardware] = await Promise.all([
    getNavigatorInfo(),
    Promise.resolve(getHardwareInfo())
  ]);

  return {
    navigator: navigatorInfo,
    parsedUA: parseUserAgent(navigatorInfo.userAgent),
    hardware,
    timestamp: new Date().toISOString(),
    totalSignals: 20
  } as Partial<FingerprintData>;
}
