import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordTurn, recordRating, listRecentTurns, type CapturedTurn } from './conversations';

const fakeKv = () => {
  const store = new Map<string, unknown>();
  return {
    store,
    set: vi.fn(async (key: string, value: unknown, _opts?: { ex?: number }) => {
      store.set(key, value);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    keys: vi.fn(async (pattern: string) => {
      const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(store.keys()).filter((k) => re.test(k));
    }),
  };
};

describe('recordTurn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));
  });

  it('writes a key conv:<sessionId>:<ts> with TTL of 30 days', async () => {
    const kv = fakeKv();
    const turn: CapturedTurn = {
      sessionId: 'sess1',
      userMessage: 'flights SYD to DPS',
      assistantText: 'Top 3...',
      toolCalls: [{ url: 'https://kayak.com/...', ok: true, ms: 4500 }],
      durationMs: 18234,
    };
    await recordTurn({ kv: kv as never, turn });
    const expectedKey = `conv:sess1:${Date.now()}`;
    expect(kv.set).toHaveBeenCalledWith(
      expectedKey,
      expect.objectContaining({ sessionId: 'sess1', ts: Date.now() }),
      { ex: 60 * 60 * 24 * 30 },
    );
  });

  it('returns the key it wrote', async () => {
    const kv = fakeKv();
    const key = await recordTurn({
      kv: kv as never,
      turn: { sessionId: 'sess2', userMessage: 'x', assistantText: 'y', toolCalls: [], durationMs: 100 },
    });
    expect(key).toBe(`conv:sess2:${Date.now()}`);
  });

  it('returns null when kv is null (no capture in local dev)', async () => {
    const key = await recordTurn({
      kv: null,
      turn: { sessionId: 'sess3', userMessage: 'x', assistantText: 'y', toolCalls: [], durationMs: 0 },
    });
    expect(key).toBeNull();
  });
});

describe('recordRating', () => {
  it('updates an existing turn record with rating + comment', async () => {
    const kv = fakeKv();
    kv.store.set('conv:sess1:1000', {
      sessionId: 'sess1',
      ts: 1000,
      userMessage: 'x',
      assistantText: 'y',
      toolCalls: [],
      durationMs: 0,
    });
    await recordRating({ kv: kv as never, sessionId: 'sess1', ts: 1000, rating: 'down', comment: 'wrong currency' });
    expect(kv.store.get('conv:sess1:1000')).toMatchObject({ rating: 'down', comment: 'wrong currency' });
  });

  it('returns false when no matching turn exists', async () => {
    const kv = fakeKv();
    const ok = await recordRating({ kv: kv as never, sessionId: 'nope', ts: 1, rating: 'up' });
    expect(ok).toBe(false);
  });

  it('falls back to most recent unrated turn for the session within window', async () => {
    const kv = fakeKv();
    const now = Date.now();
    // A turn recorded 30 seconds ago
    kv.store.set(`conv:s1:${now - 30_000}`, {
      sessionId: 's1', ts: now - 30_000,
      userMessage: 'q', assistantText: 'a', toolCalls: [], durationMs: 100,
    });
    // The rating ts is "now" (10s after the user's read+click)
    const ok = await recordRating({ kv: kv as never, sessionId: 's1', ts: now, rating: 'up' });
    expect(ok).toBe(true);
    expect(kv.store.get(`conv:s1:${now - 30_000}`)).toMatchObject({ rating: 'up' });
  });

  it('does not match turns outside the window', async () => {
    const kv = fakeKv();
    const now = Date.now();
    // A turn 20 minutes ago — outside default 10min window
    kv.store.set(`conv:s1:${now - 20 * 60_000}`, {
      sessionId: 's1', ts: now - 20 * 60_000,
      userMessage: 'old', assistantText: '', toolCalls: [], durationMs: 0,
    });
    const ok = await recordRating({ kv: kv as never, sessionId: 's1', ts: now, rating: 'up' });
    expect(ok).toBe(false);
  });

  it('does not re-rate an already-rated turn (picks an unrated one if available)', async () => {
    const kv = fakeKv();
    const now = Date.now();
    // Older turn already rated (skip)
    kv.store.set(`conv:s1:${now - 5_000}`, {
      sessionId: 's1', ts: now - 5_000, userMessage: 'q1', assistantText: 'a1',
      toolCalls: [], durationMs: 0, rating: 'up',
    });
    // Newer turn unrated (pick this)
    kv.store.set(`conv:s1:${now - 1_000}`, {
      sessionId: 's1', ts: now - 1_000, userMessage: 'q2', assistantText: 'a2',
      toolCalls: [], durationMs: 0,
    });
    const ok = await recordRating({ kv: kv as never, sessionId: 's1', ts: now, rating: 'down' });
    expect(ok).toBe(true);
    expect(kv.store.get(`conv:s1:${now - 1_000}`)).toMatchObject({ rating: 'down' });
    // Old one untouched
    expect(kv.store.get(`conv:s1:${now - 5_000}`)).toMatchObject({ rating: 'up' });
  });

  it('exact ts match still wins when both options exist', async () => {
    const kv = fakeKv();
    const now = Date.now();
    kv.store.set(`conv:s1:${now}`, {
      sessionId: 's1', ts: now, userMessage: 'exact', assistantText: '', toolCalls: [], durationMs: 0,
    });
    kv.store.set(`conv:s1:${now - 1000}`, {
      sessionId: 's1', ts: now - 1000, userMessage: 'fallback', assistantText: '', toolCalls: [], durationMs: 0,
    });
    const ok = await recordRating({ kv: kv as never, sessionId: 's1', ts: now, rating: 'up' });
    expect(ok).toBe(true);
    expect(kv.store.get(`conv:s1:${now}`)).toMatchObject({ rating: 'up' });
    // Fallback turn untouched
    expect(kv.store.get(`conv:s1:${now - 1000}`)).not.toHaveProperty('rating');
  });
});

describe('listRecentTurns', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));
  });

  it('returns turns from the last sinceMs window, newest first', async () => {
    const now = Date.now();
    const kv = fakeKv();
    kv.store.set(`conv:s1:${now - 1000}`, {
      sessionId: 's1', ts: now - 1000,
      userMessage: 'recent', assistantText: '', toolCalls: [], durationMs: 0,
    });
    kv.store.set(`conv:s2:${now - 8 * 86400_000}`, {
      sessionId: 's2', ts: now - 8 * 86400_000,
      userMessage: 'old', assistantText: '', toolCalls: [], durationMs: 0,
    });
    const turns = await listRecentTurns({ kv: kv as never, sinceMs: 7 * 86400_000 });
    expect(turns.map((t) => t.userMessage)).toEqual(['recent']);
  });

  it('returns empty array when kv is null', async () => {
    const turns = await listRecentTurns({ kv: null, sinceMs: 1000 });
    expect(turns).toEqual([]);
  });
});
