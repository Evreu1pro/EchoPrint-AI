// ============================================================
// EchoPrint AI v2 — Analysis orchestrator + report (EN primary)
// ============================================================

import type { FingerprintData, AnalysisResult, AIReport } from '../types';
import { analyzeUniqueness, interpretUniquenessScore } from './uniqueness';
import { analyzeConsistency, interpretConsistencyScore } from './consistency';
import { analyzeAnomalies, interpretAnomalyScore } from './anomaly';
import { detectDevice, type DeviceProfile } from '../fingerprint/device-detector';
import {
  generateDeviceAwareAnalysis,
  type DeviceAwareAnalysis,
} from './device-aware-recommendations';
import { analyzeIntegrity, type IntegrityReport } from '../engine/integrity';
import {
  analyzeExposure,
  collectPageArtifacts,
  type ExposureReport,
} from '../engine/exposure';

export type FullAnalysisResult = AnalysisResult & {
  deviceProfile: DeviceProfile;
  deviceAwareAnalysis: DeviceAwareAnalysis;
  integrity: IntegrityReport;
  exposure: ExposureReport;
  /** @deprecated use exposure — kept for UI compatibility */
  targetDetection: {
    results: never[];
    overallRisk: ExposureReport['overallRisk'];
    totalRiskScore: number;
    criticalTargets: never[];
    allSignals: never[];
    exposure: ExposureReport;
  };
};

function getPrivacyRiskLevel(
  uniquenessScore: number,
  consistencyScore: number,
  integrityScore: number,
  exposureScore: number
): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  // High uniqueness + high integrity (native) = easy to track
  // Low integrity may mean spoof/privacy tools (harder passive tracking, but detectable)
  const trackEase = uniquenessScore * 0.45 + (100 - exposureScore) * -0.1 + integrityScore * 0.15;
  const risk = uniquenessScore * 0.5 + exposureScore * 0.35 + (100 - consistencyScore) * 0.15;

  if (risk >= 75 && uniquenessScore >= 70) return 'very_high';
  if (risk >= 60) return 'high';
  if (risk >= 40) return 'medium';
  if (risk >= 25) return 'low';
  void trackEase;
  return 'very_low';
}

function getTrackabilityLevel(uniquenessScore: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  if (uniquenessScore >= 85) return 'very_high';
  if (uniquenessScore >= 70) return 'high';
  if (uniquenessScore >= 50) return 'medium';
  if (uniquenessScore >= 30) return 'low';
  return 'very_low';
}

function formatSignalName(signal: string): string {
  return signal.replace(/_/g, ' ');
}

function generateAIReport(
  data: FingerprintData,
  uniqueness: ReturnType<typeof analyzeUniqueness>,
  consistency: ReturnType<typeof analyzeConsistency>,
  anomaly: ReturnType<typeof analyzeAnomalies>,
  integrity: IntegrityReport,
  exposure: ExposureReport
): AIReport {
  const u = interpretUniquenessScore(uniqueness.overallScore);
  const c = interpretConsistencyScore(consistency.overallScore);
  const a = interpretAnomalyScore(anomaly.overallScore);

  let summary = `${data.parsedUA.browser.name} ${data.parsedUA.browser.version} on ${data.parsedUA.os.name}. `;
  summary += `Uniqueness ${uniqueness.overallScore}/100 (${u.level}). `;
  summary += `Integrity ${integrity.score}/100 — ${integrity.summary} `;
  summary += `Exposure risk ${exposure.exposureScore}/100 (${exposure.overallRisk}).`;

  let uniquenessAssessment = `${u.level}. ${u.description} `;
  if (uniqueness.rarestSignals[0]) {
    uniquenessAssessment += `Rarest signal: ${formatSignalName(uniqueness.rarestSignals[0].signal)} (rarity ${uniqueness.rarestSignals[0].rarity}%). `;
  }
  uniquenessAssessment += `Population sketch: ${u.populationEstimate}.`;

  let consistencyAssessment = `${c.level}. ${c.description} `;
  const failed = consistency.rules.filter((r) => !r.passed);
  if (failed.length) {
    consistencyAssessment += `${failed.length} failed checks. `;
    const critical = failed.filter((r) => r.severity === 'critical' || r.severity === 'high');
    if (critical.length) {
      consistencyAssessment += `High severity: ${critical.map((r) => r.name).join(', ')}.`;
    }
  } else {
    consistencyAssessment += 'All consistency rules passed.';
  }

  let anomalyAssessment = `${a.level}. ${a.description} `;
  if (integrity.findings.length) {
    anomalyAssessment += `Integrity findings: ${integrity.findings
      .slice(0, 3)
      .map((f) => f.title)
      .join('; ')}.`;
  }
  if (!integrity.canvasStable) {
    anomalyAssessment += ' Canvas hashes unstable across samples (noise injection).';
  }

  const recommendations = [
    ...exposure.recommendations,
    ...generateRecommendations(data, uniqueness, consistency, anomaly, integrity),
  ].slice(0, 8);

  const privacyTips = generatePrivacyTips(data, uniqueness, integrity, exposure);

  return {
    summary,
    uniquenessAssessment,
    consistencyAssessment,
    anomalyAssessment,
    recommendations,
    privacyTips,
  };
}

function generateRecommendations(
  data: FingerprintData,
  uniqueness: ReturnType<typeof analyzeUniqueness>,
  consistency: ReturnType<typeof analyzeConsistency>,
  anomaly: ReturnType<typeof analyzeAnomalies>,
  integrity: IntegrityReport
): string[] {
  const out: string[] = [];

  if (uniqueness.overallScore >= 80) {
    out.push('Your fingerprint is highly unique — use a privacy-focused browser or reduce custom fonts/plugins.');
  }
  if (integrity.spoofProbability > 0.45) {
    out.push('Integrity engine sees spoof/anti-detect signals. Sites may flag you even if uniqueness is low.');
  }
  if (integrity.privacyToolProbability > 0.4) {
    out.push('Privacy hardening detected — good for anonymity; some sites may show CAPTCHAs.');
  }
  if (anomaly.automationProbability > 0.5 || data.navigator.webdriver) {
    out.push('Automation markers present — expect bot challenges on protected sites.');
  }
  if (data.webrtc.localIPs.length > 0 || data.webrtc.publicIP) {
    out.push('WebRTC exposed IP candidates — enable WebRTC protection in browser or VPN.');
  }
  if (data.fonts.count > 120) {
    out.push('Large installed font set increases desktop uniqueness.');
  }
  if (consistency.criticalIssues?.length) {
    out.push('Critical consistency failures often mean UA spoofing without matching GPU/touch.');
  }
  if (data.parsedUA.browser.name === 'Chrome') {
    out.push('Chromium exposes rich Client Hints + WebGL — consider Firefox, Brave, or Mullvad Browser for lower surface.');
  }

  return out;
}

function generatePrivacyTips(
  data: FingerprintData,
  uniqueness: ReturnType<typeof analyzeUniqueness>,
  integrity: IntegrityReport,
  exposure: ExposureReport
): string[] {
  const tips = [
    'Prefer strict tracking protection and total cookie protection (or site containers).',
    'Keep language, timezone, and VPN region aligned to avoid looking spoofed.',
    'Update the browser regularly — fingerprint mitigations improve over time.',
  ];
  if (uniqueness.overallScore > 65) {
    tips.push('Avoid rare screen scales and custom fonts if you want to blend in.');
  }
  if (exposure.exposedCount > 8) {
    tips.push('Many fingerprint APIs are available — a hardened browser reduces the set at once.');
  }
  if (!integrity.canvasStable) {
    tips.push('Canvas noise can help against static IDs but itself is a detectable signal.');
  }
  if (data.parsedUA.browser.name === 'Firefox') {
    tips.push('Firefox: privacy.resistFingerprinting and letterboxing reduce cross-site linkability.');
  }
  tips.push('Tor Browser remains the gold standard for anonymity (slower, some site breakage).');
  return tips.slice(0, 6);
}

/**
 * Full async analysis (integrity needs multi-sample delays)
 */
export async function analyzeFingerprint(data: FingerprintData): Promise<FullAnalysisResult> {
  const deviceProfile = detectDevice(
    data.navigator.userAgent,
    data.navigator.platform,
    data.navigator.vendor,
    {
      width: data.hardware.screen.width,
      height: data.hardware.screen.height,
      pixelRatio: data.hardware.screen.pixelRatio,
    },
    data.hardware,
    data.navigator
  );

  const deviceAwareAnalysis = generateDeviceAwareAnalysis(data, deviceProfile);
  const uniqueness = analyzeUniqueness(data);
  const consistency = analyzeConsistency(data);
  const anomaly = analyzeAnomalies(data);
  const integrity = await analyzeIntegrity(data);
  const exposure = analyzeExposure(data, collectPageArtifacts());

  // Blend anomaly with integrity (lower integrity → lower anomaly "clean" score)
  const blendedAnomalyScore = Math.round(anomaly.overallScore * 0.55 + integrity.score * 0.45);

  const overallScore = Math.round(
    (100 - uniqueness.overallScore) * 0.28 + // lower uniqueness better for privacy posture
      consistency.overallScore * 0.22 +
      integrity.score * 0.28 +
      (100 - exposure.exposureScore) * 0.22
  );

  const privacyRiskLevel = getPrivacyRiskLevel(
    uniqueness.overallScore,
    consistency.overallScore,
    integrity.score,
    exposure.exposureScore
  );

  const trackabilityLevel = getTrackabilityLevel(uniqueness.overallScore);

  const aiReport = generateAIReport(data, uniqueness, consistency, anomaly, integrity, exposure);

  const enhancedAiReport: AIReport = {
    ...aiReport,
    recommendations: [
      ...deviceAwareAnalysis.recommendations.slice(0, 2).map(
        (r) => `[${r.priority.toUpperCase()}] ${r.title}: ${r.description}`
      ),
      ...aiReport.recommendations,
    ].slice(0, 8),
  };

  return {
    uniqueness,
    consistency,
    anomaly: {
      ...anomaly,
      overallScore: blendedAnomalyScore,
    },
    overallScore: Math.max(0, Math.min(100, overallScore)),
    privacyRiskLevel,
    trackabilityLevel,
    aiReport: enhancedAiReport,
    deviceProfile,
    deviceAwareAnalysis,
    integrity,
    exposure,
    targetDetection: {
      results: [],
      overallRisk: exposure.overallRisk,
      totalRiskScore: exposure.exposureScore,
      criticalTargets: [],
      allSignals: [],
      exposure,
    },
  };
}

export function getRiskLevelDescription(level: string): string {
  const descriptions: Record<string, string> = {
    very_low: 'Very low risk — hard to single out via passive fingerprinting alone',
    low: 'Low risk — tracking is limited without logins or cross-site cookies',
    medium: 'Medium risk — partial re-identification is realistic',
    high: 'High risk — fingerprint is distinctive and APIs are exposed',
    very_high: 'Very high risk — unique traits + rich exposure surface',
  };
  return descriptions[level] || 'Unknown';
}
