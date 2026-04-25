import { describe, it, expect, beforeEach } from 'vitest';
import { signSession, verifySession } from './auth';

beforeEach(() => {
  process.env.AUTH_SECRET = 'test-secret-not-for-production-1234567890';
});

describe('signSession / verifySession', () => {
  it('round-trips a valid session', async () => {
    const cookie = await signSession({ ttlSeconds: 60 });
    const result = await verifySession(cookie);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    }
  });

  it('rejects a tampered cookie', async () => {
    const cookie = await signSession({ ttlSeconds: 60 });
    const [payload] = cookie.split('.');
    const tampered = `${payload}.AAAAAAAA`;
    const result = await verifySession(tampered);
    expect(result.ok).toBe(false);
  });

  it('rejects a tampered payload (extended exp)', async () => {
    const cookie = await signSession({ ttlSeconds: 60 });
    const [, sig] = cookie.split('.');
    const fakePayload = btoa(JSON.stringify({ exp: 9999999999 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const result = await verifySession(`${fakePayload}.${sig}`);
    expect(result.ok).toBe(false);
  });

  it('rejects an expired cookie', async () => {
    const cookie = await signSession({ ttlSeconds: -10 });
    const result = await verifySession(cookie);
    expect(result.ok).toBe(false);
  });

  it('rejects malformed input', async () => {
    expect((await verifySession('')).ok).toBe(false);
    expect((await verifySession('no-dot')).ok).toBe(false);
  });

  it('throws if AUTH_SECRET is not set', async () => {
    delete process.env.AUTH_SECRET;
    await expect(signSession({ ttlSeconds: 60 })).rejects.toThrow('AUTH_SECRET is required');
  });

  it('throws if AUTH_SECRET is shorter than 32 chars', async () => {
    process.env.AUTH_SECRET = 'too-short';
    await expect(signSession({ ttlSeconds: 60 })).rejects.toThrow('at least 32 characters');
  });
});
