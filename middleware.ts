import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { rateLimit, getKv } from '@/lib/ratelimit';

const PUBLIC_PATHS = ['/login', '/api/login'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? '';
  const session = await verifySession(cookie);
  if (!session.ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const hourly = await rateLimit({ kv: getKv(), key: `rl:hour:${ip}`, limit: 10, windowSeconds: 3600 });
  if (!hourly.allowed) return new NextResponse('rate limit (hourly)', { status: 429 });

  const daily = await rateLimit({ kv: getKv(), key: `rl:day:${ip}`, limit: 50, windowSeconds: 86400 });
  if (!daily.allowed) return new NextResponse('rate limit (daily)', { status: 429 });

  return NextResponse.next();
}
