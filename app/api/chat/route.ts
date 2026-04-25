import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
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

  const uiMessages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : [];

  // useChat / assistant-ui send UIMessage[] (parts-shaped); streamText needs ModelMessage[].
  // convertToModelMessages is async in ai v6 — must await before passing.
  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    // Plan/spec said Kimi K2 but Groq's catalog (Apr 2026) does not list it.
    // Llama 4 Scout 17B MoE is a solid Groq-available alternative for tool calling.
    // Swap via env if needed: process.env.GROQ_MODEL ?? default.
    model: groq(process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct'),
    system: buildSystemPrompt(),
    messages: modelMessages,
    tools: { firecrawl: firecrawlTool },
    maxOutputTokens: 2000,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
