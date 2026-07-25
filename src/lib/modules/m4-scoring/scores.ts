// ============================================================
// M4 — Four scores A/B/C/D + trackability narrative
// ============================================================

import type {
  Module1Network,
  Module2Hardware,
  Module3Software,
  Module4Scores,
  Module5Advanced,
} from '../types';

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
  const uniqueness = Math.min(100, Math.round((uniquenessBits / 24) * 100));
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

  // D — Vulnerability
  let vulnerability = 0;
  // old chrome hard to know — use missing protections
  if (aggressiveness < 20) vulnerability += 25;
  if (typeof SharedArrayBuffer !== 'undefined') {
    vulnerability += 15;
    formulaNotes.push('SharedArrayBuffer available +15 vuln');
  }
  if ('usb' in navigator) vulnerability += 10;
  if ('bluetooth' in navigator) vulnerability += 10;
  if ('hid' in navigator) vulnerability += 8;
  if (m2.webgl.renderer !== 'none') vulnerability += 12; // GPU exposed
  if (m1.ipIntel.ip && !m1.ipIntel.isTor) vulnerability += 10; // public IP visible
  if (m5.vmProbability > 0.5) vulnerability += 5;
  vulnerability = Math.min(100, vulnerability);

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
  };
}
