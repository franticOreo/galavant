import { describe, it, expect, beforeEach } from 'vitest';
import { signSession, verifySession } from './auth';

beforeEach(() => {
  process.env.AUTH_SECRET = 'test-secret-not-for-production';
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

  it('rejects an expired cookie', () => {
    const cookie = signSession({ ttlSeconds: -10 });
    const result = verifySession(cookie);
    expect(result.ok).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(verifySession('').ok).toBe(false);
    expect(verifySession('no-dot').ok).toBe(false);
  });
});
