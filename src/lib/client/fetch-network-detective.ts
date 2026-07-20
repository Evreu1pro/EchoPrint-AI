// ============================================================
// Client helper — call Module 1 Network Detective API
// ============================================================

import type { FingerprintData } from '@/lib/types';
import type { NetworkDetectiveReport, ClientNetworkClaim } from '@/lib/server/network-detective/types';

export type { NetworkDetectiveReport };

export function buildClientNetworkClaim(data: FingerprintData): ClientNetworkClaim {
  return {
    userAgent: data.navigator.userAgent,
    language: data.navigator.language,
    languages: data.navigator.languages,
    platform: data.navigator.platform,
    timezone: data.misc.timezone,
    webrtcIps: [
      ...data.webrtc.localIPs,
      ...(data.webrtc.publicIP ? [data.webrtc.publicIP] : []),
    ],
    clientHints: data.navigator.userAgentData
      ? {
          mobile: data.navigator.userAgentData.mobile,
          platform: data.navigator.userAgentData.platform,
          brands: data.navigator.userAgentData.brands,
          architecture: data.navigator.userAgentData.highEntropy?.architecture,
          model: data.navigator.userAgentData.highEntropy?.model,
          platformVersion: data.navigator.userAgentData.highEntropy?.platformVersion,
        }
      : undefined,
  };
}

/**
 * POST fingerprint claim to server for cross-check.
 * Fails soft (returns null) when offline / static hosting without API.
 */
export async function fetchNetworkDetective(
  data: FingerprintData,
  signal?: AbortSignal
): Promise<NetworkDetectiveReport | null> {
  try {
    const claim = buildClientNetworkClaim(data);
    const res = await fetch('/api/network', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Encourage Client Hints on Chromium (best-effort)
        'Accept-CH':
          'Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Model, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version-List',
      },
      body: JSON.stringify(claim),
      cache: 'no-store',
      signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as NetworkDetectiveReport;
  } catch {
    return null;
  }
}
