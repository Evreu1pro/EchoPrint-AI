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
  updateProgress('Сбор Canvas данных', 'Canvas 2D');
  const canvas = getCanvasFingerprint();
  await delay(100);

  // 2. WebGL Fingerprint
  updateProgress('Сбор WebGL данных', 'WebGL');
  const webgl = getWebGLFingerprint();
  await delay(100);

  // 3. Audio Fingerprint
  updateProgress('Сбор Audio данных', 'AudioContext');
  const audio = await getAudioFingerprint();
  await delay(100);

  // 4. Fonts
  updateProgress('Определение шрифтов', 'Fonts');
  const fonts = getFontsInfo();
  await delay(100);

  // 5. WebRTC
  updateProgress('Проверка WebRTC', 'WebRTC');
  const webrtc = await getWebRTCLeak();
  await delay(100);

  // 6. Media Devices
  updateProgress('Проверка медиа-устройств', 'Media Devices');
  const mediaDevices = await getMediaDevicesFull();
  await delay(100);

  // 7. Hardware
  updateProgress('Сбор информации о железе', 'Hardware');
  const hardware = getHardwareInfo();
  await delay(100);

  // 8. Navigator
  updateProgress('Сбор Navigator данных', 'Navigator');
  const navigatorInfo = await getNavigatorInfo();
  const parsedUA = parseUserAgent(navigatorInfo.userAgent);
  await delay(100);

  // 9. Sensors
  updateProgress('Проверка сенсоров', 'Sensors');
  const sensors = getSensorsInfo();
  await delay(100);

  // 10. Battery
  updateProgress('Проверка батареи', 'Battery');
  const battery = await getBatteryInfo();
  await delay(100);

  // 11. Media Queries
  updateProgress('Сбор медиа-настроек', 'Media Queries');
  const mediaQueries = getMediaQueriesInfo();
  await delay(100);

  // 12. Storage
  updateProgress('Проверка Storage API', 'Storage');
  const storage = await getStorageInfo();
  await delay(100);

  // 13. Performance
  updateProgress('Анализ Performance', 'Performance');
  const perfData = getPerformanceInfo();
  const perfResult: PerformanceInfo = {
    domContentLoaded: perfData.timing.domContentLoaded,
    loadComplete: perfData.timing.loadComplete,
    domInteractive: perfData.timing.domInteractive,
    memory: perfData.memory,
    timingAnomaly: false
  };
  await delay(100);

  // 14. Misc
  updateProgress('Сбор дополнительных данных', 'Misc');
  const misc = getMiscInfo();
  await delay(100);

  // 15. FingerprintJS
  updateProgress('FingerprintJS анализ', 'FingerprintJS');
  let fpjs = null;
  try {
    const FPJS = await loadFingerprintJS();
    if (FPJS) {
      const fp = await FPJS.load();
      const result = await fp.detect();
      fpjs = {
        visitorId: result.visitorId,
        components: result.components
      };
    }
  } catch (e) {
    console.warn('FingerprintJS error:', e);
    fpjs = null;
  }
  await delay(100);

  // Финальный прогресс
  updateProgress('Завершение', 'Финализация');

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
    totalSignals: 80
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
