import { streamText, stepCountIs } from 'ai';
import { groq } from '@ai-sdk/groq';
import { buildSystemPrompt } from '@/lib/prompt';
import { firecrawlTool } from '@/lib/firecrawl';

export const runtime = 'nodejs'; // need fs for prompt builder
export const maxDuration = 90; // seconds; longer than Firecrawl worst case

export async function POST(req: Request): Promise<Response> {
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];

  const result = streamText({
    model: groq('moonshotai/kimi-k2-instruct'),
    system: buildSystemPrompt(),
    messages,
    tools: { firecrawl: firecrawlTool },
    maxOutputTokens: 2000,
    stopWhen: stepCountIs(8),
  });

  // ai v5: toUIMessageStreamResponse() (v4 used toDataStreamResponse)
  return result.toUIMessageStreamResponse();
}
