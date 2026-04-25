import { createHmac, timingSafeEqual } from 'node:crypto';

type SignOpts = { ttlSeconds: number };
type VerifyResult = { ok: true; exp: number } | { ok: false };

const SECRET = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is required');
  if (s.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
  return s;
};

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function signSession({ ttlSeconds }: SignOpts): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64url(Buffer.from(JSON.stringify({ exp }), 'utf8'));
  const sig = b64url(createHmac('sha256', SECRET()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(cookie: string): VerifyResult {
  if (!cookie) return { ok: false };
  const parts = cookie.split('.');
  if (parts.length !== 2) return { ok: false };
  const [payload, sig] = parts;
  if (!payload || !sig) return { ok: false };
  const expected = b64url(createHmac('sha256', SECRET()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  try {
    const { exp } = JSON.parse(fromB64url(payload).toString('utf8')) as { exp: number };
    if (typeof exp !== 'number' || exp < Math.floor(Date.now() / 1000)) return { ok: false };
    return { ok: true, exp };
  } catch {
    return { ok: false };
  }
}

export const COOKIE_NAME = 'galavant_session';
export const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
