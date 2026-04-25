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
  it('converts UIMessage[] to ModelMessage[] before passing to streamText', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'flights syd to dps' }],
          },
        ],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(streamText).toHaveBeenCalledOnce();
    const args = (streamText as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<string, unknown>;
    expect(args.system).toBe('SYS');
    expect(args.tools).toHaveProperty('firecrawl');
    // Critical: messages were converted from UIMessage parts shape to ModelMessage content shape.
    const msgs = args.messages as Array<{ role: string; content: unknown }>;
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs[0].role).toBe('user');
    // ModelMessage content is either a string or an array of content parts with type 'text'.
    const c = msgs[0].content;
    const text = typeof c === 'string' ? c : (c as Array<{ type: string; text: string }>)[0]?.text;
    expect(text).toBe('flights syd to dps');
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
