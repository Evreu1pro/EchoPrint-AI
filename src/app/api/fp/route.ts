// ============================================================
// /api/fp — Module 1 network + TLS hooks + IP intel
// POST body: { timezone, webrtcIps, userAgent, language }
// ============================================================

import { NextResponse } from 'next/server';
import { buildModule1, type M1ClientBody } from '@/lib/modules/m1-network/build';

export const runtime = 'nodejs'; // ip-api needs node fetch; edge may block non-HTTPS
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const m1 = await buildModule1(request);
  return NextResponse.json(
    {
      module: 'fp',
      version: '3.0.0',
      m1,
      privacy: 'Ephemeral — no DB write. IP intel via ip-api.com when reachable.',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  let body: M1ClientBody = {};
  try {
    body = (await request.json()) as M1ClientBody;
  } catch {
    body = {};
  }

  // sanitize
  const clean: M1ClientBody = {
    timezone: typeof body.timezone === 'string' ? body.timezone.slice(0, 64) : undefined,
    userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 512) : undefined,
    language: typeof body.language === 'string' ? body.language.slice(0, 32) : undefined,
    webrtcIps: Array.isArray(body.webrtcIps)
      ? body.webrtcIps.filter((x) => typeof x === 'string').slice(0, 20)
      : undefined,
  };

  const m1 = await buildModule1(request, clean);
  return NextResponse.json(
    {
      module: 'fp',
      version: '3.0.0',
      m1,
      privacy: 'Ephemeral — no DB write.',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
