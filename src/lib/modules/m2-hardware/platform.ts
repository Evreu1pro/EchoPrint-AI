// ============================================================
// Cheap, cross-browser platform signals
// ------------------------------------------------------------
// These are the bits M2 never collected: CPU/memory class, speech voices,
// CSS media features and the full Intl resolution. They matter because most
// of them survive a browser switch (they describe the OS, not the renderer)
// and several are not touched by anti-fingerprinting modes.
// ============================================================

import { fnv1aHash } from '@/lib/utils/helpers';

export interface PlatformSignals {
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  maxTouchPoints: number | null;
  platform: string | null;
  /** Installed TTS voices: leaks OS + installed language packs. */
  voices: { count: number; sample: string[]; hash: string };
  /** CSS media features — often survive anti-fingerprinting. */
  css: { features: Record<string, string>; hash: string };
  intl: {
    timeZone: string | null;
    locale: string | null;
    calendar: string | null;
    numberingSystem: string | null;
    languages: string[];
    hash: string;
  };
  /** Combined hash of the OS-level signals above. */
  hash: string;
}

function mediaValue(feature: string, candidates: string[]): string {
  try {
    for (const candidate of candidates) {
      if (window.matchMedia(`(${feature}: ${candidate})`).matches) return candidate;
    }
  } catch {
    /* matchMedia unsupported */
  }
  return 'n/a';
}

function collectCss(): PlatformSignals['css'] {
  const features: Record<string, string> = {
    'prefers-color-scheme': mediaValue('prefers-color-scheme', ['dark', 'light']),
    'prefers-reduced-motion': mediaValue('prefers-reduced-motion', ['reduce', 'no-preference']),
    'prefers-contrast': mediaValue('prefers-contrast', ['more', 'less', 'custom', 'no-preference']),
    'prefers-reduced-transparency': mediaValue('prefers-reduced-transparency', [
      'reduce',
      'no-preference',
    ]),
    'forced-colors': mediaValue('forced-colors', ['active', 'none']),
    'inverted-colors': mediaValue('inverted-colors', ['inverted', 'none']),
    'dynamic-range': mediaValue('dynamic-range', ['high', 'standard']),
    'color-gamut': mediaValue('color-gamut', ['rec2020', 'p3', 'srgb']),
    monochrome: mediaValue('monochrome', ['0', '1', '8']),
    pointer: mediaValue('pointer', ['fine', 'coarse', 'none']),
    hover: mediaValue('hover', ['hover', 'none']),
    'any-pointer': mediaValue('any-pointer', ['fine', 'coarse', 'none']),
    'any-hover': mediaValue('any-hover', ['hover', 'none']),
    'display-mode': mediaValue('display-mode', ['standalone', 'minimal-ui', 'fullscreen', 'browser']),
    'scripting': mediaValue('scripting', ['enabled', 'initial-only', 'none']),
  };
  return { features, hash: fnv1aHash(JSON.stringify(features)) };
}

function collectIntl(): PlatformSignals['intl'] {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    const languages = Array.isArray(navigator.languages)
      ? navigator.languages.slice(0, 10)
      : [];
    const payload = {
      timeZone: resolved.timeZone ?? null,
      locale: resolved.locale ?? null,
      calendar: resolved.calendar ?? null,
      numberingSystem: resolved.numberingSystem ?? null,
      languages,
    };
    return { ...payload, hash: fnv1aHash(JSON.stringify(payload)) };
  } catch {
    return {
      timeZone: null,
      locale: null,
      calendar: null,
      numberingSystem: null,
      languages: [],
      hash: 'error',
    };
  }
}

/**
 * Chrome populates the voice list asynchronously, so an immediate
 * getVoices() often returns []. Wait briefly for `voiceschanged`, but never
 * block the scan for more than 400ms.
 */
async function collectVoices(): Promise<PlatformSignals['voices']> {
  try {
    if (typeof speechSynthesis === 'undefined') {
      return { count: 0, sample: [], hash: 'unsupported' };
    }

    let voices = speechSynthesis.getVoices();
    if (!voices.length) {
      voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const timer = window.setTimeout(() => resolve(speechSynthesis.getVoices()), 400);
        speechSynthesis.addEventListener(
          'voiceschanged',
          () => {
            window.clearTimeout(timer);
            resolve(speechSynthesis.getVoices());
          },
          { once: true }
        );
      });
    }

    if (!voices.length) return { count: 0, sample: [], hash: 'empty' };

    const names = voices
      .map((v) => `${v.name}|${v.lang}${v.localService ? '|local' : ''}`)
      .sort();
    return {
      count: names.length,
      sample: names.slice(0, 12),
      hash: fnv1aHash(names.join(',')),
    };
  } catch {
    return { count: 0, sample: [], hash: 'error' };
  }
}

export async function collectPlatform(): Promise<PlatformSignals> {
  const nav = navigator as Navigator & { deviceMemory?: number };

  const hardwareConcurrency =
    typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
  const deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const maxTouchPoints = typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : null;
  const platform = nav.platform || null;

  const [voices, css, intl] = [await collectVoices(), collectCss(), collectIntl()];

  // Only OS-level facts go into the combined hash — this is the part that is
  // supposed to stay identical when the user switches browser.
  const hash = fnv1aHash(
    JSON.stringify({
      hardwareConcurrency,
      deviceMemory,
      maxTouchPoints,
      platform,
      voices: voices.hash,
      intl: intl.timeZone,
    })
  );

  return {
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints,
    platform,
    voices,
    css,
    intl,
    hash,
  };
}
