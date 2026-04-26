import { NextResponse } from 'next/server';
import { listRecentTurns } from '@/lib/conversations';
import { getKv } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysParam = url.searchParams.get('days');
  let days = 7;
  if (daysParam !== null) {
    const parsed = Number.parseInt(daysParam, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      days = Math.min(parsed, 30);
    }
  }
  const turns = await listRecentTurns({
    kv: getKv() as never,
    sinceMs: days * 86_400_000,
  });
  return NextResponse.json({ turns, days });
}
