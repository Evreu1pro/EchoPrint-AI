// ============================================================
// EchoPrint AI - Target Detection Engine
// Движок детекции трекеров конкретных платформ
// ============================================================

import type { FingerprintData } from '../types';
import type { TargetProfile, RiskLevel } from '../targets/profiles';
import { 
  ALL_TARGET_PROFILES, 
  AliExpressProfile, 
  AmazonProfile, 
  FacebookProfile, 
  GoogleProfile, 
  TikTokProfile 
} from '../targets/profiles';

export interface DetectionSignal {
  type: 'domain' | 'script' | 'cookie' | 'api' | 'fingerprint' | 'storage';
  name: string;
  found: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface TargetDetectionResult {
  profile: TargetProfile;
  detected: boolean;
  confidence: number;
  signals: DetectionSignal[];
  riskScore: number;
  recommendations: string[];
}

export interface FullDetectionResult {
  results: TargetDetectionResult[];
  overallRisk: RiskLevel;
  totalRiskScore: number;
  criticalTargets: TargetProfile[];
  allSignals: DetectionSignal[];
}

/**
 * Главный движок детекции трекеров
 */
export class TargetDetector {
  private fingerprintData: FingerprintData;
  private pageContext?: {
    domains: string[];
    scripts: string[];
    cookies: string[];
    localStorage: string[];
  };

  constructor(
    fingerprintData: FingerprintData,
    pageContext?: {
      domains: string[];
      scripts: string[];
      cookies: string[];
      localStorage: string[];
    }
  ) {
    this.fingerprintData = fingerprintData;
    this.pageContext = pageContext;
  }

  /**
   * Запускает детекцию всех известных трекеров
   */
  detectAll(): FullDetectionResult {
    const results: TargetDetectionResult[] = [];

    for (const profile of ALL_TARGET_PROFILES) {
      const result = this.detectProfile(profile);
      if (result.detected || result.confidence > 20) {
        results.push(result);
      }
    }

    // Сортируем по risk score
    results.sort((a, b) => b.riskScore - a.riskScore);

    // Определяем общий уровень риска
    const totalRiskScore = results.reduce((sum, r) => sum + r.riskScore, 0);
    const overallRisk = this.calculateOverallRisk(totalRiskScore, results);

    // Критические цели
    const criticalTargets = results
      .filter(r => r.riskScore >= 50 || r.profile.riskLevel === 'CRITICAL')
      .map(r => r.profile);

    // Все сигналы
    const allSignals = results.flatMap(r => r.signals.filter(s => s.found));

    return {
      results,
      overallRisk,
      totalRiskScore: Math.min(100, totalRiskScore),
      criticalTargets,
      allSignals
    };
  }

  /**
   * Детекция конкретного профиля
   */
  detectProfile(profile: TargetProfile): TargetDetectionResult {
    const signals: DetectionSignal[] = [];
    let riskScore = 0;

    // 1. Проверка доменов
    const domainSignals = this.checkDomains(profile);
    signals.push(...domainSignals);
    riskScore += domainSignals.filter(s => s.found).length * 10;

    // 2. Проверка скриптов
    const scriptSignals = this.checkScripts(profile);
    signals.push(...scriptSignals);
    riskScore += scriptSignals.filter(s => s.found).length * 15;

    // 3. Проверка fingerprint методов
    const fpSignals = this.checkFingerprintMethods(profile);
    signals.push(...fpSignals);
    riskScore += fpSignals.filter(s => s.found).length * 5;

    // 4. Проверка storage keys
    const storageSignals = this.checkStorageKeys(profile);
    signals.push(...storageSignals);
    riskScore += storageSignals.filter(s => s.found).length * 8;

    // 5. Генерация рекомендаций
    const recommendations = this.generateRecommendations(profile, signals);

    // Расчёт уверенности
    const activeSignals = signals.filter(s => s.found).length;
    const totalSignals = signals.length || 1;
    const confidence = Math.round((activeSignals / totalSignals) * 100);

    return {
      profile,
      detected: riskScore >= 30,
      confidence,
      signals: signals.filter(s => s.found),
      riskScore: Math.min(100, riskScore),
      recommendations
    };
  }

  /**
   * Проверка доменов
   */
  private checkDomains(profile: TargetProfile): DetectionSignal[] {
    const signals: DetectionSignal[] = [];

    // Primary domains
    for (const domain of profile.trackingInfra.primaryDomains) {
      const found = this.pageContext?.domains?.some(d => d.includes(domain)) ?? false;
      signals.push({
        type: 'domain',
        name: domain,
        found,
        severity: found ? 'high' : 'low',
        description: found 
          ? `Обнаружено соединение с ${domain}` 
          : `Не обнаружено соединение с ${domain}`
      });
    }

    // Third party trackers
    for (const tracker of profile.trackingInfra.thirdPartyTrackers) {
      const found = this.pageContext?.domains?.some(d => d.includes(tracker)) ?? false;
      signals.push({
        type: 'domain',
        name: tracker,
        found,
        severity: found ? 'medium' : 'low',
        description: found 
          ? `Сторонний трекер ${tracker} активен` 
          : `Трекер ${tracker} не обнаружен`
      });
    }

    return signals;
  }

  /**
   * Проверка скриптов
   */
  private checkScripts(profile: TargetProfile): DetectionSignal[] {
    const signals: DetectionSignal[] = [];

    for (const lib of profile.trackingInfra.jsLibraries) {
      const found = this.pageContext?.scripts?.some(s => s.includes(lib)) ?? false;
      signals.push({
        type: 'script',
        name: lib,
        found,
        severity: found ? 'critical' : 'low',
        description: found 
          ? `Обнаружен трекинг-скрипт ${lib}` 
          : `Скрипт ${lib} не загружен`
      });
    }

    return signals;
  }

  /**
   * Проверка fingerprint методов
   */
  private checkFingerprintMethods(profile: TargetProfile): DetectionSignal[] {
    const signals: DetectionSignal[] = [];
    const methods = profile.fingerprintMethods;

    if (methods.canvas && this.fingerprintData.canvas.supported) {
      signals.push({
        type: 'fingerprint',
        name: 'Canvas Fingerprinting',
        found: true,
        severity: 'high',
        description: `${profile.name} использует Canvas fingerprinting`
      });
    }

    if (methods.webgl && this.fingerprintData.webgl.supported) {
      signals.push({
        type: 'fingerprint',
        name: 'WebGL Fingerprinting',
        found: true,
        severity: 'high',
        description: `${profile.name} использует WebGL fingerprinting`
      });
    }

    if (methods.audio && this.fingerprintData.audio.supported) {
      signals.push({
        type: 'fingerprint',
        name: 'Audio Fingerprinting',
        found: true,
        severity: 'medium',
        description: `${profile.name} использует Audio fingerprinting`
      });
    }

    if (methods.fonts) {
      signals.push({
        type: 'fingerprint',
        name: 'Font Enumeration',
        found: true,
        severity: 'medium',
        description: `${profile.name} перечисляет шрифты`
      });
    }

    if (methods.battery && this.fingerprintData.battery.supported) {
      signals.push({
        type: 'fingerprint',
        name: 'Battery API',
        found: true,
        severity: 'medium',
        description: `${profile.name} использует Battery API`
      });
    }

    if (methods.behavioral) {
      signals.push({
        type: 'fingerprint',
        name: 'Behavioral Tracking',
        found: true,
        severity: 'high',
        description: `${profile.name} отслеживает поведение`
      });
    }

    return signals;
  }

  /**
   * Проверка storage keys
   */
  private checkStorageKeys(profile: TargetProfile): DetectionSignal[] {
    const signals: DetectionSignal[] = [];

    // Проверяем localStorage
    if (this.fingerprintData.storage.localStorage) {
      for (const key of profile.storageKeys.slice(0, 10)) {
        // Примечание: реальная проверка требует доступа к document.cookie
        signals.push({
          type: 'storage',
          name: key,
          found: false,
          severity: 'medium',
          description: `Ключ ${key} может использоваться ${profile.name}`
        });
      }
    }

    return signals;
  }

  /**
   * Генерация рекомендаций
   */
  private generateRecommendations(
    profile: TargetProfile, 
    signals: DetectionSignal[]
  ): string[] {
    const recommendations: string[] = [];

    // На основе профиля
    if (profile.countermeasures.useContainer) {
      recommendations.push(
        `Используйте Firefox Container для изоляции ${profile.name}`
      );
    }

    if (profile.countermeasures.blockDomains) {
      recommendations.push(
        `Заблокируйте домены: ${profile.trackingInfra.primaryDomains.slice(0, 3).join(', ')}`
      );
    }

    if (profile.countermeasures.clearCookies) {
      recommendations.push(
        `Регулярно очищайте cookies ${profile.name}`
      );
    }

    if (profile.countermeasures.spoofFingerprint) {
      recommendations.push(
        `Рассмотрите spoofing fingerprint для защиты от ${profile.name}`
      );
    }

    // На основе обнаруженных сигналов
    const criticalSignals = signals.filter(s => s.severity === 'critical' && s.found);
    if (criticalSignals.length > 0) {
      recommendations.push(
        `⚠️ Критические трекеры обнаружены: ${criticalSignals.map(s => s.name).join(', ')}`
      );
    }

    // Специфичные рекомендации
    switch (profile.id) {
      case 'aliexpress':
        recommendations.push(
          'AliExpress передаёт данные в Китай без согласия — используйте VPN'
        );
        recommendations.push(
          'Отключите WebRTC для предотвращения утечки IP'
        );
        break;
      case 'facebook':
        recommendations.push(
          'Установите Facebook Container (Mozilla) для изоляции'
        );
        recommendations.push(
          'Используйте uBlock Origin с фильтрами Facebook'
        );
        break;
      case 'google':
        recommendations.push(
          'Войдите в Google Account → Данные и конфиденциальность → Отключите отслеживание'
        );
        recommendations.push(
          'Используйте альтернативы: DuckDuckGo, Startpage'
        );
        break;
      case 'tiktok':
        recommendations.push(
          'TikTok требует обширных разрешений — ограничьте доступ'
        );
        recommendations.push(
          'Запретите доступ к буферу обмена и сенсорам'
        );
        break;
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Расчёт общего уровня риска
   */
  private calculateOverallRisk(
    totalScore: number, 
    results: TargetDetectionResult[]
  ): RiskLevel {
    const criticalCount = results.filter(r => r.profile.riskLevel === 'CRITICAL').length;
    const highScore = results.filter(r => r.riskScore >= 50).length;

    if (criticalCount >= 2 || totalScore >= 80) {
      return 'CRITICAL';
    }
    if (criticalCount >= 1 || highScore >= 2 || totalScore >= 50) {
      return 'HIGH';
    }
    if (totalScore >= 30) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}

/**
 * Функция-обёртка для удобного вызова
 */
export function detectTargetTracking(
  fingerprintData: FingerprintData,
  pageContext?: {
    domains: string[];
    scripts: string[];
    cookies: string[];
    localStorage: string[];
  }
): FullDetectionResult {
  const detector = new TargetDetector(fingerprintData, pageContext);
  return detector.detectAll();
}

/**
 * Быстрая проверка конкретного профиля
 */
export function quickDetect(
  fingerprintData: FingerprintData,
  profileId: string
): TargetDetectionResult | null {
  const profile = ALL_TARGET_PROFILES.find(p => p.id === profileId);
  if (!profile) return null;

  const detector = new TargetDetector(fingerprintData);
  return detector.detectProfile(profile);
}

/**
 * Получение описания уровня риска
 */
export function getRiskDescription(risk: RiskLevel): string {
  const descriptions: Record<RiskLevel, string> = {
    'LOW': 'Низкий риск — минимальный трекинг',
    'MEDIUM': 'Средний риск — умеренный трекинг',
    'HIGH': 'Высокий риск — активный трекинг',
    'CRITICAL': 'Критический риск — агрессивный трекинг'
  };
  return descriptions[risk];
}
