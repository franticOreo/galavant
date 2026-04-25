import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from './ratelimit';

const fakeKv = () => {
  const sets = new Map<string, [number, number][]>();
  return {
    sets,
    zadd: vi.fn(async (key: string, member: { score: number; member: number }) => {
      const arr = sets.get(key) ?? [];
      arr.push([member.score, member.member]);
      sets.set(key, arr);
    }),
    zremrangebyscore: vi.fn(async (key: string, min: number, max: number) => {
      const arr = sets.get(key) ?? [];
      sets.set(
        key,
        arr.filter(([s]) => !(s >= min && s <= max)),
      );
    }),
    zcard: vi.fn(async (key: string) => (sets.get(key) ?? []).length),
    expire: vi.fn(async () => {}),
  };
};

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to limit, blocks one over', async () => {
    const kv = fakeKv();
    for (let i = 0; i < 3; i++) {
      const r = await rateLimit({ kv: kv as never, key: 'ip:1.1.1.1', limit: 3, windowSeconds: 60 });
      expect(r.allowed).toBe(true);
    }
    const blocked = await rateLimit({ kv: kv as never, key: 'ip:1.1.1.1', limit: 3, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('allows again after window passes', async () => {
    const kv = fakeKv();
    for (let i = 0; i < 3; i++) {
      await rateLimit({ kv: kv as never, key: 'ip:1.1.1.1', limit: 3, windowSeconds: 60 });
    }
    vi.setSystemTime(new Date('2026-04-25T12:01:30Z')); // +90s
    const r = await rateLimit({ kv: kv as never, key: 'ip:1.1.1.1', limit: 3, windowSeconds: 60 });
    expect(r.allowed).toBe(true);
  });

  it('returns allowed=true when kv is null (local dev)', async () => {
    const r = await rateLimit({ kv: null, key: 'ip:1.1.1.1', limit: 1, windowSeconds: 60 });
    expect(r.allowed).toBe(true);
  });
});
