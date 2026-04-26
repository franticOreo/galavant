import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordRating } from '@/lib/conversations';
import { getKv } from '@/lib/ratelimit';

const Body = z.object({
  sessionId: z.string().min(1),
  ts: z.number().int().positive(),
  rating: z.enum(['up', 'down']),
  comment: z.string().max(500).optional(),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new NextResponse('bad json', { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) return new NextResponse('missing or invalid fields', { status: 400 });

  const kv = getKv();
  if (!kv) return new NextResponse('kv unavailable (local dev?)', { status: 503 });

  const ok = await recordRating({
    kv: kv as never,
    sessionId: parsed.data.sessionId,
    ts: parsed.data.ts,
    rating: parsed.data.rating,
    ...(parsed.data.comment !== undefined ? { comment: parsed.data.comment } : {}),
  });

  if (!ok) return new NextResponse('not found', { status: 404 });
  return NextResponse.json({ ok: true });
}
