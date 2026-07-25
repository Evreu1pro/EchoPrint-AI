// ============================================================
// M5 — Temporal consistency, emoji, VM signals
// ------------------------------------------------------------
// Temporal matching is fuzzy. A strict hash comparison answers the wrong
// question ("is every signal byte-identical?") when the interesting one is
// "would a tracker still recognise this person?". A driver update changes
// the canvas hash; it does not make you a new human.
// ============================================================

import { fnv1aHash } from '@/lib/utils/helpers';
import type { Module2Hardware, Module5Advanced } from '../types';
import {
  classifyIdentity,
  componentSimilarity,
  type FingerprintComponents,
} from '../identity/fuzzy';

const LS_KEY = 'echoprint_stable_v3';

interface StoredIdentity {
  stableId?: string;
  browserId?: string;
  // Null when M2 could not derive a cross-browser id (older report shape).
  deviceId?: string | null;
  components?: Partial<FingerprintComponents>;
  t?: number;
}

function emojiFingerprint(): string {
  try {
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext('2d');
    if (!ctx) return 'none';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 240, 60);
    ctx.font = '32px Arial';
    ctx.fillText('😀🥰🦊🦄🐉🧬🛰️', 4, 40);
    return fnv1aHash(c.toDataURL());
  } catch {
    return 'error';
  }
}

function vmSignals(m2: Module2Hardware): { signals: string[]; probability: number } {
  const r = m2.webgl.renderer.toLowerCase();
  const v = m2.webgl.vendor.toLowerCase();
  const signals: string[] = [];
  const keys = [
    'vmware',
    'virtualbox',
    'vbox',
    'parallels',
    'qemu',
    'svga',
    'llvmpipe',
    'swiftshader',
    'microsoft basic render',
    'virgl',
    'hyper-v',
  ];
  for (const k of keys) {
    if (r.includes(k) || v.includes(k)) signals.push(`WebGL: ${k}`);
  }
  if (m2.screen.width === 0 || m2.screen.height === 0) signals.push('zero screen');
  let probability = Math.min(0.95, signals.length * 0.28);
  if (signals.some((s) => s.includes('swiftshader') || s.includes('llvmpipe'))) {
    probability = Math.max(probability, 0.75);
  }
  return { signals, probability };
}

function emptyTemporal(): Module5Advanced['temporal'] {
  return {
    previousStableId: null,
    sameDeviceDifferentSession: false,
    message: null,
    similarity: undefined,
    verdict: 'no_baseline',
    changedComponents: [],
    previousDeviceId: null,
    crossBrowserMatch: false,
  };
}

function temporalCheck(m2: Module2Hardware): Module5Advanced['temporal'] {
  const browserId = m2.browserId ?? m2.stableId;
  const deviceId = m2.deviceId ?? null;

  let prev: StoredIdentity | null = null;
  try {
    const rawPrev = localStorage.getItem(LS_KEY);
    if (rawPrev) prev = JSON.parse(rawPrev) as StoredIdentity;

    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        stableId: browserId,
        browserId,
        deviceId,
        components: m2.components,
        t: Date.now(),
      } satisfies StoredIdentity)
    );
  } catch {
    // Private mode / storage blocked — nothing to compare against.
    return emptyTemporal();
  }

  if (!prev) return emptyTemporal();

  const previousStableId = prev.browserId ?? prev.stableId ?? null;
  const previousDeviceId = prev.deviceId ?? null;
  const crossBrowserMatch = Boolean(
    deviceId && previousDeviceId && deviceId === previousDeviceId && previousStableId !== browserId
  );

  // Legacy entries (written before component vectors existed) can only be
  // compared strictly.
  if (!prev.components || !m2.components) {
    const identical = Boolean(previousStableId && previousStableId === browserId);
    return {
      previousStableId,
      previousDeviceId,
      crossBrowserMatch,
      sameDeviceDifferentSession: identical,
      similarity: identical ? 1 : 0,
      verdict: identical ? 'same_device' : 'different_device',
      changedComponents: [],
      message: identical
        ? 'Same hardware stable_id as a previous visit (localStorage). Clearing cookies does not reset GPU/canvas identity — we still recognize this device.'
        : 'Hardware stable_id changed since last visit (no component data stored to say why).',
    };
  }

  const sim = componentSimilarity(prev.components, m2.components);
  const match = classifyIdentity(sim);
  const recognised = match.verdict === 'same_device' || match.verdict === 'same_device_drifted';

  let message = match.message;
  if (recognised) {
    message +=
      ' Clearing cookies does not reset GPU/canvas identity — we still recognize this device.';
  }
  if (crossBrowserMatch) {
    message +=
      ` Different browser, same machine: the cross-browser device id (${deviceId?.slice(0, 8)}…)` +
      ' is unchanged, because fonts, screen, CPU and installed voices describe the OS, not the browser.';
  }

  return {
    previousStableId,
    previousDeviceId,
    crossBrowserMatch,
    sameDeviceDifferentSession: recognised || crossBrowserMatch,
    similarity: sim.score,
    verdict: match.verdict,
    changedComponents: match.changed,
    message,
  };
}

export function collectModule5(m2: Module2Hardware): Module5Advanced {
  const temporal = temporalCheck(m2);
  const { signals, probability } = vmSignals(m2);
  return {
    temporal,
    emojiFingerprint: emojiFingerprint(),
    vmSignals: signals,
    vmProbability: probability,
  };
}
