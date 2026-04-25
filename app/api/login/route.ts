import { NextResponse } from 'next/server';
import { signSession, COOKIE_NAME, COOKIE_TTL_SECONDS } from '@/lib/auth';
import { z } from 'zod';

const Body = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse('bad json', { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return new NextResponse('missing password', { status: 400 });

  const expected = process.env.APP_PASSWORD;
  if (!expected) return new NextResponse('server misconfigured', { status: 500 });
  if (parsed.data.password !== expected) return new NextResponse('unauthorized', { status: 401 });

  const cookie = await signSession({ ttlSeconds: COOKIE_TTL_SECONDS });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });
  return res;
}
