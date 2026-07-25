// ============================================================
// M4 — Four scores A/B/C/D + trackability narrative
// ------------------------------------------------------------
// This module is a PURE function of (m1, m2, m3, m5).
//
// It used to read `navigator`, `SharedArrayBuffer` and `crossOriginIsolated`
// directly while scoring, which meant the vulnerability score depended on
// whatever runtime happened to execute it — in unit tests it was scoring
// Node's globals rather than the visitor's browser. Those signals are now
// collected in M3 (`m3.surface`) and passed in as data.
// ============================================================

import type {
  ApiSurface,
  Module1Network,
  Module2Hardware,
  Module3Software,
  Module4Scores,
  Module5Advanced,
} from '../types';

/** Practical ceiling for browser fingerprint entropy (Panopticlick/AmIUnique). */
export const UNIQUENESS_CEILING_BITS = 24;

export function computeModule4(
  m1: Module1Network,
  m2: Module2Hardware,
  m3: Module3Software,
  m5: Module5Advanced
): Module4Scores {
  // A — Uniqueness from estimated entropy bits.
  // 24 bits ≈ the practical ceiling measured by Panopticlick/AmIUnique/CreepJS,
  // so 24+ bits = 100. Anything above 33 bits (log2 of the device population)
  // is impossible and is clamped upstream in M2.
  const uniquenessBits = Math.min(m2.entropyBitsEstimate, m2.entropyCapBits ?? 33);
  const uniqueness = Math.min(
    100,
    Math.round((uniquenessBits / UNIQUENESS_CEILING_BITS) * 100)
  );
  const oneInN = m2.oneInN ?? Math.round(2 ** uniquenessBits);
  const rarity =
    oneInN >= 1_000_000
      ? `~1 in ${(oneInN / 1_000_000).toFixed(1)}M`
      : oneInN >= 1_000
        ? `~1 in ${Math.round(oneInN / 1_000)}k`
        : `~1 in ${oneInN}`;
  const uniquenessLabel =
    uniqueness >= 85
      ? `Extremely unique (${rarity} devices)`
      : uniqueness >= 65
        ? `Highly unique (${rarity})`
        : uniqueness >= 40
          ? `Moderately unique (${rarity})`
          : `Common hardware/browser stack (${rarity})`;

  // B — Spoof / undercover (killer feature)
  // formula: geo-tz mismatch *40 + language issues *30 + datacenter *30 + webrtc + spoof findings
  let spoof = 0;
  const formulaNotes: string[] = [];

  if (m1.geoTimezoneMismatch.mismatch) {
    spoof += 40;
    formulaNotes.push(
      `geo↔tz mismatch +40 (${m1.geoTimezoneMismatch.distanceKm} km)`
    );
  }

  // language vs keyboard is client-only soft — use spoof findings weight
  spoof += Math.min(30, Math.round(m3.spoofScore * 0.3));
  if (m3.spoofScore > 0) formulaNotes.push(`software spoof signals +${Math.min(30, Math.round(m3.spoofScore * 0.3))}`);

  const dc =
    m1.ipIntel.connectionType === 'datacenter' ||
    m1.ipIntel.connectionType === 'hosting' ||
    m1.ipIntel.isHosting;
  if (dc) {
    spoof += 30;
    formulaNotes.push(
      `datacenter/hosting IP +30 (${m1.ipIntel.asn || '?'} ${m1.ipIntel.asnDbName || m1.ipIntel.asOrg || ''})`.trim()
    );
  }
  if (m1.ipIntel.connectionType === 'vpn_suspected') {
    spoof += 25;
    formulaNotes.push(
      `VPN/proxy ASN +25 (${m1.ipIntel.asn || '?'} ${m1.ipIntel.asnDbName || m1.ipIntel.asOrg || ''})`.trim()
    );
  }
  // Hardware persisted while the network path moved — the strongest
  // "your IP changed but we still know you" signal.
  if (m1.ipHistory?.ipChanged) {
    formulaNotes.push(
      `IP changed since last scan (${m1.ipHistory.previousIp} → ${m1.ipIntel.ip}) but stable_id held`
    );
  }
  if (m1.ipIntel.isTor || m1.ipIntel.connectionType === 'tor') {
    spoof += 25;
    formulaNotes.push('TOR egress +25');
  }
  if (m1.webrtcVsHttp.status === 'mismatch') {
    spoof += 20;
    formulaNotes.push('WebRTC≠HTTP IP +20');
  }
  if (
    (m1.ipIntel.isTor || m1.ipIntel.vpnScore >= 50) &&
    m1.webrtcVsHttp.status === 'local_only'
  ) {
    spoof += 15;
    formulaNotes.push('VPN/TOR + LAN-only WebRTC +15');
  }
  spoof += Math.round(m1.ipIntel.vpnScore * 0.15);
  spoof = Math.min(100, spoof);

  const spoofLabel =
    spoof >= 70
      ? 'Very likely undercover / spoofed path'
      : spoof >= 40
        ? 'Suspicious inconsistencies'
        : spoof >= 20
          ? 'Mild anomalies'
          : 'Looks consistent';

  // C — Aggressiveness (tracker cutting) = protection score
  const aggressiveness = m3.protection.score;
  const aggressivenessLabel =
    aggressiveness >= 80
      ? 'Hardened — sites see low-trust / non-personalized path'
      : aggressiveness >= 50
        ? 'Partial blocking (uBlock/ETP/Brave)'
        : aggressiveness >= 20
          ? 'Light protection'
          : 'Open — trackers load freely (stock Chrome profile)';

  // D — Vulnerability (from collected surface data, never from globals)
  const { vulnerability, vulnerabilityNotes } = scoreVulnerability(
    m1,
    m2,
    m3,
    m5,
    aggressiveness
  );

  const vulnerabilityLabel =
    vulnerability >= 70
      ? 'High attack surface (APIs + open tracking)'
      : vulnerability >= 40
        ? 'Moderate exposure'
        : 'Reduced attack surface';

  // Trackability narrative: unique OR open surface OR low spoof with rich ID
  // Empty Chrome: low spoof, low aggressiveness, high vulnerability → high trackability
  // Hardened: high aggressiveness reduces third-party ads but first-party still knows you
  const trackabilityPercent = Math.min(
    100,
    Math.round(
      uniqueness * 0.35 +
        (100 - aggressiveness) * 0.25 +
        vulnerability * 0.2 +
        (100 - Math.min(spoof, 60)) * 0.1 + // mild spoof doesn't hide hardware
        10
    )
  );

  let trackabilityNarrative = '';
  if (aggressiveness >= 70 && uniqueness >= 50) {
    trackabilityNarrative = `You block trackers aggressively (score ${aggressiveness}), but your hardware ID still re-identifies you. Sites may lose personalized ads and fall back to first-party / watch-time graphs — they still know the device. Estimated re-identification reach: ~${trackabilityPercent}% of probing sites.`;
  } else if (aggressiveness < 25 && uniqueness < 50) {
    trackabilityNarrative = `Stock-like profile: common fingerprint bits but wide-open ad surface. Personalized ads and cross-site graphs work freely. Estimated trackability: ~${trackabilityPercent}% of sites can leverage your open APIs + network path.`;
  } else if (spoof >= 60) {
    trackabilityNarrative = `High undercover score (${spoof}). Mismatch signals (geo/tz, IP type, WebRTC) make you stand out to fraud systems even if uniqueness is low.`;
  } else {
    trackabilityNarrative = `Mixed profile. Uniqueness ${uniqueness}/100, protection ${aggressiveness}/100. You can be re-identified on roughly ${trackabilityPercent}% of fingerprinting sites given current signals.`;
  }

  if (m5.temporal.sameDeviceDifferentSession) {
    trackabilityNarrative += ` ${m5.temporal.message}`;
  }

  if (m1.ipHistory?.ipChanged && m1.ipHistory.summary) {
    trackabilityNarrative += ` ${m1.ipHistory.summary}`;
  }

  const recommendations = buildRecommendations(m1, m2, m3, aggressiveness, uniqueness);

  return {
    uniqueness,
    uniquenessBits,
    uniquenessLabel,
    spoof,
    spoofLabel,
    aggressiveness,
    aggressivenessLabel,
    vulnerability,
    vulnerabilityLabel,
    trackabilityPercent,
    trackabilityNarrative,
    formulaNotes,
    vulnerabilityNotes,
    recommendations,
  };
}

// ============================================================
// D — Vulnerability
// ============================================================

function scoreVulnerability(
  m1: Module1Network,
  m2: Module2Hardware,
  m3: Module3Software,
  m5: Module5Advanced,
  aggressiveness: number
): { vulnerability: number; vulnerabilityNotes: string[] } {
  const notes: string[] = [];
  const surface: ApiSurface | undefined = m3.surface;
  let vulnerability = 0;

  const add = (points: number, note: string) => {
    vulnerability += points;
    notes.push(`${note} +${points}`);
  };

  if (aggressiveness < 20) add(25, 'No meaningful tracker protection');

  if (!surface) {
    // Older saved reports have no surface data. Say so instead of silently
    // scoring zero and pretending the browser is safe.
    notes.push('API surface not collected in this report (older scan)');
  } else {
    if (surface.sharedArrayBuffer) add(15, 'SharedArrayBuffer exposed (timing side channels)');
    if (surface.webUsb) add(10, 'WebUSB reachable');
    if (surface.webBluetooth) add(10, 'Web Bluetooth reachable');
    if (surface.webHid) add(8, 'WebHID reachable');
    if (surface.webSerial) add(6, 'Web Serial reachable');
    if (surface.webMidi) add(4, 'Web MIDI reachable');

    // Every extra storage slot is another place a tracking id survives a
    // "clear cookies".
    if (surface.persistentSlots > 3) {
      add(
        Math.min(12, (surface.persistentSlots - 3) * 4),
        `${surface.persistentSlots} writable storage slots`
      );
    }
  }

  if (m2.webgl.renderer !== 'none') add(12, 'GPU model exposed via WebGL');
  if (m1.ipIntel.ip && !m1.ipIntel.isTor) add(10, 'Public IP visible');
  if (m5.vmProbability > 0.5) add(5, 'Virtual machine signals present');

  return { vulnerability: Math.min(100, vulnerability), vulnerabilityNotes: notes };
}

// ============================================================
// Actionable output
// ------------------------------------------------------------
// A score with no next step is just a number. These are derived from the
// signals that actually fired for this profile.
// ============================================================

function buildRecommendations(
  m1: Module1Network,
  m2: Module2Hardware,
  m3: Module3Software,
  aggressiveness: number,
  uniqueness: number
): string[] {
  const out: string[] = [];
  const surface = m3.surface;

  if (aggressiveness < 20) {
    out.push(
      'Install a content blocker (uBlock Origin) or switch to a browser with built-in blocking — this is the single biggest change available to you.'
    );
  }

  if (!m3.protection.rfpCanvasNoise && !m3.protection.rfpAudioNoise && uniqueness >= 65) {
    out.push(
      'Your canvas and audio fingerprints are stable and highly unique. Enable fingerprint randomization (Brave Shields, or Firefox privacy.resistFingerprinting) so they stop being a reliable id.'
    );
  }

  if (m2.webgl.renderer !== 'none' && !/generic|masked|software/i.test(m2.webgl.renderer)) {
    out.push(
      `Your exact GPU model is readable (${m2.webgl.renderer.slice(0, 48)}). Only a fingerprint-resisting browser mode hides it.`
    );
  }

  const risky = [
    surface?.webUsb && 'WebUSB',
    surface?.webBluetooth && 'Web Bluetooth',
    surface?.webHid && 'WebHID',
    surface?.webSerial && 'Web Serial',
  ].filter(Boolean) as string[];
  if (risky.length) {
    out.push(
      `Disable unused device APIs (${risky.join(', ')}) in site settings — you almost certainly never use them on the web.`
    );
  }

  if (surface && surface.persistentSlots > 3) {
    out.push(
      `${surface.persistentSlots} storage mechanisms accepted a write. Clear "site data", not just cookies — otherwise localStorage, IndexedDB and the Cache API keep your id.`
    );
  }

  if (!m3.protection.gpc) {
    out.push('Turn on Global Privacy Control — it is a legally recognized opt-out signal in several jurisdictions.');
  }

  if (m1.webrtcVsHttp.status === 'mismatch') {
    out.push(
      'WebRTC is leaking an IP that differs from your HTTP path. If you use a VPN, this defeats it — disable WebRTC or force it through the tunnel.'
    );
  }

  if (!out.length) {
    out.push('No high-impact weakness found in this scan — this profile is already well hardened.');
  }

  return out;
}
