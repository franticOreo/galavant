import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: () =>
        new Response('data: {"type":"text","text":"hi"}\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      // include the v4 alias as a fallback in case the route uses it
      toDataStreamResponse: () =>
        new Response('data: {"type":"text","text":"hi"}\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
    })),
  };
});

vi.mock('@ai-sdk/groq', () => ({
  groq: () => ({ /* fake provider */ }),
}));

vi.mock('@/lib/prompt', () => ({
  buildSystemPrompt: () => 'SYS',
}));

beforeEach(() => {
  process.env.GROQ_API_KEY = 'gsk-test';
});

import { POST } from './route';
import { streamText } from 'ai';

describe('POST /api/chat', () => {
  it('returns a streaming response and passes messages + tool to streamText', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'flights syd to dps' }] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(streamText).toHaveBeenCalledOnce();
    const args = (streamText as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<string, unknown>;
    expect(args.system).toBe('SYS');
    expect(Array.isArray(args.messages)).toBe(true);
    expect(args.tools).toHaveProperty('firecrawl');
  });

  it('rejects bad json', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
