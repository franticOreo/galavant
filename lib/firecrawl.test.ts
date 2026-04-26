import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firecrawlScrape } from './firecrawl';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  process.env.FIRECRAWL_API_KEY = 'fc-test-key';
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('firecrawlScrape', () => {
  it('sends correct auth header and body', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown: 'pre $123 mid $456 post' } }), { status: 200 }),
    );
    await firecrawlScrape({ url: 'https://example.com/x', waitFor: 5000 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://api.firecrawl.dev/v2/scrape');
    expect((init as RequestInit).method).toBe('POST');
    expect(((init as RequestInit).headers as Record<string, string>)['Authorization']).toBe(
      'Bearer fc-test-key',
    );
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      url: 'https://example.com/x',
      formats: ['markdown'],
      waitFor: 5000,
      onlyMainContent: false,
    });
  });

  it('keeps the price-bearing region and includes pre-context', async () => {
    const md = 'NAV BEFORE $100 ... $999 ' + 'X'.repeat(500);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown: md } }), { status: 200 }),
    );
    const r = await firecrawlScrape({ url: 'https://x.test', waitFor: 1000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.markdown).toContain('$100');
      expect(r.markdown).toContain('$999');
      // Pre-context (200 chars before first $) brings in nearby nav text.
      expect(r.markdown).toContain('NAV BEFORE');
    }
  });

  it('caps total length at 6000 chars even when input is huge', async () => {
    const md = 'pad '.repeat(2000) + '$50 ' + 'X'.repeat(50000) + '$99';
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown: md } }), { status: 200 }),
    );
    const r = await firecrawlScrape({ url: 'https://x.test', waitFor: 1000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.markdown.length).toBeLessThanOrEqual(6000);
      expect(r.markdown).toContain('$50');
    }
  });

  it('strips image markdown to save tokens', async () => {
    const md = '$100 ![alt](https://img.example.com/x.png) more text $200';
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown: md } }), { status: 200 }),
    );
    const r = await firecrawlScrape({ url: 'https://x.test', waitFor: 1000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.markdown).not.toContain('img.example.com');
      expect(r.markdown).toContain('$100');
      expect(r.markdown).toContain('$200');
    }
  });

  it('returns error envelope on non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
    const r = await firecrawlScrape({ url: 'https://x.test', waitFor: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('429');
  });

  it('returns full markdown when no $ present', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown: 'no prices here' } }), { status: 200 }),
    );
    const r = await firecrawlScrape({ url: 'https://x.test', waitFor: 1000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.markdown).toBe('no prices here');
  });
});
