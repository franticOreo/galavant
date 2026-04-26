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
  return { ok: true, url, markdown: trimMarkdown(markdown) };
}

// Hard cap of ~6KB per scrape to keep total tool output under model context budgets.
// Strategy: collapse whitespace runs, drop image/SVG markdown, then take a window
// around the price-bearing region. 6000 chars ≈ 1500 tokens; 3 sites = ~4500 tokens
// of tool output, leaving room for the system prompt and chat history.
const MAX_CHARS = 6000;
const PRE_CONTEXT = 200;

export function trimMarkdown(md: string): string {
  if (!md) return md;
  // Drop image/asset markdown that pads token count without info.
  let cleaned = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // markdown images
    .replace(/<img[^>]*>/gi, '') // raw <img>
    .replace(/<svg[\s\S]*?<\/svg>/gi, '') // inline svgs
    .replace(/\n{3,}/g, '\n\n') // collapse blank lines
    .replace(/[ \t]{2,}/g, ' '); // collapse spaces

  const first = cleaned.indexOf('$');
  if (first < 0) return cleaned.length > MAX_CHARS ? cleaned.slice(0, MAX_CHARS) : cleaned;

  const start = Math.max(0, first - PRE_CONTEXT);
  const end = Math.min(cleaned.length, start + MAX_CHARS);
  return cleaned.slice(start, end);
}

export const firecrawlTool = tool({
  description:
    'Scrape a URL via Firecrawl /v2/scrape. Returns markdown of the rendered page. ' +
    'Use this for any flight-search URL. See TRAVEL_SKILL.md for site URL templates.',
  inputSchema: z.object({
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
