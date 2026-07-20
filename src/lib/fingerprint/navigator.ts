// ============================================================
// EchoPrint AI - Navigator & Client Hints
// Сбор navigator данных и User-Agent Client Hints
// ============================================================

import { safeSync, safeAsync } from '../utils/helpers';
import type { NavigatorInfo, ParsedUserAgent } from '../types';

/**
 * Получает базовую navigator информацию
 */
function getBasicNavigatorInfo(): NavigatorInfo {
  const nav = navigator;
  
  return {
    userAgent: safeSync(() => nav.userAgent, ''),
    platform: safeSync(() => nav.platform, ''),
    vendor: safeSync(() => nav.vendor, ''),
    language: safeSync(() => nav.language, ''),
    languages: safeSync(() => [...nav.languages], []),
    cookieEnabled: safeSync(() => nav.cookieEnabled, false),
    doNotTrack: safeSync(() => nav.doNotTrack || null, null),
    webdriver: safeSync(() => nav.webdriver || false, false),
    userAgentData: null
  };
}

/**
 * Получает User-Agent Client Hints
 */
async function getUserAgentData(): Promise<NavigatorInfo['userAgentData']> {
  const nav = navigator as Navigator & {
    userAgentData?: {
      mobile: boolean;
      platform: string;
      brands: { brand: string; version: string }[];
      getHighEntropyValues?: (hints: string[]) => Promise<{
        architecture?: string;
        bitness?: string;
        fullVersionList?: { brand: string; version: string }[];
        model?: string;
        platformVersion?: string;
        uaFullVersion?: string;
      }>;
    };
  };

  if (!nav.userAgentData) {
    return null;
  }

  try {
    const uaData = nav.userAgentData;
    
    let highEntropy: {
      architecture?: string;
      bitness?: string;
      fullVersionList?: { brand: string; version: string }[];
      model?: string;
      platformVersion?: string;
      uaFullVersion?: string;
    } | null = null;
    if (uaData.getHighEntropyValues) {
      try {
        highEntropy = await uaData.getHighEntropyValues([
          'architecture',
          'bitness',
          'fullVersionList',
          'model',
          'platformVersion',
          'uaFullVersion'
        ]);
      } catch {
        // High-entropy Client Hints may be denied
      }
    }

    return {
      mobile: uaData.mobile,
      platform: uaData.platform,
      brands: [...uaData.brands],
      highEntropy
    };
  } catch {
    return null;
  }
}

/**
 * Парсит User-Agent строку
 */
export function parseUserAgent(ua: string): ParsedUserAgent {
  const result: ParsedUserAgent = {
    browser: { name: 'Unknown', version: '', major: 0 },
    os: { name: 'Unknown', version: '' },
    device: { type: 'unknown', model: '' },
    engine: { name: 'Unknown', version: '' }
  };

  // Browser detection
  const browserPatterns: Array<{ name: string; regex: RegExp; getVersion: (m: RegExpMatchArray) => string }> = [
    { name: 'Edge', regex: /Edg\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'Opera', regex: /OPR\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'Brave', regex: /Brave\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'Vivaldi', regex: /Vivaldi\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'Samsung Internet', regex: /SamsungBrowser\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'UC Browser', regex: /UCBrowser\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'Firefox', regex: /Firefox\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'Safari', regex: /Version\/(\d+\.?\d*).*Safari/, getVersion: (m) => m[1] },
    { name: 'Chrome', regex: /Chrome\/(\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'IE', regex: /MSIE (\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'IE', regex: /Trident.*rv:(\d+\.?\d*)/, getVersion: (m) => m[1] }
  ];

  for (const pattern of browserPatterns) {
    const match = ua.match(pattern.regex);
    if (match) {
      result.browser.name = pattern.name;
      result.browser.version = pattern.getVersion(match);
      result.browser.major = parseInt(result.browser.version.split('.')[0] || '0', 10);
      break;
    }
  }

  // OS detection
  const osPatterns: Array<{ name: string; regex: RegExp; getVersion: (m: RegExpMatchArray) => string }> = [
    { name: 'Windows 11', regex: /Windows NT 10.*Win64/, getVersion: () => '11' },
    { name: 'Windows 10', regex: /Windows NT 10/, getVersion: () => '10' },
    { name: 'Windows 8.1', regex: /Windows NT 6\.3/, getVersion: () => '8.1' },
    { name: 'Windows 8', regex: /Windows NT 6\.2/, getVersion: () => '8' },
    { name: 'Windows 7', regex: /Windows NT 6\.1/, getVersion: () => '7' },
    { name: 'Windows Vista', regex: /Windows NT 6\.0/, getVersion: () => 'Vista' },
    { name: 'Windows XP', regex: /Windows NT 5\.[12]/, getVersion: () => 'XP' },
    { name: 'macOS', regex: /Mac OS X (\d+[._]\d+[._]?\d*)/, getVersion: (m) => m[1].replace(/_/g, '.') },
    { name: 'iOS', regex: /iPhone OS (\d+[._]\d+)/, getVersion: (m) => m[1].replace(/_/g, '.') },
    { name: 'iOS', regex: /iPad.*OS (\d+[._]\d+)/, getVersion: (m) => m[1].replace(/_/g, '.') },
    { name: 'Android', regex: /Android (\d+\.?\d*)/, getVersion: (m) => m[1] },
    { name: 'Chrome OS', regex: /CrOS/, getVersion: () => '' },
    { name: 'Linux', regex: /Linux/, getVersion: () => '' },
    { name: 'Ubuntu', regex: /Ubuntu/, getVersion: () => '' },
    { name: 'Fedora', regex: /Fedora/, getVersion: () => '' }
  ];

  for (const pattern of osPatterns) {
    const match = ua.match(pattern.regex);
    if (match) {
      result.os.name = pattern.name;
      result.os.version = pattern.getVersion(match);
      break;
    }
  }

  // Device type detection
  if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua) || (result.os.name === 'iOS' && !/iPhone/.test(ua))) {
      result.device.type = 'tablet';
    } else {
      result.device.type = 'mobile';
    }
  } else {
    result.device.type = 'desktop';
  }

  // Device model
  const mobileModel = ua.match(/(?:iPhone|iPod|iPad|Android).+?([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)/);
  if (mobileModel) {
    result.device.model = mobileModel[1];
  }

  // Engine detection
  const enginePatterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'Blink', regex: /Chrome\/\d/ },
    { name: 'WebKit', regex: /AppleWebKit/ },
    { name: 'Gecko', regex: /Gecko/ },
    { name: 'Trident', regex: /Trident/ },
    { name: 'EdgeHTML', regex: /Edge/ }
  ];

  for (const pattern of enginePatterns) {
    if (pattern.regex.test(ua)) {
      result.engine.name = pattern.name;
      const versionMatch = ua.match(new RegExp(`${pattern.name}\\/(\\d+\\.?\\d*)`, 'i'));
      result.engine.version = versionMatch ? versionMatch[1] : '';
      break;
    }
  }

  return result;
}

/**
 * Основная функция сбора navigator информации
 */
export async function getNavigatorInfo(): Promise<NavigatorInfo> {
  const basicInfo = getBasicNavigatorInfo();
  const userAgentData = await safeAsync(() => getUserAgentData(), null, 3000);

  return {
    ...basicInfo,
    userAgentData
  };
}

/**
 * Получает полную информацию о браузере
 */
export async function getBrowserInfo(): Promise<{
  navigator: NavigatorInfo;
  parsedUA: ParsedUserAgent;
}> {
  const navigator = await getNavigatorInfo();
  const parsedUA = parseUserAgent(navigator.userAgent);

  return { navigator, parsedUA };
}

/**
 * Проверяет признаки автоматизации
 */
export function detectAutomation(): {
  isAutomated: boolean;
  indicators: string[];
} {
  const indicators: string[] = [];

  if (navigator.webdriver) {
    indicators.push('webdriver flag is true');
  }

  const win = window as unknown as Record<string, unknown>;
  for (const key of [
    '__webdriver_script_fn',
    '__driver_evaluate',
    '__selenium_evaluate',
    '__nightmare',
    '_phantom',
    'callPhantom',
  ]) {
    if (win[key] != null) indicators.push(`${key} exists`);
  }

  for (const key of Object.getOwnPropertyNames(window)) {
    if (key.startsWith('cdc_') || key.startsWith('wdc_')) {
      indicators.push(`ChromeDriver variable: ${key}`);
    }
  }

  // Проверка Plugins length (обычно 0 в автоматизированных браузерах)
  if (navigator.plugins && navigator.plugins.length === 0) {
    // Это не всегда означает автоматизацию, но может быть признаком
    // indicators.push('No plugins installed');
  }

  // Проверка languages
  if (navigator.languages && navigator.languages.length === 0) {
    indicators.push('No languages set');
  }

  return {
    isAutomated: indicators.length > 0,
    indicators
  };
}

/**
 * Проверяет признаки headless браузера
 */
export function detectHeadless(): {
  isHeadless: boolean;
  indicators: string[];
} {
  const indicators: string[] = [];

  // WebDriver check
  if (navigator.webdriver) {
    indicators.push('webdriver enabled');
  }

  if (!('chrome' in window) && /Chrome/.test(navigator.userAgent)) {
    indicators.push('Chrome UA but no window.chrome');
  }

  // Permissions API check
  // Headless browsers may have different permissions behavior
  if (navigator.permissions && /Chrome/.test(navigator.userAgent)) {
    // This is async, so we skip it here
  }

  // Plugins check
  if (navigator.plugins && navigator.plugins.length === 0) {
    // Often true for headless, but also for modern Chrome
  }

  // Navigator languages check
  if (!navigator.languages || navigator.languages.length === 0) {
    indicators.push('No navigator.languages');
  }

  // Platform mismatch
  const platform = navigator.platform.toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  if (platform.includes('win') && !ua.includes('windows')) {
    indicators.push('Platform/UA mismatch');
  }
  if (platform.includes('mac') && !ua.includes('mac')) {
    indicators.push('Platform/UA mismatch');
  }
  if (platform.includes('linux') && !ua.includes('linux') && !ua.includes('android')) {
    indicators.push('Platform/UA mismatch');
  }

  return {
    isHeadless: indicators.length > 0,
    indicators
  };
}
