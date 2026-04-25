import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';

beforeEach(() => {
  process.env.APP_PASSWORD = 'correct-horse-battery-staple-actually';
  process.env.AUTH_SECRET = 'test-secret-must-be-32-chars-min!!';
});

const req = (body: unknown) =>
  new Request('http://localhost/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/login', () => {
  it('returns 200 + Set-Cookie on correct password', async () => {
    const res = await POST(req({ password: 'correct-horse-battery-staple-actually' }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('galavant_session=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('returns 401 on wrong password', async () => {
    const res = await POST(req({ password: 'nope' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 400 on missing password', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });
});
