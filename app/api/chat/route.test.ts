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

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: () => () => ({ /* fake provider */ }),
}));

vi.mock('@/lib/prompt', () => ({
  buildSystemPrompt: () => 'SYS',
}));

vi.mock('@/lib/conversations', () => ({
  recordTurn: vi.fn(async () => 'conv:sess-test:123'),
}));

vi.mock('@/lib/ratelimit', () => ({
  getKv: () => null, // simulate local-dev KV-not-configured
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 999 })),
}));

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
  (recordTurn as unknown as { mockClear: () => void }).mockClear();
  (streamText as unknown as { mockClear: () => void }).mockClear();
});

import { POST } from './route';
import { streamText } from 'ai';
import { recordTurn } from '@/lib/conversations';

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

  it('passes an onFinish callback to streamText that records the turn', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-galavant-session': 'sess-test' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', parts: [{ type: 'text', text: 'flights SYD to DPS' }] },
        ],
      }),
    });
    await POST(req);
    const args = (streamText as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(typeof args.onFinish).toBe('function');

    // Invoke onFinish with a synthetic finished-stream payload to verify capture wiring.
    await (args.onFinish as (e: unknown) => Promise<void>)({
      text: 'Top 3 options...',
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });
    expect(recordTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        turn: expect.objectContaining({
          sessionId: 'sess-test',
          userMessage: 'flights SYD to DPS',
          assistantText: 'Top 3 options...',
        }),
      }),
    );
  });

  it('uses sessionId="anon" when x-galavant-session header is absent', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
        ],
      }),
    });
    await POST(req);
    const args = (streamText as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    await (args.onFinish as (e: unknown) => Promise<void>)({
      text: 'Hi back', toolCalls: [], toolResults: [], finishReason: 'stop',
    });
    expect(recordTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        turn: expect.objectContaining({ sessionId: 'anon' }),
      }),
    );
  });
});
