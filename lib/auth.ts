type SignOpts = { ttlSeconds: number };
type VerifyResult = { ok: true; exp: number } | { ok: false };

const getSecret = (): string => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is required');
  if (s.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
  return s;
};

const encoder = new TextEncoder();

const b64url = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64url = (s: string): Uint8Array<ArrayBuffer> => {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer);
};

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSession({ ttlSeconds }: SignOpts): Promise<string> {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64url(encoder.encode(JSON.stringify({ exp })));
  const key = await getHmacKey(secret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sig = b64url(sigBuf);
  return `${payload}.${sig}`;
}

export async function verifySession(cookie: string): Promise<VerifyResult> {
  if (!cookie) return { ok: false };
  const parts = cookie.split('.');
  if (parts.length !== 2) return { ok: false };
  const [payload, sig] = parts;
  if (!payload || !sig) return { ok: false };

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { ok: false };
  }

  try {
    const key = await getHmacKey(secret);
    const sigBytes = fromB64url(sig);
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
    if (!valid) return { ok: false };

    const decoded = new TextDecoder().decode(fromB64url(payload));
    const { exp } = JSON.parse(decoded) as { exp: number };
    if (typeof exp !== 'number' || exp < Math.floor(Date.now() / 1000)) return { ok: false };
    return { ok: true, exp };
  } catch {
    return { ok: false };
  }
}

export const COOKIE_NAME = 'galavant_session';
export const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
