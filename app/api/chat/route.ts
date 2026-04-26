import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { buildSystemPrompt } from '@/lib/prompt';
import { firecrawlTool } from '@/lib/firecrawl';
import { recordTurn, type ToolCallRecord } from '@/lib/conversations';
import { getKv } from '@/lib/ratelimit';

// The Kv type in lib/conversations.ts uses set/get/keys; getKv() from ratelimit returns the same
// Vercel KV client but typed with sorted-set methods only. Cast at boundary to avoid two
// structurally-identical-but-differently-named types causing a TS error.
type ConvKv = Parameters<typeof recordTurn>[0]['kv'];

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

  const allMessages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : [];

  // Cap context to the most recent N messages. Tool returns (Firecrawl markdown ~6KB each)
  // accumulate across turns and blow through small prompt-token caps fast (e.g. OpenRouter
  // free tier's 16k cap). Travel planning rarely needs more than the last few turns of context.
  const HISTORY_CAP = 12;
  const uiMessages = allMessages.slice(-HISTORY_CAP);

  // useChat / assistant-ui send UIMessage[] (parts-shaped); streamText needs ModelMessage[].
  // convertToModelMessages is async in ai v6 — must await before passing.
  const modelMessages = await convertToModelMessages(uiMessages);

  // Capture context for the onFinish hook below.
  const lastUserMessage = [...uiMessages].reverse().find((m) => m.role === 'user');
  const lastUserText =
    lastUserMessage?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ') ?? '';
  const sessionId = req.headers.get('x-galavant-session') ?? 'anon';
  const startedAt = Date.now();

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
    onFinish: async (event) => {
      try {
        const toolCalls: ToolCallRecord[] = ((event as { toolCalls?: unknown[] }).toolCalls ?? []).map((tc, idx) => {
          const result = ((event as { toolResults?: unknown[] }).toolResults ?? [])[idx];
          const out = (result as { output?: unknown })?.output as
            | { ok?: boolean; url?: string; error?: string }
            | undefined;
          return {
            url: (tc as { input?: { url?: string } }).input?.url ?? '',
            ok: out?.ok === true,
            ms: 0, // ai SDK doesn't expose per-tool latency in onFinish; leave 0
            error: out?.error,
          };
        });
        await recordTurn({
          kv: getKv() as unknown as ConvKv,
          turn: {
            sessionId,
            userMessage: lastUserText,
            assistantText: typeof (event as { text?: unknown }).text === 'string' ? (event as { text: string }).text : '',
            toolCalls,
            durationMs: Date.now() - startedAt,
          },
        });
      } catch (e) {
        console.warn('[chat] recordTurn failed:', e);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
