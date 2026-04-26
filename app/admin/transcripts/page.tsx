import { listRecentTurns, type StoredTurn } from '@/lib/conversations';
import { getKv } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function snippet(s: string, n = 240): string {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

function ratingBadge(r: StoredTurn['rating']): string {
  if (r === 'up') return '👍';
  if (r === 'down') return '👎';
  return '·';
}

function formatTs(ts: number): string {
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
}

export default async function TranscriptsPage() {
  const kv = getKv();
  const turns = await listRecentTurns({ kv: kv as never, sinceMs: 7 * 86_400_000 });
  const slice = turns.slice(0, 50);

  return (
    <main className="mx-auto max-w-4xl p-4 flex flex-col gap-4 min-h-dvh">
      <header>
        <h1 className="text-lg font-medium">Recent transcripts</h1>
        <p className="text-sm text-neutral-500">
          Last 7 days · showing {slice.length} of {turns.length} captured turns
          {!kv && ' · (KV not configured — empty in local dev)'}
        </p>
      </header>

      {slice.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">No captured turns yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {slice.map((t) => (
            <li
              key={`${t.sessionId}:${t.ts}`}
              className="rounded-md border border-neutral-200 p-3 text-sm bg-white/60"
            >
              <div className="flex justify-between items-baseline text-xs text-neutral-500 mb-2">
                <span>{formatTs(t.ts)} · session {t.sessionId.slice(0, 16)}</span>
                <span>
                  {ratingBadge(t.rating)} · {t.toolCalls.length} tool calls · {t.durationMs}ms
                </span>
              </div>
              <div className="font-medium text-neutral-900">{snippet(t.userMessage, 200)}</div>
              <div className="text-neutral-700 mt-1 whitespace-pre-wrap">
                {snippet(t.assistantText, 320)}
              </div>
              {t.toolCalls.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-neutral-500 cursor-pointer">
                    Tool calls
                  </summary>
                  <ul className="mt-1 text-xs font-mono text-neutral-600">
                    {t.toolCalls.map((tc, i) => (
                      <li key={i}>
                        {tc.ok ? '✓' : '✗'} {tc.url}
                        {tc.error && <span className="text-red-600"> — {tc.error}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {t.comment && (
                <div className="mt-2 italic text-neutral-500">↳ {t.comment}</div>
              )}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
