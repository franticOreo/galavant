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

  it('trims markdown from first $ to last $ + 200', async () => {
    const md = 'NAV BEFORE $100 ... $999 ' + 'X'.repeat(500);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown: md } }), { status: 200 }),
    );
    const r = await firecrawlScrape({ url: 'https://x.test', waitFor: 1000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.markdown.startsWith('$100')).toBe(true);
      expect(r.markdown.length).toBeLessThan(md.length);
      expect(r.markdown).toContain('$999');
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
