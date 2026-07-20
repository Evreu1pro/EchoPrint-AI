// ============================================================
// EchoPrint AI v2 — Uniqueness (updated global priors)
// ============================================================

import {
  calculateShannonEntropy,
  getEstimatedEntropy,
  entropyToUniquenessScore,
  estimatePopulationSize,
  calculateCombinedEntropy,
} from './entropy';
import type { FingerprintData, UniquenessAnalysis } from '../types';

function entropyTokenize(s: string): string[] {
  // Character n-grams keep Shannon useful for short hashes
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s[i] ?? '');
  return out.length ? out : ['∅'];
}

/** Approximate global frequencies (desktop-heavy web traffic, 2024–2026) */
const POPULAR_VALUES: Record<string, { value: string; frequency: number }[]> = {
  screen_resolution: [
    { value: '1920x1080', frequency: 0.22 },
    { value: '1366x768', frequency: 0.09 },
    { value: '1536x864', frequency: 0.08 },
    { value: '2560x1440', frequency: 0.07 },
    { value: '1440x900', frequency: 0.04 },
    { value: '1280x720', frequency: 0.03 },
    { value: '3840x2160', frequency: 0.04 },
    { value: '390x844', frequency: 0.03 },
    { value: '393x873', frequency: 0.025 },
    { value: '360x800', frequency: 0.03 },
    { value: '1512x982', frequency: 0.02 },
    { value: '1728x1117', frequency: 0.015 },
  ],
  hardware_concurrency: [
    { value: '8', frequency: 0.3 },
    { value: '4', frequency: 0.22 },
    { value: '12', frequency: 0.12 },
    { value: '16', frequency: 0.1 },
    { value: '6', frequency: 0.08 },
    { value: '10', frequency: 0.05 },
    { value: '2', frequency: 0.06 },
    { value: '20', frequency: 0.02 },
  ],
  device_memory: [
    { value: '8', frequency: 0.38 },
    { value: '4', frequency: 0.22 },
    { value: '16', frequency: 0.18 },
    { value: '32', frequency: 0.06 },
    { value: '2', frequency: 0.08 },
  ],
  timezone: [
    { value: 'America/New_York', frequency: 0.07 },
    { value: 'America/Chicago', frequency: 0.04 },
    { value: 'America/Los_Angeles', frequency: 0.05 },
    { value: 'Europe/London', frequency: 0.045 },
    { value: 'Europe/Paris', frequency: 0.03 },
    { value: 'Europe/Berlin', frequency: 0.03 },
    { value: 'Europe/Moscow', frequency: 0.025 },
    { value: 'Asia/Shanghai', frequency: 0.05 },
    { value: 'Asia/Tokyo', frequency: 0.035 },
    { value: 'Asia/Kolkata', frequency: 0.04 },
    { value: 'Asia/Singapore', frequency: 0.015 },
    { value: 'America/Sao_Paulo', frequency: 0.02 },
    { value: 'Australia/Sydney', frequency: 0.015 },
  ],
  platform: [
    { value: 'Win32', frequency: 0.55 },
    { value: 'MacIntel', frequency: 0.18 },
    { value: 'Linux x86_64', frequency: 0.06 },
    { value: 'Linux armv8l', frequency: 0.04 },
    { value: 'iPhone', frequency: 0.08 },
    { value: 'iPad', frequency: 0.02 },
  ],
  language: [
    { value: 'en-US', frequency: 0.32 },
    { value: 'en-GB', frequency: 0.05 },
    { value: 'zh-CN', frequency: 0.09 },
    { value: 'es-ES', frequency: 0.04 },
    { value: 'es-MX', frequency: 0.02 },
    { value: 'pt-BR', frequency: 0.03 },
    { value: 'de-DE', frequency: 0.035 },
    { value: 'fr-FR', frequency: 0.03 },
    { value: 'ja', frequency: 0.03 },
    { value: 'ja-JP', frequency: 0.02 },
    { value: 'ru-RU', frequency: 0.03 },
    { value: 'ko-KR', frequency: 0.02 },
    { value: 'hi-IN', frequency: 0.015 },
  ],
  color_depth: [
    { value: '24', frequency: 0.82 },
    { value: '30', frequency: 0.1 },
    { value: '32', frequency: 0.05 },
  ],
  pixel_ratio: [
    { value: '1', frequency: 0.35 },
    { value: '1.25', frequency: 0.12 },
    { value: '1.5', frequency: 0.12 },
    { value: '2', frequency: 0.28 },
    { value: '3', frequency: 0.08 },
    { value: '1.75', frequency: 0.02 },
  ],
};

function getValueFrequency(category: string, value: string): number {
  const distribution = POPULAR_VALUES[category];
  if (!distribution) return 0.012;
  const match = distribution.find((item) => item.value === String(value));
  return match ? match.frequency : 0.012;
}

function calculateRarity(frequency: number): number {
  return Math.round((1 - frequency) * 100);
}

export function analyzeUniqueness(data: FingerprintData): UniquenessAnalysis {
  const signals: { signal: string; value: unknown; frequency: number; rarity: number; category: string }[] = [];

  const push = (signal: string, value: unknown, category: string, freqKey?: string, freqValue?: string) => {
    const frequency = freqKey ? getValueFrequency(freqKey, freqValue ?? String(value)) : 0.02;
    signals.push({
      signal,
      value,
      frequency,
      rarity: calculateRarity(frequency),
      category,
    });
  };

  push(
    'screen_resolution',
    `${data.hardware.screen.width}x${data.hardware.screen.height}`,
    'hardware',
    'screen_resolution',
    `${data.hardware.screen.width}x${data.hardware.screen.height}`
  );
  push('hardware_concurrency', data.hardware.cpuCores, 'hardware', 'hardware_concurrency', String(data.hardware.cpuCores));
  if (data.hardware.memory != null) {
    push('device_memory', data.hardware.memory, 'hardware', 'device_memory', String(data.hardware.memory));
  }
  push('pixel_ratio', data.hardware.screen.pixelRatio, 'hardware', 'pixel_ratio', String(data.hardware.screen.pixelRatio));
  push('color_depth', data.hardware.screen.colorDepth, 'hardware', 'color_depth', String(data.hardware.screen.colorDepth));
  push('max_touch_points', data.hardware.maxTouchPoints, 'hardware');

  push('platform', data.navigator.platform, 'navigator', 'platform', data.navigator.platform);
  push('language', data.navigator.language, 'navigator', 'language', data.navigator.language);
  push('browser_name', data.parsedUA.browser.name, 'navigator');
  push('browser_version', data.parsedUA.browser.version, 'navigator');
  push('os_name', data.parsedUA.os.name, 'navigator');

  push('timezone', data.misc.timezone, 'locale', 'timezone', data.misc.timezone);
  push('canvas_text', data.canvas.textHash, 'canvas');
  push('canvas_geometry', data.canvas.geometryHash, 'canvas');
  push('canvas_emoji', data.canvas.emojiHash, 'canvas');
  push('webgl_vendor', data.webgl.vendor, 'webgl');
  push('webgl_renderer', data.webgl.renderer, 'webgl');
  push('webgl_extensions', data.webgl.extensions.length, 'webgl');
  push('audio_hash', data.audio.hash, 'audio');
  push('fonts_count', data.fonts.count, 'fonts');
  push('webrtc_ips', data.webrtc.localIPs.length, 'network');
  if (data.fpjs?.visitorId) {
    push('fpjs_visitor_id', data.fpjs.visitorId, 'composite');
  }

  // Combined estimated entropy from known signal budgets + rarity prior
  const signalEntropies = signals.map((s) => {
    const base = getEstimatedEntropy(s.signal);
    // Rare values contribute more bits (inverse frequency, soft-capped)
    const rarityBoost = Math.min(8, -Math.log2(Math.max(s.frequency, 0.001)));
    return base * 0.55 + rarityBoost * 0.45;
  });
  const bitsOfEntropy = calculateCombinedEntropy(
    signalEntropies,
    signals.map(() => 0.28)
  );
  const shannonChars = calculateShannonEntropy(
    entropyTokenize(signals.map((s) => String(s.value)).join('|'))
  );
  const combinedBits = Math.max(bitsOfEntropy, shannonChars * 4);
  const overallScore = entropyToUniquenessScore(combinedBits);

  const sorted = [...signals].sort((a, b) => b.rarity - a.rarity);
  const rarestSignals = sorted.slice(0, 5).map((s) => ({
    signal: s.signal,
    rarity: s.rarity,
    value: s.value,
  }));
  const commonSignals = [...signals]
    .sort((a, b) => a.rarity - b.rarity)
    .slice(0, 5)
    .map((s) => ({ signal: s.signal, rarity: s.rarity, value: s.value }));

  const categoryScores: Record<string, number> = {};
  const byCat = new Map<string, number[]>();
  for (const s of signals) {
    const arr = byCat.get(s.category) || [];
    arr.push(s.rarity);
    byCat.set(s.category, arr);
  }
  for (const [cat, vals] of byCat) {
    categoryScores[cat] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  return {
    overallScore,
    entropy: combinedBits,
    bitsOfEntropy: combinedBits,
    rarestSignals,
    commonSignals,
    categoryScores,
  };
}

export function interpretUniquenessScore(score: number): {
  level: string;
  description: string;
  populationEstimate: string;
} {
  // score is 0-100 uniqueness; map roughly to bits for population sketch
  const approxBits = (score / 100) * 33;
  const pop = `~1 in ${Math.max(2, Math.round(estimatePopulationSize(Math.max(1, approxBits)))).toLocaleString('en-US')}`;
  if (score >= 85) {
    return {
      level: 'Extremely unique',
      description: 'Your fingerprint combination is rare — easy to re-identify across sites.',
      populationEstimate: pop,
    };
  }
  if (score >= 70) {
    return {
      level: 'Highly unique',
      description: 'Several uncommon traits stand out. Trackers can likely isolate you.',
      populationEstimate: pop,
    };
  }
  if (score >= 50) {
    return {
      level: 'Moderately unique',
      description: 'Mixed common and rare traits. Partial re-identification is realistic.',
      populationEstimate: pop,
    };
  }
  if (score >= 30) {
    return {
      level: 'Mostly common',
      description: 'You blend into a large cohort — better for privacy by default.',
      populationEstimate: pop,
    };
  }
  return {
    level: 'Very common',
    description: 'Mass-market configuration. Harder to single out via passive fingerprinting alone.',
    populationEstimate: pop,
  };
}
