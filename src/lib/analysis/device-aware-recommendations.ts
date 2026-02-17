// ============================================================
// EchoPrint AI - Device Aware Recommendations
// Адаптивные рекомендации на основе типа устройства
// ============================================================

import type { FingerprintData } from '../types';
import type { DeviceProfile, DeviceFormFactor, DeviceOS } from '../fingerprint/device-detector';
import { getDeviceTypeName, getOSName } from '../fingerprint/device-detector';

export interface DeviceRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  category: 'privacy' | 'uniqueness' | 'consistency' | 'device';
}

export interface DeviceConsistencyCheck {
  id: string;
  passed: boolean;
  title: string;
  description: string;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DeviceAnomaly {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  category: string;
}

export interface DeviceAwareAnalysis {
  deviceProfile: DeviceProfile;
  recommendations: DeviceRecommendation[];
  anomalies: DeviceAnomaly[];
  consistencyChecks: DeviceConsistencyCheck[];
  deviceSpecificWarnings: string[];
}

export function generateDeviceAwareAnalysis(
  data: FingerprintData,
  deviceProfile: DeviceProfile
): DeviceAwareAnalysis {
  const recommendations: DeviceRecommendation[] = [];
  const anomalies: DeviceAnomaly[] = [];
  const consistencyChecks: DeviceConsistencyCheck[] = [];
  const deviceSpecificWarnings: string[] = [];

  // === 1. Проверка разрешения экрана ===
  const screenCheck = checkScreenResolution(data, deviceProfile);
  consistencyChecks.push(screenCheck);
  if (!screenCheck.passed) {
    anomalies.push({
      id: 'screen-resolution-mismatch',
      severity: 'high',
      title: 'Несоответствие разрешения экрана',
      description: `Разрешение ${data.hardware.screen.width}x${data.hardware.screen.height} нетипично для ${getDeviceTypeName(deviceProfile.formFactor)}`,
      category: 'display'
    });
    
    // Адаптивная рекомендация
    if (deviceProfile.isMobile) {
      recommendations.push({
        id: 'mobile-resolution',
        priority: 'medium',
        title: 'Разрешение мобильного устройства',
        description: 'На мобильных устройствах изменение разрешения невозможно без root/jailbreak. Это может указывать на эмулятор.',
        action: 'Если вы используете эмулятор, будьте aware что это легко детектируется.',
        category: 'device'
      });
    } else {
      recommendations.push({
        id: 'desktop-resolution',
        priority: 'low',
        title: 'Изменение разрешения экрана',
        description: 'На ПК вы можете изменить разрешение в настройках системы для большей анонимности.',
        action: 'Панель управления → Дисплей → Разрешение экрана',
        category: 'uniqueness'
      });
    }
  }

  // === 2. Проверка DPI/Pixel Ratio ===
  const dpiCheck = checkDPI(data, deviceProfile);
  consistencyChecks.push(dpiCheck);
  if (!dpiCheck.passed) {
    anomalies.push({
      id: 'dpi-anomaly',
      severity: 'medium',
      title: 'Аномальный Pixel Ratio',
      description: `Pixel Ratio ${data.hardware.screen.pixelRatio} необычен для ${getDeviceTypeName(deviceProfile.formFactor)}`,
      category: 'display'
    });
  }

  // === 3. Проверка ядер CPU ===
  const coresCheck = checkCPUCores(data, deviceProfile);
  consistencyChecks.push(coresCheck);
  if (!coresCheck.passed) {
    if (deviceProfile.isMobile && data.hardware.cpuCores > 8) {
      anomalies.push({
        id: 'mobile-cores-anomaly',
        severity: 'high',
        title: 'Подозрительное количество ядер',
        description: `Мобильные устройства редко имеют более 8 ядер. Обнаружено: ${data.hardware.cpuCores}`,
        category: 'hardware'
      });
      deviceSpecificWarnings.push('Возможно используется эмулятор Android на ПК');
    }
  }

  // === 4. Проверка Battery API ===
  const batteryCheck = checkBatteryAPI(data, deviceProfile);
  consistencyChecks.push(batteryCheck);
  if (!batteryCheck.passed) {
    if (deviceProfile.hasBattery && !data.battery.supported) {
      anomalies.push({
        id: 'battery-api-missing',
        severity: 'low',
        title: 'Battery API недоступен',
        description: 'Устройство должно иметь Battery API, но он заблокирован',
        category: 'privacy'
      });
      recommendations.push({
        id: 'battery-api-blocked',
        priority: 'low',
        title: 'Battery API заблокирован',
        description: 'Это хорошо для приватности, но может выделять вас из толпы.',
        action: 'Нормальная настройка для privacy-focused пользователей',
        category: 'privacy'
      });
    }
  }

  // === 5. Проверка Touch Points ===
  const touchCheck = checkTouchPoints(data, deviceProfile);
  consistencyChecks.push(touchCheck);
  if (!touchCheck.passed) {
    if (deviceProfile.isMobile && data.hardware.maxTouchPoints === 0) {
      anomalies.push({
        id: 'mobile-no-touch',
        severity: 'critical',
        title: 'Мобильное устройство без Touch',
        description: 'Мобильное устройство должно поддерживать touch input',
        category: 'hardware'
      });
      deviceSpecificWarnings.push('Критическое несоответствие - возможно эмуляция или spoofing');
    }
  }

  // === 6. Device-Specific Recommendations ===
  
  // Mobile specific
  if (deviceProfile.isMobile) {
    recommendations.push({
      id: 'mobile-privacy',
      priority: 'high',
      title: 'Приватность на мобильном устройстве',
      description: 'Мобильные устройства имеют больше уникальных идентификаторов (IMEI, Android ID, IDFA)',
      action: 'Используйте Firefox Focus или Brave Browser на мобильных',
      category: 'privacy'
    });

    if (deviceProfile.os === 'android') {
      recommendations.push({
        id: 'android-specific',
        priority: 'medium',
        title: 'Android специфика',
        description: 'Android имеет много телеметрии Google',
        action: 'Рассмотрите custom ROM (GrapheneOS, CalyxOS) для максимальной приватности',
        category: 'privacy'
      });
    }

    if (deviceProfile.os === 'ios') {
      recommendations.push({
        id: 'ios-specific',
        priority: 'medium',
        title: 'iOS специфика',
        description: 'iOS имеет хорошую защиту приватности, но ограничивает кастомизацию',
        action: 'Включите App Tracking Transparency в настройках',
        category: 'privacy'
      });
    }
  }

  // Desktop specific
  if (deviceProfile.isDesktop) {
    recommendations.push({
      id: 'desktop-privacy',
      priority: 'medium',
      title: 'Приватность на десктопе',
      description: 'На ПК легче изменить конфигурацию для анонимности',
      action: 'Рассмотрите использование виртуальной машины или Tails OS',
      category: 'privacy'
    });

    if (data.webrtc.localIPs.length > 0) {
      recommendations.push({
        id: 'webrtc-desktop',
        priority: 'high',
        title: 'WebRTC утечка IP',
        description: 'Ваш локальный IP адрес может быть получен через WebRTC',
        action: 'Отключите WebRTC в настройках браузера или используйте расширение',
        category: 'privacy'
      });
    }
  }

  // Tablet specific
  if (deviceProfile.isTablet) {
    recommendations.push({
      id: 'tablet-hybrid',
      priority: 'low',
      title: 'Планшет как гибридное устройство',
      description: 'Планшеты часто имеют уникальную комбинацию мобильных и десктопных признаков',
      action: 'Используйте десктопный режим браузера для меньшей уникальности',
      category: 'uniqueness'
    });
  }

  // === 7. WebRTC Leak Warning ===
  if (data.webrtc.localIPs.length > 0) {
    deviceSpecificWarnings.push(`WebRTC утечка: обнаружены IP ${data.webrtc.localIPs.join(', ')}`);
  }

  // === 8. Memory check ===
  if (data.hardware.memory) {
    const memoryCheck = checkMemory(data, deviceProfile);
    consistencyChecks.push(memoryCheck);
  }

  return {
    deviceProfile,
    recommendations,
    anomalies,
    consistencyChecks,
    deviceSpecificWarnings
  };
}

// === Helper Functions ===

function checkScreenResolution(data: FingerprintData, profile: DeviceProfile): DeviceConsistencyCheck {
  const { width, height } = data.hardware.screen;
  const isTypical = isResolutionTypicalForDevice(width, height, profile);
  
  return {
    id: 'screen-resolution',
    passed: isTypical,
    title: 'Разрешение экрана',
    description: `Проверка соответствия разрешения типичным значениям для ${getDeviceTypeName(profile.formFactor)}`,
    details: `${width}x${height} ${isTypical ? '✓ Типично' : '✗ Нетипично'}`,
    severity: 'medium'
  };
}

function checkDPI(data: FingerprintData, profile: DeviceProfile): DeviceConsistencyCheck {
  const { pixelRatio } = data.hardware.screen;
  const isTypical = profile.typicalDPIs.some(dpi => Math.abs(pixelRatio - dpi) < 0.3);
  
  return {
    id: 'pixel-ratio',
    passed: isTypical,
    title: 'Pixel Ratio (DPI)',
    description: 'Проверка плотности пикселей экрана',
    details: `${pixelRatio}x ${isTypical ? '✓ Типично' : '✗ Нетипично'}`,
    severity: 'low'
  };
}

function checkCPUCores(data: FingerprintData, profile: DeviceProfile): DeviceConsistencyCheck {
  const cores = data.hardware.cpuCores;
  const isTypical = profile.typicalCores.includes(cores);
  
  return {
    id: 'cpu-cores',
    passed: isTypical,
    title: 'Количество ядер CPU',
    description: 'Проверка соответствия количества ядер типичным значениям',
    details: `${cores} ядер ${isTypical ? '✓ Типично' : '✗ Нетипично'}`,
    severity: 'medium'
  };
}

function checkMemory(data: FingerprintData, profile: DeviceProfile): DeviceConsistencyCheck {
  const memory = data.hardware.memory;
  if (!memory) {
    return {
      id: 'memory',
      passed: true,
      title: 'Объём памяти',
      description: 'Информация о памяти недоступна',
      details: 'N/A',
      severity: 'low'
    };
  }
  
  const isTypical = profile.typicalMemory.includes(memory);
  
  return {
    id: 'memory',
    passed: isTypical,
    title: 'Объём памяти (RAM)',
    description: 'Проверка соответствия объёма памяти типичным значениям',
    details: `${memory} GB ${isTypical ? '✓ Типично' : '✗ Нетипично'}`,
    severity: 'low'
  };
}

function checkBatteryAPI(data: FingerprintData, profile: DeviceProfile): DeviceConsistencyCheck {
  const hasBattery = data.battery.supported;
  const shouldHaveBattery = profile.hasBattery;
  
  // Not having battery when should is suspicious
  // Not having battery when shouldn't is normal
  const passed = !shouldHaveBattery || hasBattery;
  
  return {
    id: 'battery-api',
    passed,
    title: 'Battery API',
    description: 'Проверка доступности API батареи',
    details: hasBattery ? 'Доступен' : 'Заблокирован/Отсутствует',
    severity: 'low'
  };
}

function checkTouchPoints(data: FingerprintData, profile: DeviceProfile): DeviceConsistencyCheck {
  const { maxTouchPoints } = data.hardware;
  const shouldHaveTouch = profile.isTouch;
  
  const passed = shouldHaveTouch ? maxTouchPoints > 0 : true;
  
  return {
    id: 'touch-points',
    passed,
    title: 'Touch Support',
    description: 'Проверка поддержки сенсорного ввода',
    details: `${maxTouchPoints} точек ${passed ? '✓ OK' : '✗ Ошибка'}`,
    severity: passed ? 'low' : 'critical'
  };
}

function isResolutionTypicalForDevice(width: number, height: number, profile: DeviceProfile): boolean {
  const typical = profile.typicalResolutions;
  const tolerance = 50;
  
  return typical.some(([tw, th]) => {
    return (Math.abs(width - tw) <= tolerance && Math.abs(height - th) <= tolerance) ||
           (Math.abs(width - th) <= tolerance && Math.abs(height - tw) <= tolerance);
  });
}

/**
 * Генерирует рекомендации для отображения в UI
 */
export function getDeviceRecommendationText(profile: DeviceProfile): string {
  if (profile.isMobile) {
    return `Ваше мобильное устройство (${getOSName(profile.os)}) имеет специфичные настройки приватности. Рекомендуем использовать мобильные браузеры с защитой от трекинга.`;
  }
  if (profile.isTablet) {
    return `Планшеты сочетают признаки мобильных и десктопных устройств. Рекомендуем использовать десктопный режим браузера для снижения уникальности.`;
  }
  if (profile.isDesktop) {
    return `На десктопе вы имеете максимальный контроль над приватностью. Рассмотрите использование Tor Browser или VPN для анонимности.`;
  }
  return `Обнаружено необычное устройство. Проверьте корректность настроек браузера.`;
}
