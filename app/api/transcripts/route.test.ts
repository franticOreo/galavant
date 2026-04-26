import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/conversations', () => ({
  listRecentTurns: vi.fn(async () => [
    { sessionId: 's1', ts: 100, userMessage: 'q', assistantText: 'a', toolCalls: [], durationMs: 0 },
  ]),
}));

vi.mock('@/lib/ratelimit', () => ({ getKv: () => ({ /* fake non-null kv */ }) }));

import { GET } from './route';
import { listRecentTurns } from '@/lib/conversations';

beforeEach(() => {
  (listRecentTurns as unknown as { mockClear: () => void }).mockClear();
});

describe('GET /api/transcripts', () => {
  it('returns JSON with the recent turns', async () => {
    const req = new Request('http://localhost/api/transcripts');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const json = await res.json();
    expect(json.turns).toHaveLength(1);
    expect(json.turns[0]).toMatchObject({ sessionId: 's1', userMessage: 'q' });
  });

  it('defaults to 7 days when ?days is missing', async () => {
    await GET(new Request('http://localhost/api/transcripts'));
    expect(listRecentTurns).toHaveBeenCalledWith(expect.objectContaining({ sinceMs: 7 * 86_400_000 }));
  });

  it('honours ?days param', async () => {
    await GET(new Request('http://localhost/api/transcripts?days=3'));
    expect(listRecentTurns).toHaveBeenCalledWith(expect.objectContaining({ sinceMs: 3 * 86_400_000 }));
  });

  it('caps days at 30', async () => {
    await GET(new Request('http://localhost/api/transcripts?days=999'));
    expect(listRecentTurns).toHaveBeenCalledWith(expect.objectContaining({ sinceMs: 30 * 86_400_000 }));
  });

  it('rejects ?days with invalid value (uses default)', async () => {
    await GET(new Request('http://localhost/api/transcripts?days=abc'));
    expect(listRecentTurns).toHaveBeenCalledWith(expect.objectContaining({ sinceMs: 7 * 86_400_000 }));
  });
});
