import { kv as vercelKv } from '@vercel/kv';

type Kv = {
  zadd: (key: string, member: { score: number; member: number }) => Promise<unknown>;
  zremrangebyscore: (key: string, min: number, max: number) => Promise<unknown>;
  zcard: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
};

type Args = {
  kv: Kv | null;
  key: string;
  limit: number;
  windowSeconds: number;
};

type Result = { allowed: boolean; remaining: number };

export async function rateLimit({ kv, key, limit, windowSeconds }: Args): Promise<Result> {
  if (!kv) return { allowed: true, remaining: limit };
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  await kv.zremrangebyscore(key, 0, windowStart);
  const count = await kv.zcard(key);
  if (count >= limit) return { allowed: false, remaining: 0 };
  await kv.zadd(key, { score: now, member: now });
  await kv.expire(key, windowSeconds * 2);
  return { allowed: true, remaining: limit - count - 1 };
}

export function getKv(): Kv | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  return vercelKv as unknown as Kv;
}
