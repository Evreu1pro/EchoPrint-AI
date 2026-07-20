// ============================================================
// M5 — Temporal consistency, emoji, VM signals
// ============================================================

import { fnv1aHash } from '@/lib/utils/helpers';
import type { Module2Hardware, Module5Advanced } from '../types';

const LS_KEY = 'echoprint_stable_v3';

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

function temporalCheck(stableId: string): Module5Advanced['temporal'] {
  try {
    const prev = localStorage.getItem(LS_KEY);
    const payload = JSON.stringify({
      stableId,
      t: Date.now(),
    });
    localStorage.setItem(LS_KEY, payload);

    if (!prev) {
      return {
        previousStableId: null,
        sameDeviceDifferentSession: false,
        message: null,
      };
    }
    const parsed = JSON.parse(prev) as { stableId?: string };
    if (parsed.stableId && parsed.stableId === stableId) {
      return {
        previousStableId: parsed.stableId,
        sameDeviceDifferentSession: true,
        message:
          'Same hardware stable_id as a previous visit (localStorage). Clearing cookies does not reset GPU/canvas identity — we still recognize this device.',
      };
    }
    if (parsed.stableId && parsed.stableId !== stableId) {
      return {
        previousStableId: parsed.stableId,
        sameDeviceDifferentSession: false,
        message: 'Hardware stable_id changed since last visit (driver/browser/OS update or different machine).',
      };
    }
  } catch {
    /* private mode */
  }
  return {
    previousStableId: null,
    sameDeviceDifferentSession: false,
    message: null,
  };
}

export function collectModule5(m2: Module2Hardware): Module5Advanced {
  const temporal = temporalCheck(m2.stableId);
  const { signals, probability } = vmSignals(m2);
  return {
    temporal,
    emojiFingerprint: emojiFingerprint(),
    vmSignals: signals,
    vmProbability: probability,
  };
}
