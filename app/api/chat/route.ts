import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { buildSystemPrompt } from '@/lib/prompt';
import { firecrawlTool } from '@/lib/firecrawl';

export const runtime = 'nodejs'; // need fs for prompt builder
export const maxDuration = 90; // seconds; longer than Firecrawl worst case

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });

export async function POST(req: Request): Promise<Response> {
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const uiMessages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : [];

  // useChat / assistant-ui send UIMessage[] (parts-shaped); streamText needs ModelMessage[].
  // convertToModelMessages is async in ai v6 — must await before passing.
  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    // OpenRouter (vendor-neutral, pay-per-token, no TPM ceiling). Default = Kimi K2 (the
    // original spec choice; not on Groq's catalog as of Apr 2026 so we route via OpenRouter).
    // Override via OPENROUTER_MODEL to swap providers/models without touching code.
    model: openrouter(process.env.OPENROUTER_MODEL ?? 'moonshotai/kimi-k2'),
    system: buildSystemPrompt(),
    messages: modelMessages,
    tools: { firecrawl: firecrawlTool },
    maxOutputTokens: 2000,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
