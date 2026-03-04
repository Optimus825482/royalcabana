import redis from "@/lib/redis";

/**
 * Server-side Redis cache layer with in-memory fallback.
 *
 * Usage:
 *   const data = await cached("reservations:active", 60, () => fetchFromDB());
 */

// ── In-memory fallback ──
const memCache = new Map<string, { data: string; expiresAt: number }>();
const MAX_MEM_ENTRIES = 500;

function memCleanup() {
  if (memCache.size <= MAX_MEM_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of memCache) {
    if (now > entry.expiresAt) memCache.delete(key);
  }
  // If still over limit, delete oldest entries
  if (memCache.size > MAX_MEM_ENTRIES) {
    const keys = [...memCache.keys()];
    const toDelete = keys.slice(0, keys.length - MAX_MEM_ENTRIES);
    toDelete.forEach((k) => memCache.delete(k));
  }
}

/**
 * Get cached value or compute and store it.
 * @param key - Cache key (prefixed with "cache:" in Redis)
 * @param ttlSeconds - Time to live in seconds
 * @param fetcher - Async function to compute value on cache miss
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cacheKey = `cache:${key}`;

  // Try Redis first
  if (redis) {
    try {
      const hit = await redis.get(cacheKey);
      if (hit) return JSON.parse(hit) as T;
    } catch {
      // Redis read failed, continue to fetcher
    }
  } else {
    // Try memory cache
    const memHit = memCache.get(cacheKey);
    if (memHit && Date.now() < memHit.expiresAt) {
      return JSON.parse(memHit.data) as T;
    }
  }

  // Cache miss — fetch fresh data
  const data = await fetcher();
  const serialized = JSON.stringify(data);

  // Store in Redis
  if (redis) {
    try {
      await redis.setex(cacheKey, ttlSeconds, serialized);
    } catch {
      // Redis write failed, fall through to memory
    }
  }

  // Always store in memory as fallback
  memCleanup();
  memCache.set(cacheKey, {
    data: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  return data;
}

/**
 * Invalidate a cache key (both Redis and memory).
 */
export async function invalidateCache(key: string): Promise<void> {
  const cacheKey = `cache:${key}`;
  memCache.delete(cacheKey);
  if (redis) {
    try {
      await redis.del(cacheKey);
    } catch {
      // ignore
    }
  }
}

/**
 * Invalidate all keys matching a pattern.
 * Pattern uses Redis SCAN with MATCH (e.g., "reservations:*").
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const fullPattern = `cache:${pattern}`;

  // Clear matching memory entries
  for (const key of memCache.keys()) {
    if (matchGlob(fullPattern, key)) memCache.delete(key);
  }

  // Clear matching Redis entries
  if (redis) {
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          fullPattern,
          "COUNT",
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) await redis.del(...keys);
      } while (cursor !== "0");
    } catch {
      // ignore
    }
  }
}

function matchGlob(pattern: string, str: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
  );
  return regex.test(str);
}
