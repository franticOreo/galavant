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
}: {
  kv: Kv;
  sessionId: string;
  ts: number;
  rating: 'up' | 'down';
  comment?: string;
}): Promise<boolean> {
  const key = `conv:${sessionId}:${ts}`;
  const existing = await kv.get<StoredTurn>(key);
  if (!existing) return false;
  const updated: StoredTurn = {
    ...existing,
    rating,
    ...(comment !== undefined ? { comment } : {}),
  };
  await kv.set(key, updated, { ex: TTL_SECONDS });
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
