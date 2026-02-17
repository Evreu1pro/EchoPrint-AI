// ============================================================
// EchoPrint AI - Device Detector
// Система определения типа устройства
// ============================================================

import type { HardwareInfo, NavigatorInfo } from '../types';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'smart-tv' | 'console' | 'unknown';
export type DeviceOS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'chrome-os' | 'unknown';
export type DeviceFormFactor = 'phone' | 'phablet' | 'tablet' | 'laptop' | 'desktop' | 'tv' | 'console';

export interface DeviceProfile {
  type: DeviceType;
  os: DeviceOS;
  formFactor: DeviceFormFactor;
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  confidence: number;
  detectedVia: string[];
  screenClass: string;
  typicalResolutions: number[][];
  typicalDPIs: number[];
  typicalCores: number[];
  typicalMemory: number[];
  hasBattery: boolean;
  hasCellular: boolean;
}

export class DeviceDetector {
  private ua: string;
  private platform: string;
  private vendor: string;
  private screen: { width: number; height: number; pixelRatio: number };
  private hardware: HardwareInfo;
  private navigatorInfo: NavigatorInfo;

  constructor(
    ua: string,
    platform: string,
    vendor: string,
    screen: { width: number; height: number; pixelRatio: number },
    hardware: HardwareInfo,
    navigatorInfo: NavigatorInfo
  ) {
    this.ua = ua.toLowerCase();
    this.platform = platform.toLowerCase();
    this.vendor = vendor.toLowerCase();
    this.screen = screen;
    this.hardware = hardware;
    this.navigatorInfo = navigatorInfo;
  }

  detect(): DeviceProfile {
    const detectedVia: string[] = [];
    let confidence = 0;

    // 1. Определение OS
    const os = this.detectOS(detectedVia);
    
    // 2. Определение Touch
    const isTouch = this.detectTouch(detectedVia);
    
    // 3. Определение Form Factor
    const formFactor = this.detectFormFactor(os, isTouch, detectedVia);
    
    // 4. Определение Device Type
    const type = this.detectDeviceType(formFactor, os, detectedVia);
    
    // 5. Расчет уверенности
    confidence = this.calculateConfidence(detectedVia);

    // 6. Определение класса экрана
    const screenClass = this.getScreenClass(formFactor);

    return {
      type,
      os,
      formFactor,
      isTouch,
      isMobile: formFactor === 'phone' || formFactor === 'phablet',
      isTablet: formFactor === 'tablet',
      isDesktop: formFactor === 'laptop' || formFactor === 'desktop',
      confidence: Math.round(confidence * 100),
      detectedVia,
      screenClass,
      typicalResolutions: this.getTypicalResolutions(formFactor, os),
      typicalDPIs: this.getTypicalDPIs(formFactor, os),
      typicalCores: this.getTypicalCores(formFactor),
      typicalMemory: this.getTypicalMemory(formFactor),
      hasBattery: this.detectBatteryCapability(os, formFactor),
      hasCellular: this.detectCellularCapability(os, formFactor),
    };
  }

  private detectOS(detectedVia: string[]): DeviceOS {
    // iOS detection
    if (this.ua.includes('iphone') || this.ua.includes('ipad') || this.ua.includes('ipod')) {
      detectedVia.push('UA-iOS');
      return 'ios';
    }
    
    // Android detection
    if (this.ua.includes('android')) {
      detectedVia.push('UA-Android');
      return 'android';
    }
    
    // Windows detection
    if (this.ua.includes('windows')) {
      detectedVia.push('UA-Windows');
      return 'windows';
    }
    
    // macOS detection
    if (this.ua.includes('mac os') || this.ua.includes('macos')) {
      detectedVia.push('UA-macOS');
      return 'macos';
    }
    
    // ChromeOS detection
    if (this.ua.includes('cros')) {
      detectedVia.push('UA-ChromeOS');
      return 'chrome-os';
    }
    
    // Linux detection
    if (this.ua.includes('linux')) {
      detectedVia.push('UA-Linux');
      return 'linux';
    }
    
    // Platform fallback
    if (this.platform.includes('win')) {
      detectedVia.push('Platform-Windows');
      return 'windows';
    }
    if (this.platform.includes('mac')) {
      detectedVia.push('Platform-macOS');
      return 'macos';
    }
    if (this.platform.includes('linux')) {
      detectedVia.push('Platform-Linux');
      return 'linux';
    }
    if (this.platform.includes('iphone') || this.platform.includes('ipad')) {
      detectedVia.push('Platform-iOS');
      return 'ios';
    }
    if (this.platform.includes('android')) {
      detectedVia.push('Platform-Android');
      return 'android';
    }

    detectedVia.push('Default');
    return 'unknown';
  }

  private detectTouch(detectedVia: string[]): boolean {
    // MaxTouchPoints (most reliable)
    if (this.hardware.maxTouchPoints > 0) {
      detectedVia.push('TouchPoints');
      return true;
    }
    
    // UA hints
    if (this.ua.includes('touch') || this.ua.includes('mobile')) {
      detectedVia.push('UA-Touch');
      return true;
    }
    
    // Client Hints
    if (this.navigatorInfo.userAgentData?.mobile) {
      detectedVia.push('ClientHints-Mobile');
      return true;
    }
    
    detectedVia.push('NoTouchDetected');
    return false;
  }

  private detectFormFactor(os: DeviceOS, isTouch: boolean, detectedVia: string[]): DeviceFormFactor {
    const { width, height, pixelRatio } = this.screen;
    const diagonal = this.calculateScreenDiagonal(width, height, pixelRatio);
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);

    // Phone detection
    if (isTouch && maxDimension <= 900) {
      detectedVia.push('FormFactor-Phone-Screen');
      return 'phone';
    }
    
    // Phablet detection (large phone)
    if (isTouch && maxDimension > 900 && maxDimension <= 1100 && minDimension <= 500) {
      detectedVia.push('FormFactor-Phablet-Screen');
      return 'phablet';
    }
    
    // Tablet detection
    if (isTouch && maxDimension > 700 && maxDimension <= 1600) {
      // Additional checks for tablet
      if (os === 'ios' && this.ua.includes('ipad')) {
        detectedVia.push('FormFactor-iPad');
        return 'tablet';
      }
      if (os === 'android' && !this.ua.includes('mobile')) {
        detectedVia.push('FormFactor-Android-Tablet');
        return 'tablet';
      }
      if (diagonal >= 7 && diagonal <= 13) {
        detectedVia.push('FormFactor-Tablet-Diagonal');
        return 'tablet';
      }
    }
    
    // TV detection
    if (this.ua.includes('smart-tv') || this.ua.includes('tv') || this.ua.includes('webos') || this.ua.includes('tizen')) {
      detectedVia.push('FormFactor-TV-UA');
      return 'tv';
    }
    
    // Console detection
    if (this.ua.includes('playstation') || this.ua.includes('xbox') || this.ua.includes('nintendo')) {
      detectedVia.push('FormFactor-Console-UA');
      return 'console';
    }
    
    // Laptop vs Desktop
    if (isTouch && !this.ua.includes('mobile')) {
      // Touch laptop (2-in-1)
      detectedVia.push('FormFactor-Touch-Laptop');
      return 'laptop';
    }
    
    // Screen size heuristic for desktop
    if (width >= 1920 || height >= 1080) {
      detectedVia.push('FormFactor-Desktop-Resolution');
      return 'desktop';
    }
    
    // Default to laptop for non-touch smaller screens
    if (!isTouch) {
      detectedVia.push('FormFactor-Laptop-Default');
      return 'laptop';
    }
    
    detectedVia.push('FormFactor-Unknown');
    return 'laptop';
  }

  private detectDeviceType(formFactor: DeviceFormFactor, os: DeviceOS, detectedVia: string[]): DeviceType {
    if (formFactor === 'phone' || formFactor === 'phablet') {
      detectedVia.push('Type-Mobile');
      return 'mobile';
    }
    if (formFactor === 'tablet') {
      detectedVia.push('Type-Tablet');
      return 'tablet';
    }
    if (formFactor === 'tv') {
      detectedVia.push('Type-SmartTV');
      return 'smart-tv';
    }
    if (formFactor === 'console') {
      detectedVia.push('Type-Console');
      return 'console';
    }
    if (formFactor === 'laptop' || formFactor === 'desktop') {
      detectedVia.push('Type-Desktop');
      return 'desktop';
    }
    
    detectedVia.push('Type-Unknown');
    return 'unknown';
  }

  private calculateConfidence(detectedVia: string[]): number {
    const highConfidenceSignals = [
      'UA-iOS', 'UA-Android', 'FormFactor-iPad', 'FormFactor-Android-Tablet',
      'ClientHints-Mobile', 'TouchPoints'
    ];
    const mediumConfidenceSignals = [
      'UA-Windows', 'UA-macOS', 'FormFactor-Phone-Screen', 'FormFactor-Tablet-Diagonal'
    ];
    
    let confidence = 0.5; // Base confidence
    
    detectedVia.forEach(signal => {
      if (highConfidenceSignals.includes(signal)) {
        confidence += 0.15;
      } else if (mediumConfidenceSignals.includes(signal)) {
        confidence += 0.1;
      } else {
        confidence += 0.05;
      }
    });
    
    return Math.min(1.0, confidence);
  }

  private calculateScreenDiagonal(width: number, height: number, pixelRatio: number): number {
    // Approximate diagonal in inches (assuming ~96 DPI base)
    const widthInches = (width / pixelRatio) / 96;
    const heightInches = (height / pixelRatio) / 96;
    return Math.sqrt(widthInches ** 2 + heightInches ** 2);
  }

  private getScreenClass(formFactor: DeviceFormFactor): string {
    const { width, height } = this.screen;
    const maxDim = Math.max(width, height);
    
    if (maxDim <= 480) return 'xs';
    if (maxDim <= 768) return 'sm';
    if (maxDim <= 1024) return 'md';
    if (maxDim <= 1440) return 'lg';
    return 'xl';
  }

  private getTypicalResolutions(formFactor: DeviceFormFactor, os: DeviceOS): number[][] {
    const resolutions: Record<string, number[][]> = {
      phone: [
        [390, 844], [414, 896], [375, 812], [360, 800], [412, 915],
        [393, 873], [428, 926], [320, 568], [375, 667]
      ],
      phablet: [
        [412, 915], [428, 926], [384, 854], [414, 896]
      ],
      tablet: [
        [768, 1024], [800, 1280], [810, 1080], [1024, 1366],
        [834, 1194], [820, 1180], [1024, 768]
      ],
      laptop: [
        [1366, 768], [1440, 900], [1536, 864], [1600, 900],
        [1920, 1080], [1440, 960], [1280, 800]
      ],
      desktop: [
        [1920, 1080], [2560, 1440], [1366, 768], [1600, 900],
        [3840, 2160], [2560, 1080], [1920, 1200]
      ],
      tv: [
        [1920, 1080], [3840, 2160], [1280, 720]
      ],
      console: [
        [1920, 1080], [3840, 2160]
      ]
    };
    
    return resolutions[formFactor] || resolutions.laptop;
  }

  private getTypicalDPIs(formFactor: DeviceFormFactor, os: DeviceOS): number[] {
    if (os === 'ios') {
      return [2, 3]; // Retina displays
    }
    if (formFactor === 'phone' || formFactor === 'phablet') {
      return [2, 2.5, 3, 3.5, 4];
    }
    if (formFactor === 'tablet') {
      return [1.5, 2, 2.5];
    }
    return [1, 1.25, 1.5, 2];
  }

  private getTypicalCores(formFactor: DeviceFormFactor): number[] {
    const cores: Record<string, number[]> = {
      phone: [4, 6, 8],
      phablet: [6, 8],
      tablet: [4, 6, 8],
      laptop: [4, 6, 8, 12],
      desktop: [4, 6, 8, 12, 16, 24, 32],
      tv: [4, 6],
      console: [8, 12]
    };
    return cores[formFactor] || [4, 6, 8];
  }

  private getTypicalMemory(formFactor: DeviceFormFactor): number[] {
    const memory: Record<string, number[]> = {
      phone: [4, 6, 8, 12],
      phablet: [6, 8, 12],
      tablet: [4, 6, 8, 16],
      laptop: [8, 16, 32],
      desktop: [8, 16, 32, 64],
      tv: [2, 4, 8],
      console: [16, 20]
    };
    return memory[formFactor] || [8, 16];
  }

  private detectBatteryCapability(os: DeviceOS, formFactor: DeviceFormFactor): boolean {
    // TVs and consoles typically don't expose battery API
    if (formFactor === 'tv' || formFactor === 'console') {
      return false;
    }
    // Desktops usually don't have battery
    if (formFactor === 'desktop') {
      return false;
    }
    return true;
  }

  private detectCellularCapability(os: DeviceOS, formFactor: DeviceFormFactor): boolean {
    return formFactor === 'phone' || formFactor === 'phablet' || 
           (formFactor === 'tablet' && (os === 'ios' || os === 'android'));
  }

  // Helper: Check if resolution is typical for device type
  isResolutionTypical(width: number, height: number, profile: DeviceProfile): boolean {
    const typical = profile.typicalResolutions;
    const tolerance = 50; // pixels tolerance
    
    return typical.some(([tw, th]) => {
      return (Math.abs(width - tw) <= tolerance && Math.abs(height - th) <= tolerance) ||
             (Math.abs(width - th) <= tolerance && Math.abs(height - tw) <= tolerance);
    });
  }

  // Helper: Check if DPI is typical for device type
  isDPITypical(pixelRatio: number, profile: DeviceProfile): boolean {
    return profile.typicalDPIs.some(dpi => Math.abs(pixelRatio - dpi) < 0.3);
  }

  // Helper: Check if core count is typical for device type
  isCoresTypical(cores: number, profile: DeviceProfile): boolean {
    return profile.typicalCores.includes(cores);
  }

  // Helper: Check if memory is typical for device type
  isMemoryTypical(memory: number, profile: DeviceProfile): boolean {
    return profile.typicalMemory.includes(memory);
  }
}

// Export factory function
export function detectDevice(
  ua: string,
  platform: string,
  vendor: string,
  screen: { width: number; height: number; pixelRatio: number },
  hardware: HardwareInfo,
  navigatorInfo: NavigatorInfo
): DeviceProfile {
  const detector = new DeviceDetector(ua, platform, vendor, screen, hardware, navigatorInfo);
  return detector.detect();
}

// Helper function to get device type name in Russian
export function getDeviceTypeName(formFactor: string): string {
  const names: Record<string, string> = {
    phone: 'телефона',
    phablet: 'фаблета',
    tablet: 'планшета',
    laptop: 'ноутбука',
    desktop: 'ПК',
    tv: 'Smart TV',
    console: 'игровой консоли'
  };
  return names[formFactor] || 'устройства';
}

// Helper function to get OS name in Russian
export function getOSName(os: DeviceOS): string {
  const names: Record<DeviceOS, string> = {
    ios: 'iOS',
    android: 'Android',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    'chrome-os': 'Chrome OS',
    unknown: 'Неизвестно'
  };
  return names[os] || 'Неизвестно';
}
