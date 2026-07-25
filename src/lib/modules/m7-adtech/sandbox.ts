// ============================================================
// M7 · Privacy Sandbox probes ("what Google would like to know")
//
// Every probe is read-only: we ask the browser what it would hand to an
// advertiser and immediately show it to the user instead. Nothing is sent
// anywhere — the values stay in this tab.
// ============================================================

import type { SandboxProbe } from '../types';

/**
 * Topics API returns numeric taxonomy ids, not names. The public mapping is
 * Chromium's taxonomy_v1/v2 list (~470 entries). We deliberately do NOT ship a
 * guessed table here — a wrong label ("43 = Sports") is worse than an honest id.
 * Drop the official CSV into TOPIC_NAMES to resolve human names.
 */
export const TOPIC_NAMES: Record<number, string> = {
  // 43: '/Sports',  <- fill from chromium taxonomy_v2.md if you want names
};

export function topicLabel(id: number, taxonomy: string): string {
  const name = TOPIC_NAMES[id];
  return name ? `${name} (#${id})` : `topic #${id} · ${taxonomy}`;
}

type TopicEntry = { topic?: number; taxonomyVersion?: string; version?: string; modelVersion?: string };

function probe(
  id: string,
  label: string,
  why: string,
  base?: Partial<SandboxProbe>
): SandboxProbe {
  return {
    id,
    label,
    why,
    available: false,
    status: 'unsupported',
    values: [],
    detail: '',
    ...base,
  };
}

async function probeTopics(): Promise<SandboxProbe> {
  const why =
    'Topics replaces third-party cookies: Chrome derives interest categories from your browsing history and hands 1–3 of them to any ad script that asks. The site never sees the history, only the labels.';
  const doc = document as Document & { browsingTopics?: () => Promise<TopicEntry[]> };
  if (typeof doc.browsingTopics !== 'function') {
    return probe('topics', 'Topics API', why, {
      status: 'unsupported',
      detail:
        'document.browsingTopics is absent — the API is missing entirely (Firefox/Safari, or a Chromium build with Topics disabled). No interest labels can be requested from this browser.',
    });
  }
  try {
    const topics = await doc.browsingTopics();
    const values = (topics ?? []).map((t) =>
      topicLabel(Number(t.topic), String(t.taxonomyVersion ?? t.version ?? 'taxonomy v?'))
    );
    return probe('topics', 'Topics API', why, {
      available: true,
      status: values.length ? 'open' : 'empty',
      values,
      detail: values.length
        ? `The browser handed over ${values.length} interest label(s) to this page. Any ad script on any site can ask the same question.`
        : 'API is callable but returned 0 topics: not enough history yet, or the site is not in an ad context. An advertiser calling this weekly would eventually get labels.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return probe('topics', 'Topics API', why, {
      available: true,
      status: 'blocked',
      detail: `Call rejected: ${msg.slice(0, 160)} — the browser (Brave shields / permissions policy) refuses to hand out interest labels.`,
    });
  }
}

function probeProtectedAudience(): SandboxProbe {
  const why =
    'Protected Audience (ex-FLEDGE) is on-device remarketing: an advertiser adds you to an "interest group" on their site, and later runs an auction inside your browser to show you that exact product again.';
  const nav = navigator as Navigator & {
    joinAdInterestGroup?: unknown;
    runAdAuction?: unknown;
    protectedAudience?: unknown;
  };
  const join = typeof nav.joinAdInterestGroup === 'function';
  const auction = typeof nav.runAdAuction === 'function';
  if (!join && !auction) {
    return probe('protected-audience', 'Protected Audience / FLEDGE', why, {
      status: 'blocked',
      detail:
        'joinAdInterestGroup and runAdAuction are not exposed — in-browser remarketing auctions cannot run at all here.',
    });
  }
  return probe('protected-audience', 'Protected Audience / FLEDGE', why, {
    available: true,
    status: 'open',
    values: [join ? 'joinAdInterestGroup' : '', auction ? 'runAdAuction' : ''].filter(Boolean),
    detail:
      'The API surface is available, so an advertiser script could enroll this browser into interest groups. Group membership itself is not readable by us (by design) — only the browser knows.',
  });
}

function probeAttribution(): SandboxProbe {
  const why =
    'Attribution Reporting links an ad click to a later purchase without cookies. The browser stores the click and sends a delayed, noisy report to the advertiser.';
  const supported =
    'attributionReporting' in document ||
    (typeof HTMLAnchorElement !== 'undefined' && 'attributionSrc' in HTMLAnchorElement.prototype) ||
    (typeof HTMLImageElement !== 'undefined' && 'attributionSrc' in HTMLImageElement.prototype);
  return probe('attribution', 'Attribution Reporting', why, {
    available: supported,
    status: supported ? 'open' : 'blocked',
    detail: supported
      ? 'attributionSrc is supported: clicks and impressions on this page can be registered for conversion measurement.'
      : 'attributionSrc is not supported — no cookieless conversion attribution from this browser.',
  });
}

function probeSharedStorage(): SandboxProbe {
  const why =
    'Shared Storage is cross-site memory for ad tech: writable everywhere, readable only inside a sandboxed worklet. It is how frequency capping and A/B bucketing survive without cookies.';
  const supported = 'sharedStorage' in window;
  return probe('shared-storage', 'Shared Storage', why, {
    available: supported,
    status: supported ? 'open' : 'blocked',
    detail: supported
      ? 'window.sharedStorage exists: any embedded ad frame can write a cross-site value that follows you between sites.'
      : 'window.sharedStorage is absent — cross-site ad memory via this channel is unavailable.',
  });
}

function probePrivateStateTokens(): SandboxProbe {
  const why =
    'Private State Tokens (ex-Trust Tokens) let a site vouch "this browser is a real human" and redeem that proof elsewhere — an anti-fraud signal that travels across sites.';
  const doc = document as Document & { hasPrivateTokens?: unknown; hasTrustToken?: unknown };
  const supported = typeof doc.hasPrivateTokens === 'function' || typeof doc.hasTrustToken === 'function';
  return probe('private-state-tokens', 'Private State Tokens', why, {
    available: supported,
    status: supported ? 'open' : 'blocked',
    detail: supported
      ? 'Token API present: issuers can attach a portable "trusted human" flag to this browser.'
      : 'Token API absent — no portable trust signal can be redeemed here.',
  });
}

function probeFencedFrames(): SandboxProbe {
  const why =
    'Fenced frames render ads in a box the page cannot read — privacy-positive for you, but it also means blockers see less of what happens inside.';
  const supported =
    typeof (window as Window & { HTMLFencedFrameElement?: unknown }).HTMLFencedFrameElement !== 'undefined';
  return probe('fenced-frames', 'Fenced Frames', why, {
    available: supported,
    status: supported ? 'open' : 'blocked',
    detail: supported
      ? 'HTMLFencedFrameElement exists: sandboxed ad slots are supported.'
      : 'HTMLFencedFrameElement is absent.',
  });
}

function probeStorageAccess(): SandboxProbe {
  const why =
    'The Storage Access API is how embedded third parties ask to keep their own cookies. Silent approval means classic cross-site cookies still work.';
  const supported =
    typeof (document as Document & { requestStorageAccess?: unknown }).requestStorageAccess === 'function';
  return probe('storage-access', 'Storage Access API', why, {
    available: supported,
    status: supported ? 'open' : 'unsupported',
    detail: supported
      ? 'requestStorageAccess is available — embedded frames can ask for their own cookie jar.'
      : 'requestStorageAccess is not available.',
  });
}

function probeThirdPartyCookies(): SandboxProbe {
  const why =
    'The classic tracking channel. navigator.cookieDeflection is not a thing, so we report what the browser advertises about partitioned cookies (CHIPS) instead.';
  const chips = typeof document.cookie === 'string' && 'cookieStore' in window;
  return probe('cookies', 'Cookie surface (CHIPS)', why, {
    available: chips,
    status: chips ? 'open' : 'unsupported',
    detail: chips
      ? 'cookieStore API present: partitioned (per-site) cookies are supported by this browser.'
      : 'cookieStore API absent — legacy document.cookie only.',
  });
}

export async function collectSandboxProbes(): Promise<SandboxProbe[]> {
  const topics = await probeTopics();
  return [
    topics,
    probeProtectedAudience(),
    probeAttribution(),
    probeSharedStorage(),
    probePrivateStateTokens(),
    probeFencedFrames(),
    probeStorageAccess(),
    probeThirdPartyCookies(),
  ];
}
