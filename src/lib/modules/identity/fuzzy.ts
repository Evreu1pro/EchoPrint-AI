// ============================================================
// Fuzzy device identity
// ------------------------------------------------------------
// The old model hashed every hardware signal into a single stable_id and
// compared it with `===`. That is brittle in exactly the wrong direction:
// a GPU driver update changes the canvas/WebGL hashes, the whole id flips,
// and EchoPrint reports "different device" at the very moment a real
// tracker would still recognise the user.
//
// Instead we keep the individual components and score their similarity.
// Losing 1 of 13 components is a driver update; losing 10 is a new machine.
//
// This file is intentionally dependency-free and pure so it can be unit
// tested without a DOM.
// ============================================================

export interface FingerprintComponents {
  canvas: string;
  webglRenderer: string;
  webglTriangle: string;
  webglParams: string;
  webgpu: string;
  audio: string;
  fonts: string;
  screen: string;
  math: string;
  platform: string;
  voices: string;
  css: string;
  intl: string;
}

export type ComponentKey = keyof FingerprintComponents;

/**
 * Relative trust of each component. The GPU renderer string is the single
 * strongest hardware tell; Math/JS engine output is nearly identical across
 * a whole browser family and barely counts.
 */
export const COMPONENT_WEIGHTS: Record<ComponentKey, number> = {
  webglRenderer: 3,
  canvas: 2.5,
  webglTriangle: 2,
  audio: 2,
  fonts: 2,
  screen: 1.5,
  platform: 1.5,
  voices: 1.2,
  webglParams: 1,
  intl: 0.8,
  webgpu: 0.8,
  css: 0.6,
  math: 0.6,
};

/**
 * Components that survive a browser switch on the same machine. Canvas,
 * WebGL rendering and audio DSP all differ between Chrome and Firefox on
 * identical hardware, so they are deliberately excluded here.
 */
export const DEVICE_LEVEL_KEYS: ComponentKey[] = [
  'fonts',
  'screen',
  'platform',
  'voices',
  'intl',
  'webglRenderer',
];

/** Values that mean "we could not measure this", not "this is the value". */
const UNUSABLE = new Set([
  '',
  'none',
  'error',
  'no_ctx',
  'unsupported',
  'unavailable',
  'unknown',
  'randomized',
]);

function usable(value: string | undefined | null): boolean {
  if (value == null) return false;
  return !UNUSABLE.has(value.trim().toLowerCase());
}

export interface SimilarityResult {
  /** 0..1 weighted share of comparable components that matched. */
  score: number;
  matched: ComponentKey[];
  changed: ComponentKey[];
  /** Not comparable in one or both snapshots (unsupported / randomized). */
  skipped: ComponentKey[];
  /** Total weight that actually took part in the comparison. */
  weightCompared: number;
}

/**
 * Weighted similarity between two component vectors.
 * Components that are unmeasurable on either side are skipped entirely
 * rather than counted as a mismatch — otherwise Brave's randomized audio
 * would drag every comparison down.
 */
export function componentSimilarity(
  a: Partial<FingerprintComponents>,
  b: Partial<FingerprintComponents>
): SimilarityResult {
  const matched: ComponentKey[] = [];
  const changed: ComponentKey[] = [];
  const skipped: ComponentKey[] = [];

  let weightCompared = 0;
  let weightMatched = 0;

  for (const key of Object.keys(COMPONENT_WEIGHTS) as ComponentKey[]) {
    const left = a[key];
    const right = b[key];
    if (!usable(left) || !usable(right)) {
      skipped.push(key);
      continue;
    }
    const weight = COMPONENT_WEIGHTS[key];
    weightCompared += weight;
    if (left === right) {
      weightMatched += weight;
      matched.push(key);
    } else {
      changed.push(key);
    }
  }

  const score = weightCompared === 0 ? 0 : weightMatched / weightCompared;
  return {
    score: Math.round(score * 1000) / 1000,
    matched,
    changed,
    skipped,
    weightCompared: Math.round(weightCompared * 100) / 100,
  };
}

export type IdentityVerdict =
  | 'same_device'
  | 'same_device_drifted'
  | 'uncertain'
  | 'different_device'
  | 'no_baseline';

export interface IdentityMatch {
  verdict: IdentityVerdict;
  similarity: number;
  changed: ComponentKey[];
  skipped: ComponentKey[];
  message: string;
}

function describeChanges(changed: ComponentKey[]): string {
  if (changed.length === 0) return 'every comparable component is identical';
  return `changed: ${changed.join(', ')}`;
}

/**
 * Turn a similarity score into a human verdict.
 * Thresholds are deliberately generous on the "still you" side, because the
 * whole point of the demo is that small hardware drift does not save you.
 */
export function classifyIdentity(sim: SimilarityResult): IdentityMatch {
  const pct = Math.round(sim.score * 100);

  if (sim.weightCompared === 0) {
    return {
      verdict: 'no_baseline',
      similarity: 0,
      changed: sim.changed,
      skipped: sim.skipped,
      message: 'Not enough comparable signals to decide.',
    };
  }

  if (sim.score >= 0.9) {
    return {
      verdict: 'same_device',
      similarity: sim.score,
      changed: sim.changed,
      skipped: sim.skipped,
      message: `Same device — ${pct}% of weighted signals match (${describeChanges(sim.changed)}).`,
    };
  }

  if (sim.score >= 0.65) {
    return {
      verdict: 'same_device_drifted',
      similarity: sim.score,
      changed: sim.changed,
      skipped: sim.skipped,
      message:
        `Still the same device (${pct}% match), but some signals drifted — ` +
        `${describeChanges(sim.changed)}. A driver, browser or OS update looks like this. ` +
        'A strict hash comparison would have lost you here; a real tracker does not.',
    };
  }

  if (sim.score >= 0.4) {
    return {
      verdict: 'uncertain',
      similarity: sim.score,
      changed: sim.changed,
      skipped: sim.skipped,
      message: `Ambiguous: only ${pct}% of signals match (${describeChanges(sim.changed)}).`,
    };
  }

  return {
    verdict: 'different_device',
    similarity: sim.score,
    changed: sim.changed,
    skipped: sim.skipped,
    message: `Different device — only ${pct}% of weighted signals match.`,
  };
}

/**
 * Strip driver noise from a WebGL renderer string so the same GPU reads the
 * same way across browsers.
 *
 *   "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
 *   -> "nvidia geforce rtx 3060"
 */
export function normalizeGpuModel(renderer: string): string {
  if (!renderer) return '';
  let value = renderer.toLowerCase().trim();
  if (UNUSABLE.has(value)) return '';

  const angle = /^angle\s*\((.*)\)$/.exec(value);
  if (angle?.[1]) {
    const parts = angle[1].split(',').map((p) => p.trim());
    // The middle segment carries the actual adapter name.
    value = parts.sort((a, b) => b.length - a.length)[0] ?? angle[1];
  }

  value = value
    .replace(/direct3d\d*/g, ' ')
    .replace(/\bd3d\d*\b/g, ' ')
    .replace(/\bvs_\d+_\d+\b/g, ' ')
    .replace(/\bps_\d+_\d+\b/g, ' ')
    .replace(/opengl engine/g, ' ')
    .replace(/metal|vulkan/g, ' ')
    .replace(/\(0x[0-9a-f]+\)/g, ' ')
    .replace(/\bv?\d+\.\d+(\.\d+)*\b/g, ' ')
    .replace(/[()\[\]/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return value;
}

/**
 * Pick only the components that survive a browser switch.
 * The WebGL renderer is normalized first, because Chrome reports it wrapped
 * in ANGLE(...) while Firefox does not — the raw strings differ even though
 * the physical GPU is the same.
 */
export function deviceLevelComponents(
  components: Partial<FingerprintComponents>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of DEVICE_LEVEL_KEYS) {
    const value = components[key];
    if (!usable(value)) continue;
    out[key] = key === 'webglRenderer' ? normalizeGpuModel(value as string) : (value as string);
  }
  return out;
}
