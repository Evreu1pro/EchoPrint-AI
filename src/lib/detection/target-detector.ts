// ============================================================
// Legacy adapter — real logic lives in engine/exposure.ts
// Old "detect AliExpress because Canvas exists" behavior removed.
// ============================================================

import type { FingerprintData } from '../types';
import {
  analyzeExposure,
  collectPageArtifacts,
  type ExposureReport,
  type RiskLevel,
} from '../engine/exposure';
import type { TargetProfile } from '../targets/profiles';

export type { RiskLevel };

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
  exposure: ExposureReport;
}

/**
 * @deprecated Prefer analyzeExposure() directly.
 * Returns live page hits only — never invents trackers from bare API support.
 */
export function detectTargetTracking(data: FingerprintData): FullDetectionResult {
  const exposure = analyzeExposure(data, collectPageArtifacts());

  const results: TargetDetectionResult[] = exposure.liveHits.map((hit) => ({
    profile: {
      id: hit.tracker.id,
      name: hit.tracker.name,
      description: hit.tracker.notes,
      riskLevel: hit.tracker.riskLevel,
      category: hit.tracker.category === 'cdn' ? 'analytics' : hit.tracker.category,
      trackingInfra: {
        primaryDomains: hit.tracker.domains,
        thirdPartyTrackers: [],
        jsLibraries: [],
      },
      fingerprintMethods: {
        canvas: hit.tracker.fingerprintVectors.includes('canvas'),
        webgl: hit.tracker.fingerprintVectors.includes('webgl'),
        audio: hit.tracker.fingerprintVectors.includes('audio'),
        fonts: hit.tracker.fingerprintVectors.includes('fonts'),
        sensors: hit.tracker.fingerprintVectors.includes('sensors'),
        battery: hit.tracker.fingerprintVectors.includes('battery'),
        webrtc: hit.tracker.fingerprintVectors.includes('webrtc'),
        behavioral: hit.tracker.fingerprintVectors.includes('behavioral'),
      },
      storageKeys: [],
      apiEndpoints: [],
      detectionTriggers: [],
      knownVulnerabilities: [],
      countermeasures: {
        blockDomains: true,
        spoofFingerprint: false,
        clearCookies: true,
        useContainer: true,
      },
    },
    detected: true,
    confidence: hit.confidence,
    signals: hit.matched.map((m) => ({
      type: m.type === 'storage' ? 'storage' : m.type === 'cookie' ? 'cookie' : m.type === 'script' ? 'script' : 'domain',
      name: m.value,
      found: true,
      severity: hit.tracker.riskLevel === 'CRITICAL' ? 'critical' : 'high',
      description: `Matched ${m.type}: ${m.value}`,
    })),
    riskScore: hit.riskScore,
    recommendations: exposure.recommendations,
  }));

  return {
    results,
    overallRisk: exposure.overallRisk,
    totalRiskScore: exposure.exposureScore,
    criticalTargets: results
      .filter((r) => r.profile.riskLevel === 'CRITICAL')
      .map((r) => r.profile),
    allSignals: results.flatMap((r) => r.signals),
    exposure,
  };
}

export class TargetDetector {
  constructor(
    private fingerprintData: FingerprintData,
    private pageContext?: {
      domains: string[];
      scripts: string[];
      cookies: string[];
      localStorage: string[];
    }
  ) {}

  detectAll(): FullDetectionResult {
    return detectTargetTracking(this.fingerprintData);
  }
}
