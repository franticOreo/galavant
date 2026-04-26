type Kv = {
  set: (key: string, value: unknown, opts?: { ex?: number }) => Promise<unknown>;
  get: <T = unknown>(key: string) => Promise<T | null>;
  keys: (pattern: string) => Promise<string[]>;
};

export type ToolCallRecord = { url: string; ok: boolean; ms: number; error?: string };

export type CapturedTurn = {
  sessionId: string;
  userMessage: string;
  assistantText: string;
  toolCalls: ToolCallRecord[];
  durationMs: number;
};

export type StoredTurn = CapturedTurn & {
  ts: number;
  rating?: 'up' | 'down';
  comment?: string;
};

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function recordTurn({
  kv,
  turn,
}: {
  kv: Kv | null;
  turn: CapturedTurn;
}): Promise<string | null> {
  if (!kv) return null;
  const ts = Date.now();
  const key = `conv:${turn.sessionId}:${ts}`;
  const stored: StoredTurn = { ...turn, ts };
  await kv.set(key, stored, { ex: TTL_SECONDS });
  return key;
}

export async function recordRating({
  kv,
  sessionId,
  ts,
  rating,
  comment,
  matchWindowMs = 10 * 60 * 1000, // 10 minutes
}: {
  kv: Kv;
  sessionId: string;
  ts: number;
  rating: 'up' | 'down';
  comment?: string;
  matchWindowMs?: number;
}): Promise<boolean> {
  // Try exact key first (preserves the original behavior when the caller knows the precise ts).
  const exactKey = `conv:${sessionId}:${ts}`;
  const exact = await kv.get<StoredTurn>(exactKey);
  if (exact) {
    const updated: StoredTurn = {
      ...exact,
      rating,
      ...(comment !== undefined ? { comment } : {}),
    };
    await kv.set(exactKey, updated, { ex: TTL_SECONDS });
    return true;
  }

  // Fallback: find the most recent UNRATED turn for this session within the match window
  // and BEFORE the rating timestamp. This handles the common case where the user's click-time
  // ts is later than the server-side onFinish ts.
  const keys = await kv.keys(`conv:${sessionId}:*`);
  let best: { key: string; turn: StoredTurn } | null = null;
  for (const key of keys) {
    const turn = await kv.get<StoredTurn>(key);
    if (!turn) continue;
    if (turn.rating !== undefined) continue; // already rated, skip
    if (turn.ts > ts) continue; // future relative to the rating click — skip
    if (ts - turn.ts > matchWindowMs) continue; // outside window
    if (!best || turn.ts > best.turn.ts) best = { key, turn };
  }
  if (!best) return false;
  const updated: StoredTurn = {
    ...best.turn,
    rating,
    ...(comment !== undefined ? { comment } : {}),
  };
  await kv.set(best.key, updated, { ex: TTL_SECONDS });
  return true;
}

export async function listRecentTurns({
  kv,
  sinceMs,
}: {
  kv: Kv | null;
  sinceMs: number;
}): Promise<StoredTurn[]> {
  if (!kv) return [];
  const cutoff = Date.now() - sinceMs;
  const keys = await kv.keys('conv:*');
  const turns: StoredTurn[] = [];
  for (const key of keys) {
    const turn = await kv.get<StoredTurn>(key);
    if (turn && turn.ts >= cutoff) turns.push(turn);
  }
  return turns.sort((a, b) => b.ts - a.ts);
}
