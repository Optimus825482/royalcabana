import { createClient, RedisClientType } from "redis";

/**
 * Socket.IO rate limiter with Redis sliding window + in-memory fallback.
 * Mirrors src/lib/rate-limit.ts but for socket-specific rate limiting.
 */

// ── Redis client (lazy init) ──
let redis: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (redis) return redis;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  try {
    const client = createClient({ url });
    client.on("error", () => {
      redis = null;
    });
    await client.connect();
    redis = client;
    return redis;
  } catch {
    return null;
  }
}

// ── In-memory fallback store ──
const store = new Map<string, { count: number; resetTime: number }>();
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

// ── Redis sliding window ──
async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const client = await getRedisClient();
  if (!client) throw new Error("Redis not available");

  const redisKey = `socket:rl:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = client.multi();
  pipeline.zRemRangeByScore(redisKey, "0", String(windowStart));
  pipeline.zCard(redisKey);
  pipeline.zAdd(redisKey, { score: now, value: String(now) });
  pipeline.pExpire(redisKey, windowMs);

  const results = await pipeline.exec();
  if (!results) throw new Error("Redis pipeline returned null");

  // results[1] = [error, count] from zCard
  const [err, count] = results[1] as [Error | null, number];
  if (err) throw err;

  if (count >= limit) {
    // Remove the entry we just added since request is denied
    await client.zRem(redisKey, String(now));
    const retryAfter = Math.ceil(windowMs / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

// ── In-memory fallback ──
function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Check rate limit for a socket event.
 * Uses Redis when available, falls back to in-memory.
 */
export async function checkSocketRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  try {
    return await redisRateLimit(key, limit, windowMs);
  } catch {
    return memoryRateLimit(key, limit, windowMs);
  }
}

/**
 * Simple sync check for use in socket middleware.
 * Always uses in-memory for performance (Redis is async).
 */
export function checkSocketRateLimitSync(
  key: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
