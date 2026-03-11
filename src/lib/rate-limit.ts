import redis from "@/lib/redis";

/**
 * Redis sliding window + in-memory fallback rate limiter.
 *
 * Redis algorithm: Sorted Set with timestamps as scores.
 * Fallback: in-memory Map when Redis is unavailable.
 */

// ── In-memory fallback store ──
const store = new Map<string, { count: number; resetTime: number }>();
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup() {
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
  if (!redis) throw new Error("Redis not available");

  const redisKey = `rl:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zcard(redisKey);
  pipeline.zadd(redisKey, now, String(now));
  pipeline.pexpire(redisKey, windowMs);

  const results = await pipeline.exec();
  if (!results) throw new Error("Redis pipeline returned null");

  // results[1] = [error, count] from ZCARD
  const [err, count] = results[1] as [Error | null, number];
  if (err) throw err;

  if (count >= limit) {
    // Remove the entry we just added since request is denied
    await redis.zrem(redisKey, String(now));
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
 * Rate limit with detailed info (allowed + retryAfter).
 * Uses Redis sliding window, falls back to in-memory on Redis failure.
 */
export async function rateLimitWithInfo(
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
 * Backward-compatible rate limiter.
 * @returns true if allowed, false if rate limited
 */
export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): Promise<boolean> {
  const result = await rateLimitWithInfo(key, limit, windowMs);
  return result.allowed;
}

/**
 * Standalone rate limit check for use in unprotected endpoints.
 * Returns allowed status and remaining request count.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const result = await rateLimitWithInfo(key, limit, windowMs);
  return {
    allowed: result.allowed,
    remaining: result.allowed ? Math.max(0, limit - 1) : 0,
  };
}

// ── Login lockout store (in-memory with Redis fallback) ──

interface LockoutEntry {
  attempts: number;
  lockedUntil: number | null;
  createdAt: number;
}

const lockoutStore = new Map<string, LockoutEntry>();
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60_000; // 15 minutes

function cleanupLockoutStore() {
  const now = Date.now();
  for (const [key, entry] of lockoutStore) {
    const expired =
      entry.lockedUntil !== null
        ? now > entry.lockedUntil
        : now > entry.createdAt + LOCKOUT_WINDOW_MS;
    if (expired) lockoutStore.delete(key);
  }
}

async function getRedisLockout(key: string): Promise<LockoutEntry | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(`lockout:${key}`);
    return raw ? (JSON.parse(raw) as LockoutEntry) : null;
  } catch {
    return null;
  }
}

async function setRedisLockout(
  key: string,
  entry: LockoutEntry,
): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.set(`lockout:${key}`, JSON.stringify(entry), "EX", 900);
    return true;
  } catch {
    return false;
  }
}

async function deleteRedisLockout(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(`lockout:${key}`);
  } catch {
    // ignore
  }
}

/**
 * Check account lockout status for a given username.
 * @returns null if not locked, or the lockedUntil timestamp if locked
 */
export async function checkAccountLockout(
  username: string,
): Promise<number | null> {
  const entry =
    (await getRedisLockout(username)) ?? lockoutStore.get(username) ?? null;
  if (!entry) return null;

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return entry.lockedUntil;
  }

  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    lockoutStore.delete(username);
    await deleteRedisLockout(username);
    return null;
  }

  return null;
}

/**
 * Record a failed login attempt. Returns true if the account is now locked.
 */
export async function recordFailedLogin(username: string): Promise<boolean> {
  cleanupLockoutStore();

  // Redis is single source of truth; fall back to in-memory only if Redis unavailable
  const redisEntry = await getRedisLockout(username);
  let entry: LockoutEntry | null =
    redisEntry ?? lockoutStore.get(username) ?? null;
  const useRedis =
    redisEntry !== null || (redis !== null && redis !== undefined);

  if (!entry) {
    entry = { attempts: 1, lockedUntil: null, createdAt: Date.now() };
  } else {
    entry.attempts += 1;
    if (!entry.createdAt) entry.createdAt = Date.now();
  }

  if (entry.attempts >= LOCKOUT_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_WINDOW_MS;
  }

  // Write to only one store per request to prevent count divergence
  const wroteToRedis = useRedis
    ? await setRedisLockout(username, entry)
    : false;
  if (!wroteToRedis) {
    lockoutStore.set(username, entry);
  }

  return entry.attempts >= LOCKOUT_MAX_ATTEMPTS;
}

/**
 * Clear lockout state on successful login.
 */
export async function clearLoginAttempts(username: string): Promise<void> {
  lockoutStore.delete(username);
  await deleteRedisLockout(username);
}
