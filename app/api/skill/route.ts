import { NextResponse } from 'next/server';
import { z } from 'zod';
import { commitFile } from '@/lib/github';

const Body = z.object({
  content: z.string().min(1),
  message: z.string().optional(),
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
  if (!parsed.success) return new NextResponse('content required', { status: 400 });

  const result = await commitFile({
    path: 'TRAVEL_SKILL.md',
    content: parsed.data.content,
    message: parsed.data.message ?? 'feat(skill): edit TRAVEL_SKILL.md',
    branch: 'main',
  });

  if (!result.ok) return new NextResponse(result.error, { status: 502 });
  return NextResponse.json({ ok: true, commitSha: result.commitSha });
}
