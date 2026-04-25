import { describe, it, expect, beforeEach } from 'vitest';
import { signSession, verifySession } from './auth';

beforeEach(() => {
  process.env.AUTH_SECRET = 'test-secret-not-for-production-1234567890';
});

describe('signSession / verifySession', () => {
  it('round-trips a valid session', () => {
    const cookie = signSession({ ttlSeconds: 60 });
    const result = verifySession(cookie);
    expect(result.ok).toBe(true);
    expect(result.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects a tampered cookie', () => {
    const cookie = signSession({ ttlSeconds: 60 });
    const [payload] = cookie.split('.');
    const tampered = `${payload}.AAAAAAAA`;
    const result = verifySession(tampered);
    expect(result.ok).toBe(false);
  });

  it('rejects a tampered payload (extended exp)', () => {
    const cookie = signSession({ ttlSeconds: 60 });
    const [, sig] = cookie.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ exp: 9999999999 }), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const result = verifySession(`${fakePayload}.${sig}`);
    expect(result.ok).toBe(false);
  });

  it('rejects an expired cookie', () => {
    const cookie = signSession({ ttlSeconds: -10 });
    const result = verifySession(cookie);
    expect(result.ok).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(verifySession('').ok).toBe(false);
    expect(verifySession('no-dot').ok).toBe(false);
  });

  it('throws if AUTH_SECRET is not set', () => {
    delete process.env.AUTH_SECRET;
    expect(() => signSession({ ttlSeconds: 60 })).toThrow('AUTH_SECRET is required');
  });

  it('throws if AUTH_SECRET is shorter than 32 chars', () => {
    process.env.AUTH_SECRET = 'too-short';
    expect(() => signSession({ ttlSeconds: 60 })).toThrow('at least 32 characters');
  });
});
