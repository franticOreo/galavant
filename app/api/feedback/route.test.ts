import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/conversations', () => ({
  recordRating: vi.fn(async () => true),
}));

vi.mock('@/lib/ratelimit', () => ({
  getKv: () => ({ /* fake non-null kv */ }),
}));

import { POST } from './route';
import { recordRating } from '@/lib/conversations';

beforeEach(() => {
  (recordRating as unknown as { mockClear: () => void }).mockClear();
});

const req = (body: unknown) =>
  new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/feedback', () => {
  it('records a thumbs-up rating', async () => {
    const res = await POST(req({ sessionId: 's1', ts: 1000, rating: 'up' }));
    expect(res.status).toBe(200);
    expect(recordRating).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 's1', ts: 1000, rating: 'up' }),
    );
  });

  it('records a thumbs-down with comment', async () => {
    await POST(req({ sessionId: 's1', ts: 1000, rating: 'down', comment: 'wrong currency' }));
    expect(recordRating).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 'down', comment: 'wrong currency' }),
    );
  });

  it('returns 400 on missing fields', async () => {
    const res = await POST(req({ sessionId: 's1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid rating', async () => {
    const res = await POST(req({ sessionId: 's1', ts: 1, rating: 'meh' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on bad JSON', async () => {
    const r = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(r);
    expect(res.status).toBe(400);
  });

  it('returns 404 when no matching turn exists', async () => {
    (recordRating as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(false);
    const res = await POST(req({ sessionId: 'nope', ts: 1, rating: 'up' }));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/feedback when KV unavailable', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 503 when getKv() returns null (local dev)', async () => {
    vi.doMock('@/lib/ratelimit', () => ({ getKv: () => null }));
    vi.doMock('@/lib/conversations', () => ({ recordRating: vi.fn() }));
    const { POST: PostNoKv } = await import('./route');
    const res = await PostNoKv(req({ sessionId: 's1', ts: 1000, rating: 'up' }));
    expect(res.status).toBe(503);
  });
});
