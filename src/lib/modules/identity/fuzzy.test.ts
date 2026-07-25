import { describe, it, expect } from 'vitest';
import {
  classifyIdentity,
  componentSimilarity,
  deviceLevelComponents,
  normalizeGpuModel,
  type FingerprintComponents,
} from './fuzzy';

const base: FingerprintComponents = {
  canvas: 'c1',
  webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  webglTriangle: 't1',
  webglParams: 'p1',
  webgpu: 'g1',
  audio: 'a1',
  fonts: 'f1',
  screen: 's1',
  math: 'm1',
  platform: 'pl1',
  voices: 'v1',
  css: 'css1',
  intl: 'i1',
};

describe('componentSimilarity', () => {
  it('scores identical vectors as a perfect match', () => {
    const sim = componentSimilarity(base, base);
    expect(sim.score).toBe(1);
    expect(sim.changed).toEqual([]);
    expect(classifyIdentity(sim).verdict).toBe('same_device');
  });

  it('treats a driver update as the same device, not a new one', () => {
    // A GPU driver update perturbs the rendering hashes but nothing else.
    const drifted = { ...base, canvas: 'c2', webglTriangle: 't2' };
    const sim = componentSimilarity(base, drifted);
    const match = classifyIdentity(sim);

    expect(sim.changed).toEqual(['canvas', 'webglTriangle']);
    expect(match.verdict).toBe('same_device_drifted');
    // The old strict-equality model would have reported a different device.
    expect(sim.score).toBeLessThan(1);
    expect(sim.score).toBeGreaterThan(0.65);
  });

  it('detects a genuinely different machine', () => {
    const other: FingerprintComponents = {
      canvas: 'x',
      webglRenderer: 'ANGLE (Intel, Intel UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      webglTriangle: 'x',
      webglParams: 'x',
      webgpu: 'x',
      audio: 'x',
      fonts: 'x',
      screen: 'x',
      math: 'x',
      platform: 'x',
      voices: 'x',
      css: 'x',
      intl: 'x',
    };
    const sim = componentSimilarity(base, other);
    expect(sim.score).toBe(0);
    expect(classifyIdentity(sim).verdict).toBe('different_device');
  });

  it('skips unmeasurable components instead of counting them as mismatches', () => {
    // Brave randomizes audio per call; it must not drag the score down.
    const a = { ...base, audio: 'randomized' };
    const b = { ...base, audio: 'randomized' };
    const sim = componentSimilarity(a, b);

    expect(sim.skipped).toContain('audio');
    expect(sim.matched).not.toContain('audio');
    expect(sim.score).toBe(1);
  });

  it('reports no_baseline when nothing is comparable', () => {
    const empty = {} as FingerprintComponents;
    const match = classifyIdentity(componentSimilarity(empty, empty));
    expect(match.verdict).toBe('no_baseline');
  });
});

describe('normalizeGpuModel', () => {
  it('strips the ANGLE wrapper and driver noise', () => {
    expect(
      normalizeGpuModel('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)')
    ).toBe('nvidia geforce rtx 3060');
  });

  it('leaves a bare renderer string readable', () => {
    expect(normalizeGpuModel('Apple M1 Pro')).toBe('apple m1 pro');
  });

  it('returns empty for unusable values', () => {
    expect(normalizeGpuModel('none')).toBe('');
    expect(normalizeGpuModel('')).toBe('');
  });
});

describe('deviceLevelComponents', () => {
  it('keeps only OS-level signals and normalizes the GPU', () => {
    const device = deviceLevelComponents(base);

    expect(Object.keys(device).sort()).toEqual(
      ['fonts', 'intl', 'platform', 'screen', 'voices', 'webglRenderer'].sort()
    );
    // Browser-specific rendering must not leak into the cross-browser id.
    expect(device.canvas).toBeUndefined();
    expect(device.audio).toBeUndefined();
    expect(device.webglRenderer).toBe('nvidia geforce rtx 3060');
  });

  it('produces an identical device id across browsers on one machine', () => {
    // Chrome wraps the renderer in ANGLE(...), Firefox does not; canvas and
    // audio differ per browser engine. The device-level view must collapse
    // both snapshots onto the same value.
    const chrome: FingerprintComponents = { ...base };
    const firefox: FingerprintComponents = {
      ...base,
      canvas: 'different-in-firefox',
      audio: 'different-in-firefox',
      webglTriangle: 'different-in-firefox',
      webglRenderer: 'NVIDIA GeForce RTX 3060',
    };

    expect(deviceLevelComponents(chrome)).toEqual(deviceLevelComponents(firefox));
  });
});
