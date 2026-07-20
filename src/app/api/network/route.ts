// ============================================================
// Module 1 — Network Detective API
// GET  /api/network  — analyze this request only
// POST /api/network  — same + client claim for cross-check
// ============================================================

import { NextResponse } from 'next/server';
import {
  buildNetworkDetectiveReport,
  type ClientNetworkClaim,
} from '@/lib/server/network-detective';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function corsHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-EchoPrint-Module': 'network-detective/1.0.0',
  };
}

export async function GET(request: Request) {
  try {
    const report = buildNetworkDetectiveReport(request);
    return NextResponse.json(report, {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error('[network-detective] GET failed', err);
    return NextResponse.json(
      { error: 'network_detective_failed', message: 'Could not build network report' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(request: Request) {
  try {
    let claim: ClientNetworkClaim | undefined;
    try {
      const body = (await request.json()) as ClientNetworkClaim;
      claim = sanitizeClaim(body);
    } catch {
      claim = undefined;
    }

    const report = buildNetworkDetectiveReport(request, claim);
    return NextResponse.json(report, {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error('[network-detective] POST failed', err);
    return NextResponse.json(
      { error: 'network_detective_failed', message: 'Could not build network report' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

function sanitizeClaim(body: ClientNetworkClaim): ClientNetworkClaim {
  const out: ClientNetworkClaim = {};
  if (typeof body.userAgent === 'string') out.userAgent = body.userAgent.slice(0, 512);
  if (typeof body.language === 'string') out.language = body.language.slice(0, 64);
  if (Array.isArray(body.languages)) {
    out.languages = body.languages.filter((l) => typeof l === 'string').slice(0, 12).map((l) => l.slice(0, 32));
  }
  if (typeof body.platform === 'string') out.platform = body.platform.slice(0, 64);
  if (typeof body.timezone === 'string') out.timezone = body.timezone.slice(0, 64);
  if (Array.isArray(body.webrtcIps)) {
    out.webrtcIps = body.webrtcIps
      .filter((ip) => typeof ip === 'string' && ip.length < 64)
      .slice(0, 16);
  }
  if (body.clientHints && typeof body.clientHints === 'object') {
    const ch = body.clientHints;
    out.clientHints = {
      mobile: typeof ch.mobile === 'boolean' ? ch.mobile : undefined,
      platform: typeof ch.platform === 'string' ? ch.platform.slice(0, 64) : undefined,
      architecture: typeof ch.architecture === 'string' ? ch.architecture.slice(0, 32) : undefined,
      model: typeof ch.model === 'string' ? ch.model.slice(0, 64) : undefined,
      platformVersion:
        typeof ch.platformVersion === 'string' ? ch.platformVersion.slice(0, 32) : undefined,
      brands: Array.isArray(ch.brands)
        ? ch.brands.slice(0, 8).map((b) => ({
            brand: String(b.brand || '').slice(0, 64),
            version: String(b.version || '').slice(0, 32),
          }))
        : undefined,
    };
  }
  return out;
}
