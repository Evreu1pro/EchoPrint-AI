import { describe, it, expect } from 'vitest';
import { extractClientIp } from './ip';

function headers(map: Record<string, string>): Headers {
  return new Headers(map);
}

describe('extractClientIp', () => {
  it('prefers Cloudflare connecting IP', () => {
    const info = extractClientIp(
      headers({
        'cf-connecting-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.1, 10.0.0.1',
      })
    );
    expect(info.ip).toBe('203.0.113.10');
    expect(info.source).toBe('cf-connecting-ip');
    expect(info.version).toBe(4);
  });

  it('takes first hop of X-Forwarded-For', () => {
    const info = extractClientIp(
      headers({
        'x-forwarded-for': '198.51.100.7, 10.0.0.2',
      })
    );
    expect(info.ip).toBe('198.51.100.7');
    expect(info.source).toBe('x-forwarded-for');
  });

  it('returns unknown when empty', () => {
    const info = extractClientIp(headers({}));
    expect(info.ip).toBeNull();
    expect(info.source).toBe('unknown');
  });

  it('marks private IPv4', () => {
    const info = extractClientIp(headers({ 'x-real-ip': '192.168.1.5' }));
    expect(info.isPrivate).toBe(true);
  });
});
