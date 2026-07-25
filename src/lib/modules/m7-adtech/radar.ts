// ============================================================
// M7 · Live Tracker Radar ("Request Visualization")
//
// Two independent observers, both passive:
//  1. PerformanceObserver on resource timings — sees every request the page
//     actually made, including ones we did not initiate.
//  2. Thin wrappers on fetch / sendBeacon / XHR — catches attempts that never
//     reach the network because a blocker killed them (those never produce a
//     resource timing entry, so wrapping is the only way to see them).
//
// Plus a deliberate probe set: we ask for the same endpoints a normal ad-heavy
// page would load, and time them. Loaded fast = nothing is protecting you;
// instant error = a blocker cut the connection.
// ============================================================

import type { RadarEvent } from '../types';

export interface VendorRule {
  vendor: string;
  match: RegExp;
  what: string;
}

/** Known ad-tech / analytics endpoints and what each one learns. */
export const VENDOR_RULES: VendorRule[] = [
  { vendor: 'Google Tag Manager', match: /googletagmanager\.com/i, what: 'loads any other tag remotely, without a site code change' },
  { vendor: 'Google Analytics', match: /google-analytics\.com|analytics\.google\.com/i, what: 'page views, referrer, device class, _ga client id' },
  { vendor: 'Google Ads', match: /googleadservices\.com|googlesyndication\.com|adservice\.google\./i, what: 'ad clicks and conversions tied to your Google account' },
  { vendor: 'DoubleClick', match: /doubleclick\.net/i, what: 'cross-site ad profile and frequency capping' },
  { vendor: 'Meta Pixel', match: /connect\.facebook\.net|facebook\.com\/tr/i, what: 'that you visited, plus hashed email/phone if Advanced Matching fires' },
  { vendor: 'TikTok', match: /analytics\.tiktok\.com|tiktok\.com\/i18n/i, what: 'visit events matched to a TikTok ad audience' },
  { vendor: 'LinkedIn', match: /snap\.licdn\.com|px\.ads\.linkedin\.com/i, what: 'your employer/role segment for B2B targeting' },
  { vendor: 'Microsoft / Bing', match: /bat\.bing\.com|clarity\.ms/i, what: 'conversions, plus full session replay in Clarity' },
  { vendor: 'Yandex Metrica', match: /mc\.yandex\.(ru|com)/i, what: 'session recording, mouse heatmap, form interactions' },
  { vendor: 'Snapchat', match: /tr\.snapchat\.com|sc-static\.net/i, what: 'visit events matched to a Snap audience' },
  { vendor: 'Amazon Ads', match: /amazon-adsystem\.com/i, what: 'shopping intent signals' },
  { vendor: 'Criteo', match: /criteo\.(com|net)/i, what: 'retargeting: the exact product you looked at' },
  { vendor: 'The Trade Desk', match: /adsrvr\.org/i, what: 'a shared cross-site id sold into RTB auctions' },
  { vendor: 'Xandr / AppNexus', match: /adnxs\.com/i, what: 'RTB bidstream profile' },
  { vendor: 'PubMatic', match: /pubmatic\.com/i, what: 'RTB bidstream profile' },
  { vendor: 'Rubicon / Magnite', match: /rubiconproject\.com/i, what: 'RTB bidstream profile' },
  { vendor: 'Taboola', match: /taboola\.com/i, what: 'content recommendation profile' },
  { vendor: 'Outbrain', match: /outbrain\.com/i, what: 'content recommendation profile' },
  { vendor: 'Hotjar', match: /hotjar\.(com|io)/i, what: 'session replay: your scrolling and clicks are recorded' },
  { vendor: 'Segment', match: /segment\.(com|io)/i, what: 'identity resolution across every tool the site uses' },
  { vendor: 'Amplitude', match: /amplitude\.com/i, what: 'product event stream tied to a device id' },
  { vendor: 'Mixpanel', match: /mixpanel\.com/i, what: 'product event stream tied to a device id' },
];

export function classifyUrl(url: string): VendorRule | null {
  for (const rule of VENDOR_RULES) if (rule.match.test(url)) return rule;
  return null;
}

function clockOf(date = new Date()): string {
  return date.toTimeString().slice(0, 8);
}

function hostOf(url: string): string {
  try {
    return new URL(url, location.href).host;
  } catch {
    return url.slice(0, 60);
  }
}

function pathOf(url: string): string {
  try {
    const u = new URL(url, location.href);
    return (u.pathname + u.search).slice(0, 48);
  } catch {
    return '';
  }
}

/** Probes we intentionally fire so the radar has something to show. */
export const RADAR_PROBES: { vendor: string; url: string; kind: 'script' | 'pixel' }[] = [
  { vendor: 'Google Tag Manager', url: 'https://www.googletagmanager.com/gtag/js?id=G-ECHOPRINT', kind: 'script' },
  { vendor: 'Google Analytics', url: 'https://www.google-analytics.com/analytics.js', kind: 'script' },
  { vendor: 'DoubleClick', url: 'https://securepubads.g.doubleclick.net/tag/js/gpt.js', kind: 'script' },
  { vendor: 'Meta Pixel', url: 'https://connect.facebook.net/en_US/fbevents.js', kind: 'script' },
  { vendor: 'TikTok', url: 'https://analytics.tiktok.com/i18n/pixel/events.js', kind: 'script' },
  { vendor: 'LinkedIn', url: 'https://snap.licdn.com/li.lms-analytics/insight.min.js', kind: 'script' },
  { vendor: 'Yandex Metrica', url: 'https://mc.yandex.ru/metrika/tag.js', kind: 'script' },
  { vendor: 'Criteo', url: 'https://static.criteo.net/js/ld/ld.js', kind: 'script' },
];

export interface RadarHandle {
  events: RadarEvent[];
  /** Requests seen but not initiated by us (the page's own traffic). */
  passiveCount: number;
  metaBeacons: number;
  stop: () => void;
}

/**
 * Start passive observation. Returns immediately; events accumulate in place
 * and `onEvent` fires for live UI.
 */
export function startRadar(onEvent?: (e: RadarEvent) => void): RadarHandle {
  const t0 = performance.now();
  const events: RadarEvent[] = [];
  const seen = new Set<string>();
  const state = { passiveCount: 0, metaBeacons: 0 };

  const push = (e: RadarEvent) => {
    const key = `${e.domain}${e.path}${e.status}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push(e);
    onEvent?.(e);
  };

  const record = (
    url: string,
    method: RadarEvent['method'],
    status: RadarEvent['status'],
    ms: number | null,
    initiatedByUs: boolean
  ) => {
    const rule = classifyUrl(url);
    if (!rule) return;
    if (!initiatedByUs) state.passiveCount++;
    if (/facebook\.com\/tr/i.test(url)) state.metaBeacons++;
    push({
      t: Math.round(performance.now() - t0),
      clock: clockOf(),
      vendor: rule.vendor,
      domain: hostOf(url),
      path: pathOf(url),
      method,
      status,
      ms,
      note: rule.what,
      probe: initiatedByUs,
    });
  };

  // ---- 1. resource timings (things that really hit the network) ----
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const res = entry as PerformanceResourceTiming;
        record(
          res.name,
          res.initiatorType === 'img' ? 'pixel' : res.initiatorType === 'script' ? 'script' : 'GET',
          'loaded',
          Math.round(res.duration),
          false
        );
      }
    });
    observer.observe({ type: 'resource', buffered: true });
  } catch {
    observer = null;
  }

  // ---- 2. wrappers: catch attempts that never reach the network ----
  const origFetch = window.fetch;
  window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const started = performance.now();
    const method = (init?.method || 'GET').toUpperCase() as RadarEvent['method'];
    return origFetch
      .call(window, input as RequestInfo, init)
      .then((r) => {
        record(url, method, 'loaded', Math.round(performance.now() - started), false);
        return r;
      })
      .catch((err: unknown) => {
        record(url, method, 'blocked', Math.round(performance.now() - started), false);
        throw err;
      });
  };

  const origBeacon = navigator.sendBeacon?.bind(navigator);
  if (origBeacon) {
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const ok = origBeacon(url, data);
      record(String(url), 'beacon', ok ? 'loaded' : 'blocked', 0, false);
      return ok;
    };
  }

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function patchedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const started = performance.now();
    this.addEventListener('load', () =>
      record(String(url), method.toUpperCase() as RadarEvent['method'], 'loaded', Math.round(performance.now() - started), false)
    );
    this.addEventListener('error', () =>
      record(String(url), method.toUpperCase() as RadarEvent['method'], 'blocked', Math.round(performance.now() - started), false)
    );
    return (origOpen as unknown as (...a: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;

  return {
    events,
    get passiveCount() {
      return state.passiveCount;
    },
    get metaBeacons() {
      return state.metaBeacons;
    },
    stop: () => {
      observer?.disconnect();
      window.fetch = origFetch;
      if (origBeacon) navigator.sendBeacon = origBeacon;
      XMLHttpRequest.prototype.open = origOpen;
    },
  };
}

/**
 * Fire the probe set and time each one. A script that errors in <50 ms was cut
 * locally (blocker/DNS sinkhole); a script that loads means nothing stopped it.
 */
export async function runRadarProbes(
  onEvent?: (e: RadarEvent) => void
): Promise<RadarEvent[]> {
  const out: RadarEvent[] = [];
  await Promise.all(
    RADAR_PROBES.map(
      (probe) =>
        new Promise<void>((resolve) => {
          const started = performance.now();
          const el = document.createElement('script');
          el.async = true;
          el.src = probe.url;
          const done = (status: RadarEvent['status']) => {
            const ms = Math.round(performance.now() - started);
            const rule = classifyUrl(probe.url);
            const event: RadarEvent = {
              t: ms,
              clock: clockOf(),
              vendor: probe.vendor,
              domain: hostOf(probe.url),
              path: pathOf(probe.url),
              method: 'script',
              status,
              ms,
              note:
                status === 'blocked'
                  ? `cut locally after ${ms} ms — blocker or DNS sinkhole stopped it`
                  : `${rule?.what ?? 'tracker'} · loaded in ${ms} ms, nothing stopped it`,
              probe: true,
            };
            out.push(event);
            onEvent?.(event);
            el.remove();
            resolve();
          };
          el.onload = () => done('loaded');
          el.onerror = () => done('blocked');
          setTimeout(() => done('timeout'), 4000);
          document.head.appendChild(el);
        })
    )
  );
  return out.sort((a, b) => a.t - b.t);
}
