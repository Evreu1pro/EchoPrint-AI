// ============================================================
// M7 · Meta / Facebook transparency
//
// Read-only observation of what a Meta Pixel would already know about this
// visit: is fbq present, do the _fbp / _fbc cookies exist, and does anything
// try to read the value of an email/phone field (Advanced Matching).
// ============================================================

import type { MetaSignals } from '../types';

type FbqFn = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  version?: string;
  loaded?: boolean;
  getState?: () => { pixels?: { id?: string }[] };
};

function readCookie(name: string): string | null {
  const raw = typeof document === 'undefined' ? '' : document.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=')) || null;
  }
  return null;
}

function pixelIdsFromFbq(fbq: FbqFn | undefined): string[] {
  if (!fbq) return [];
  const ids = new Set<string>();
  try {
    const state = fbq.getState?.();
    for (const p of state?.pixels ?? []) if (p?.id) ids.add(String(p.id));
  } catch {
    /* getState is internal and may throw */
  }
  try {
    for (const call of fbq.queue ?? []) {
      if (Array.isArray(call) && call[0] === 'init' && call[1]) ids.add(String(call[1]));
    }
  } catch {
    /* queue shape is not guaranteed */
  }
  return Array.from(ids);
}

/**
 * Advanced Matching watcher.
 *
 * Meta's pixel hashes the content of email/phone/name inputs and sends the
 * SHA-256 alongside the event. We cannot see inside a blocked pixel, so we
 * instrument the other side: a getter trap on HTMLInputElement.value that logs
 * *who* reads a sensitive field. Purely local, no values are recorded — only
 * the field name and the reading script.
 */
export function watchAdvancedMatching(): {
  attempts: { field: string; reader: string; at: number }[];
  stop: () => void;
} {
  const attempts: { field: string; reader: string; at: number }[] = [];
  if (typeof HTMLInputElement === 'undefined') return { attempts, stop: () => {} };

  const proto = HTMLInputElement.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'value');
  if (!original?.get || !original.set) return { attempts, stop: () => {} };
  const origGet = original.get;

  const sensitive = (el: HTMLInputElement): string | null => {
    const type = (el.type || '').toLowerCase();
    const hint = `${el.name} ${el.id} ${el.autocomplete}`.toLowerCase();
    if (type === 'email' || /mail/.test(hint)) return 'email';
    if (type === 'tel' || /phone|tel/.test(hint)) return 'phone';
    if (/first-?name|last-?name|fullname|surname/.test(hint)) return 'name';
    if (/zip|postal/.test(hint)) return 'zip';
    return null;
  };

  Object.defineProperty(proto, 'value', {
    ...original,
    get(this: HTMLInputElement) {
      const field = sensitive(this);
      if (field) {
        // Third frame of the stack is the caller; keep only the script origin.
        const line = (new Error().stack || '').split('\n')[2] || '';
        const src = /https?:\/\/([^/)\s]+)/.exec(line)?.[1] ?? 'inline script';
        if (src !== location.host && attempts.length < 50) {
          attempts.push({ field, reader: src, at: Date.now() });
        }
      }
      return origGet.call(this);
    },
  });

  return {
    attempts,
    stop: () => Object.defineProperty(proto, 'value', original),
  };
}

export function collectMetaSignals(
  advancedMatching: { field: string; reader: string; at: number }[],
  capiBeacons: number
): MetaSignals {
  const w = window as Window & { fbq?: FbqFn; _fbq?: FbqFn };
  const fbq = w.fbq ?? w._fbq;
  const fbqPresent = typeof fbq === 'function';
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc');
  const pixelIds = pixelIdsFromFbq(fbq);
  const findings: string[] = [];

  findings.push(
    fbqPresent
      ? `Meta Pixel is loaded on this page${pixelIds.length ? ` (id ${pixelIds.join(', ')})` : ''} — Facebook knows this visit happened, logged-in or not.`
      : 'Meta Pixel is not loaded here — either the site does not use it, or your blocker killed connect.facebook.net.'
  );
  findings.push(
    fbp
      ? `_fbp cookie present (${fbp.slice(0, 24)}…) — a first-party browser id Meta reuses to stitch your visits together.`
      : '_fbp is absent — no first-party Meta browser id is stored for this site.'
  );
  findings.push(
    fbc
      ? `_fbc click id present — you arrived here from a Facebook/Instagram ad, and the conversion can be attributed to it.`
      : '_fbc is absent — you did not arrive from a Meta ad click.'
  );
  if (advancedMatching.length) {
    const fields = Array.from(new Set(advancedMatching.map((a) => a.field))).join(', ');
    const readers = Array.from(new Set(advancedMatching.map((a) => a.reader))).join(', ');
    findings.push(
      `Advanced Matching attempt: ${fields} field(s) were read by ${readers}. Meta hashes these with SHA-256 and matches them to an account.`
    );
  } else {
    findings.push(
      'No third-party script read an email/phone/name field during this scan (Advanced Matching not observed).'
    );
  }
  if (capiBeacons > 0) {
    findings.push(
      `${capiBeacons} beacon(s) to facebook.com/tr observed — that is the server-side (CAPI) path which bypasses many blockers.`
    );
  }

  return {
    fbqPresent,
    pixelIds,
    fbp,
    fbc,
    advancedMatchingAttempts: advancedMatching,
    capiBeacons,
    findings,
  };
}

/** Google-side first-party leftovers: GA/GTM cookies and click ids. */
export function collectGoogleSignals(): {
  gtmPresent: boolean;
  gaCookies: string[];
  gclid: boolean;
  findings: string[];
} {
  const w = window as Window & { dataLayer?: unknown[]; google_tag_manager?: unknown; gtag?: unknown };
  const gtmPresent = Array.isArray(w.dataLayer) || typeof w.google_tag_manager === 'object' || typeof w.gtag === 'function';
  const raw = typeof document === 'undefined' ? '' : document.cookie || '';
  const gaCookies = raw
    .split(';')
    .map((c) => c.trim().split('=')[0] ?? '')
    .filter((n) => /^_ga|^_gid$|^_gcl_|^_gac_/.test(n));
  const gclid = /[?&](gclid|gbraid|wbraid)=/.test(location.search);
  const findings: string[] = [];

  findings.push(
    gtmPresent
      ? 'Google Tag Manager / gtag is active on this page — it can load any additional tag remotely without a code change.'
      : 'No GTM/gtag container detected on this page.'
  );
  findings.push(
    gaCookies.length
      ? `Google analytics cookies present: ${gaCookies.join(', ')} — _ga is a per-site client id that survives until you clear storage.`
      : 'No _ga / _gcl_ cookies stored for this site.'
  );
  if (gclid) findings.push('A Google click id (gclid/gbraid) is in the URL — this visit is attributable to an ad click.');

  return { gtmPresent, gaCookies, gclid, findings };
}
