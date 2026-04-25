import { tool } from 'ai';
import { z } from 'zod';

type ScrapeOk = { ok: true; url: string; markdown: string };
type ScrapeErr = { ok: false; error: string };
export type ScrapeResult = ScrapeOk | ScrapeErr;

type ScrapeArgs = { url: string; waitFor: number };

export async function firecrawlScrape({ url, waitFor }: ScrapeArgs): Promise<ScrapeResult> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return { ok: false, error: 'FIRECRAWL_API_KEY not set' };

  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'], waitFor, onlyMainContent: false }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `Firecrawl ${res.status}: ${text.slice(0, 200)}` };
  }

  const json = (await res.json()) as { data?: { markdown?: string } };
  const markdown = json?.data?.markdown ?? '';
  const first = markdown.indexOf('$');
  const last = markdown.lastIndexOf('$');
  const trimmed = first >= 0 && last > first ? markdown.slice(first, last + 200) : markdown;
  return { ok: true, url, markdown: trimmed };
}

export const firecrawlTool = tool({
  description:
    'Scrape a URL via Firecrawl /v2/scrape. Returns markdown of the rendered page. ' +
    'Use this for any flight-search URL. See TRAVEL_SKILL.md for site URL templates.',
  parameters: z.object({
    url: z.string().url(),
    waitFor: z
      .number()
      .int()
      .min(0)
      .max(15000)
      .default(10000)
      .describe('ms to wait for JS render. 10000 is safe for flight sites.'),
  }),
  execute: async ({ url, waitFor }) => firecrawlScrape({ url, waitFor }),
});
