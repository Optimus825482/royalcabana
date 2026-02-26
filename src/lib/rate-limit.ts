/**
 * In-memory rate limiter.
 * Production'da Redis-based çözüm (upstash/ratelimit) tercih edilmeli.
 */

const store = new Map<string, { count: number; resetTime: number }>();

// Bellek sızıntısını önlemek için periyodik temizlik
const CLEANUP_INTERVAL = 5 * 60_000; // 5 dakika
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}

/**
 * @param key   - Unique identifier (e.g. "POST:/api/reservations:127.0.0.1")
 * @param limit - Max requests per window (default 30)
 * @param windowMs - Window duration in ms (default 60s)
 * @returns true if allowed, false if rate limited
 */
export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
