// ============================================================
// EchoPrint AI v2.1 — Analysis orchestrator + report
// Weights tracking surface heavily (stock Chrome ≠ hardened)
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
import {
  analyzeTrackingPosture,
  type TrackingPostureReport,
} from '../engine/tracking-posture';

export type FullAnalysisResult = AnalysisResult & {
  deviceProfile: DeviceProfile;
  deviceAwareAnalysis: DeviceAwareAnalysis;
  integrity: IntegrityReport;
  exposure: ExposureReport;
  tracking: TrackingPostureReport;
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
  trackingSurface: number,
  protectionScore: number
): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  // Tracking surface dominates: stock Chrome with common fingerprint is still HIGH risk
  const risk = trackingSurface * 0.55 + uniquenessScore * 0.3 + (100 - protectionScore) * 0.15;

  if (risk >= 72) return 'very_high';
  if (risk >= 55) return 'high';
  if (risk >= 38) return 'medium';
  if (risk >= 22) return 'low';
  return 'very_low';
}

function getTrackabilityLevel(
  uniquenessScore: number,
  trackingSurface: number
): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  // Blend: common but wide-open Chrome is still highly trackable via ads graph
  const t = uniquenessScore * 0.4 + trackingSurface * 0.6;
  if (t >= 75) return 'very_high';
  if (t >= 58) return 'high';
  if (t >= 40) return 'medium';
  if (t >= 25) return 'low';
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
  exposure: ExposureReport,
  tracking: TrackingPostureReport
): AIReport {
  const u = interpretUniquenessScore(uniqueness.overallScore);
  const c = interpretConsistencyScore(consistency.overallScore);
  const a = interpretAnomalyScore(anomaly.overallScore);

  let summary = `${data.parsedUA.browser.name} ${data.parsedUA.browser.version} on ${data.parsedUA.os.name}. `;
  summary += `Protection: ${tracking.protectionLevel} (${tracking.protectionScore}/100). `;
  summary += `Ad/tracking surface: ${tracking.trackingSurfaceScore}/100. `;
  summary += `Uniqueness ${uniqueness.overallScore}/100 — note: a “common” Chrome can still overshare to ads. `;
  summary += tracking.vsStockChrome;

  let uniquenessAssessment = `${u.level}. ${u.description} `;
  if (uniqueness.rarestSignals[0]) {
    uniquenessAssessment += `Rarest signal: ${formatSignalName(uniqueness.rarestSignals[0].signal)} (rarity ${uniqueness.rarestSignals[0].rarity}%). `;
  }
  uniquenessAssessment +=
    'Uniqueness alone is not privacy: stock Chrome often looks common yet exposes Topics, CH, WebGL, and more.';

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
  anomalyAssessment += ` ${tracking.summary}`;
  if (!integrity.canvasStable) {
    anomalyAssessment += ' Canvas hashes unstable across samples (noise injection).';
  }

  const openCritical = tracking.adApis.filter(
    (p) => p.status === 'open' && p.severity === 'critical'
  );
  if (openCritical.length) {
    anomalyAssessment += ` Open critical surfaces: ${openCritical.map((p) => p.name).join(', ')}.`;
  }

  const recommendations = [
    ...tracking.recommendations,
    ...exposure.recommendations.slice(0, 2),
    ...generateRecommendations(data, uniqueness, consistency, anomaly, integrity, tracking),
  ].slice(0, 10);

  const privacyTips = generatePrivacyTips(data, uniqueness, integrity, exposure, tracking);

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
  integrity: IntegrityReport,
  tracking: TrackingPostureReport
): string[] {
  const out: string[] = [];

  if (tracking.browserProfile === 'stock_chrome' && tracking.protectionScore < 45) {
    out.push(
      'This looks like stock Chrome (wide ad + fingerprint surface). Max browser protection elsewhere should score higher protection and block more tracker scripts.'
    );
  }
  if (tracking.blockedNetworkCount === 0 && tracking.networkProbes.length > 0) {
    out.push('Tracker scripts loaded successfully — no effective ad-block/ETP on this profile.');
  }
  if (tracking.blockedNetworkCount >= 3) {
    out.push(
      `${tracking.blockedNetworkCount} major tracker endpoints blocked — good network layer protection.`
    );
  }
  if (uniqueness.overallScore >= 80) {
    out.push('Fingerprint is highly unique — privacy browser or fewer fonts helps.');
  }
  if (integrity.spoofProbability > 0.45) {
    out.push('Spoof/anti-detect signals present — sites may challenge you.');
  }
  if (anomaly.automationProbability > 0.5 || data.navigator.webdriver) {
    out.push('Automation markers present.');
  }
  if (data.webrtc.localIPs.length > 0 || data.webrtc.publicIP) {
    out.push('WebRTC IP candidates observed — enable WebRTC protection.');
  }
  if (consistency.criticalIssues?.length) {
    out.push('Critical consistency failures often mean incomplete spoofing.');
  }
  void integrity;
  return out;
}

function generatePrivacyTips(
  data: FingerprintData,
  uniqueness: ReturnType<typeof analyzeUniqueness>,
  integrity: IntegrityReport,
  exposure: ExposureReport,
  tracking: TrackingPostureReport
): string[] {
  const tips = [
    'Compare scans: stock Chrome vs Firefox Strict / Brave should differ mainly in Tracking surface & blocked scripts — not only uniqueness.',
    'Enable strict tracking protection + uBlock Origin (or Brave shields).',
    'Keep language, timezone, and VPN region aligned.',
  ];
  if (tracking.trackingSurfaceScore > 55) {
    tips.push('Disable ad privacy / Privacy Sandbox features in browser settings when possible.');
  }
  if (exposure.exposedCount > 8) {
    tips.push('Many fingerprint APIs are open — a hardened browser closes several at once.');
  }
  if (!integrity.canvasStable) {
    tips.push('Canvas noise is detectable; prefer browsers that standardize rendering.');
  }
  if (data.parsedUA.browser.name === 'Firefox') {
    tips.push('Firefox: ETP Strict + resistFingerprinting + letterboxing.');
  }
  if (uniqueness.overallScore > 65) {
    tips.push('Rare fonts/screens increase uniqueness on top of ad tracking.');
  }
  tips.push('Tor Browser for strongest anonymity (trade-offs on speed and compatibility).');
  return tips.slice(0, 7);
}

/**
 * Full async analysis
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
  const tracking = await analyzeTrackingPosture({ runNetworkProbes: true });

  // Merge tracking surface into exposure score for UI consistency
  const blendedExposureScore = Math.round(
    exposure.exposureScore * 0.35 + tracking.trackingSurfaceScore * 0.65
  );
  const exposureMerged: ExposureReport = {
    ...exposure,
    exposureScore: blendedExposureScore,
    overallRisk:
      blendedExposureScore >= 75
        ? 'CRITICAL'
        : blendedExposureScore >= 55
          ? 'HIGH'
          : blendedExposureScore >= 35
            ? 'MEDIUM'
            : 'LOW',
    recommendations: [...tracking.recommendations.slice(0, 3), ...exposure.recommendations].slice(
      0,
      6
    ),
  };

  const blendedAnomalyScore = Math.round(anomaly.overallScore * 0.55 + integrity.score * 0.45);

  // Overall privacy posture: protection-heavy (not uniqueness-heavy)
  const overallScore = Math.round(
    tracking.protectionScore * 0.4 +
      (100 - tracking.trackingSurfaceScore) * 0.25 +
      (100 - uniqueness.overallScore) * 0.12 +
      consistency.overallScore * 0.1 +
      integrity.score * 0.13
  );

  const privacyRiskLevel = getPrivacyRiskLevel(
    uniqueness.overallScore,
    tracking.trackingSurfaceScore,
    tracking.protectionScore
  );

  const trackabilityLevel = getTrackabilityLevel(
    uniqueness.overallScore,
    tracking.trackingSurfaceScore
  );

  const aiReport = generateAIReport(
    data,
    uniqueness,
    consistency,
    anomaly,
    integrity,
    exposureMerged,
    tracking
  );

  const enhancedAiReport: AIReport = {
    ...aiReport,
    recommendations: [
      ...tracking.recommendations.slice(0, 3),
      ...deviceAwareAnalysis.recommendations.slice(0, 1).map(
        (r) => `[${r.priority.toUpperCase()}] ${r.title}: ${r.description}`
      ),
      ...aiReport.recommendations,
    ].slice(0, 10),
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
    exposure: exposureMerged,
    tracking,
    targetDetection: {
      results: [],
      overallRisk: exposureMerged.overallRisk,
      totalRiskScore: exposureMerged.exposureScore,
      criticalTargets: [],
      allSignals: [],
      exposure: exposureMerged,
    },
  };
}

export function getRiskLevelDescription(level: string): string {
  const descriptions: Record<string, string> = {
    very_low: 'Very low risk — strong protections and limited tracking surface',
    low: 'Low risk — tracking limited without logins',
    medium: 'Medium risk — partial re-identification / ad APIs open',
    high: 'High risk — wide ad or fingerprint surface (typical stock Chrome)',
    very_high: 'Very high risk — unique traits and/or fully open deep tracking APIs',
  };
  return descriptions[level] || 'Unknown';
}
