// ============================================================
// M7 - Data Transparency Lab
//
// Assembles the Privacy Sandbox probes, the Meta/Google signals and the live
// request radar into one module, then turns it into two user-facing artifacts:
//   - a transparency score (higher = less of you leaks),
//   - a "what would they know about me" briefing built from real M1/M2 values.
// ============================================================

import type { Module1Network, Module2Hardware, Module7AdTech, RadarEvent } from '../types';
import { collectSandboxProbes } from './sandbox';
import { collectGoogleSignals, collectMetaSignals, watchAdvancedMatching } from './meta';
import { runRadarProbes, startRadar } from './radar';

function scoreTransparency(
  probes: { status: string }[],
  radar: RadarEvent[],
  metaLoaded: boolean,
  gtm: boolean
): number {
  let score = 100;
  for (const p of probes) {
    if (p.status === 'open') score -= 7;
    if (p.status === 'empty') score -= 3;
  }
  const loaded = radar.filter((e) => e.status === 'loaded').length;
  const blocked = radar.filter((e) => e.status === 'blocked').length;
  const total = loaded + blocked;
  if (total > 0) score -= Math.round((loaded / total) * 40);
  if (metaLoaded) score -= 8;
  if (gtm) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function buildBriefing(
  m1: Module1Network,
  m2: Module2Hardware,
  radar: RadarEvent[],
  meta: { fbqPresent: boolean; fbp: string | null; fbc: string | null },
  topics: string[]
): { vendor: string; lines: string[] }[] {
  const city = m1.ipIntel.city ?? m1.ipIntel.country ?? 'your GeoIP city';
  const ip = m1.ipIntel.ip ?? 'your IP';
  const asOrg = m1.ipIntel.asnDbName ?? m1.ipIntel.asOrg ?? 'your ISP';
  const gpu = m2.webgl.renderer ? m2.webgl.renderer.slice(0, 60) : 'your GPU';
  const id = m2.stableId.slice(0, 8);
  const loadedVendors = Array.from(
    new Set(radar.filter((e) => e.status === 'loaded').map((e) => e.vendor))
  );
  const googleVendors = loadedVendors.filter((v) => v.startsWith('Google') || v === 'DoubleClick');

  const google: string[] = [
    `Location: ${city} - derived from ${ip} (${asOrg}), no permission prompt needed.`,
    `Device class: ${gpu}, ${m2.screen.width}x${m2.screen.height} at dpr ${m2.screen.devicePixelRatio}.`,
    topics.length
      ? `Interests handed over by the browser itself: ${topics.join(', ')}.`
      : 'Interests: Topics returned nothing here, so targeting would fall back to context and location.',
    googleVendors.length
      ? `Google-owned endpoints that answered during this scan: ${googleVendors.join(', ')}.`
      : 'No Google-owned endpoint completed a request during this scan.',
  ];

  const metaLines: string[] = [
    meta.fbqPresent
      ? 'The Pixel is live on this page, so the visit itself is already reported.'
      : 'The Pixel did not load here - this particular visit is not reported to Meta.',
    meta.fbp
      ? 'The _fbp browser id is stored, which stitches this visit to your previous ones on this site.'
      : 'No _fbp id is stored, so visits are not stitched via that cookie.',
    meta.fbc
      ? 'A _fbc click id is present: this session is attributable to a Meta ad you clicked.'
      : 'No _fbc click id: you did not arrive from a Meta ad.',
    `Even with cookies cleared, hardware id ${id}... and ${gpu} stay the same - that is the part Meta does not need a cookie for.`,
  ];

  const anyone: string[] = [
    `A returning visitor is recognised as ${id}... with ~${m2.entropyBitsEstimate} bits of entropy (~1 in ${(m2.oneInN ?? 0).toLocaleString('en-US')} devices).`,
    m1.ipHistory?.summary ??
      'Change your IP and rescan: the radar will show the tracker set stays identical while only the IP moves.',
  ];

  return [
    { vendor: 'Google', lines: google },
    { vendor: 'Meta', lines: metaLines },
    { vendor: 'Anyone with a fingerprint script', lines: anyone },
  ];
}

export async function collectModule7(
  m1: Module1Network,
  m2: Module2Hardware
): Promise<Module7AdTech> {
  // 1. Start passive observation before anything else runs.
  const radarHandle = startRadar();
  const matching = watchAdvancedMatching();

  // 2. Ask the browser what it would tell an advertiser.
  const sandbox = await collectSandboxProbes();

  // 3. Fire the deliberate probe set and time it.
  const probeEvents = await runRadarProbes();

  // 4. Read what is already stored / loaded on this page.
  const google = collectGoogleSignals();
  const meta = collectMetaSignals(matching.attempts, radarHandle.metaBeacons);

  matching.stop();
  radarHandle.stop();

  const radar = [...radarHandle.events, ...probeEvents].sort((a, b) => a.t - b.t);
  const blockedCount = radar.filter((e) => e.status === 'blocked').length;
  const loadedCount = radar.filter((e) => e.status === 'loaded').length;
  const vendorsSeen = Array.from(new Set(radar.map((e) => e.vendor)));
  const topicsProbe = sandbox.find((p) => p.id === 'topics');
  const topics = topicsProbe ? topicsProbe.values : [];

  const transparencyScore = scoreTransparency(sandbox, radar, meta.fbqPresent, google.gtmPresent);

  const findings: string[] = [];
  findings.push(
    `${blockedCount}/${blockedCount + loadedCount} ad-tech endpoints were cut before they could answer.`
  );
  if (loadedCount > 0) {
    const reached = Array.from(
      new Set(radar.filter((e) => e.status === 'loaded').map((e) => e.vendor))
    ).join(', ');
    findings.push(`Reached you anyway: ${reached}.`);
  }
  const openApis = sandbox.filter((p) => p.status === 'open').map((p) => p.label);
  findings.push(
    openApis.length
      ? `Ad APIs still reachable in this browser: ${openApis.join(', ')}.`
      : 'Every Privacy Sandbox surface we probed is unavailable or refuses to answer.'
  );

  return {
    sandbox,
    meta,
    google,
    radar,
    vendorsSeen,
    blockedCount,
    loadedCount,
    transparencyScore,
    wouldKnow: buildBriefing(m1, m2, radar, meta, topics),
    findings,
  };
}
