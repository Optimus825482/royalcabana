---
name: "performance-optimizer"
displayName: "Performance Optimizer"
description: "Full-stack performance optimization power. Detects and fixes performance bottlenecks across frontend (Core Web Vitals, bundle size, rendering), backend (API response time, caching, connection pooling), and database (query optimization, indexing, N+1). Framework-agnostic detection, then deep analysis."
keywords:
  [
    "performance",
    "optimization",
    "core-web-vitals",
    "query-optimization",
    "caching",
    "bundle-size",
  ]
author: "Erkan"
---

# Performance Optimizer

## Overview

Full-stack performance optimization power that works with any framework or language. The approach is systematic: first DETECT where the bottleneck is (frontend, backend, or database), then ANALYZE the root cause, then OPTIMIZE with targeted fixes.

Three optimization layers:

1. **Frontend** — Core Web Vitals (LCP, INP, CLS), bundle size, rendering strategy, image optimization, font loading
2. **Backend** — API response time, caching strategy, connection pooling, compression, async patterns, memory management
3. **Database** — Query optimization, indexing strategy, N+1 prevention, connection management, query plan analysis

### Performance Targets (2026)

| Metric                          | Good    | Needs Work | Poor    |
| ------------------------------- | ------- | ---------- | ------- |
| LCP (Largest Contentful Paint)  | ≤ 2.5s  | 2.5–4s     | > 4s    |
| INP (Interaction to Next Paint) | ≤ 200ms | 200–500ms  | > 500ms |
| CLS (Cumulative Layout Shift)   | ≤ 0.1   | 0.1–0.25   | > 0.25  |
| TTFB (Time to First Byte)       | ≤ 800ms | 800ms–1.8s | > 1.8s  |
| API Response (p95)              | ≤ 200ms | 200–500ms  | > 500ms |
| DB Query (p95)                  | ≤ 50ms  | 50–200ms   | > 200ms |
| Bundle Size (gzipped)           | ≤ 200KB | 200–500KB  | > 500KB |

## Phase 1: Detection — Where Is the Bottleneck?

Before optimizing anything, identify which layer is slow. Run these diagnostic steps in order:

### Step 1: Measure Current State

```bash
# Frontend — Lighthouse audit (Chrome DevTools or CLI)
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse.json

# Bundle analysis — what's in the JS bundle?
# Next.js
ANALYZE=true npx next build
# Vite
npx vite-bundle-visualizer
# Webpack
npx webpack-bundle-analyzer stats.json

# Backend — API response times
# Quick curl timing
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" http://localhost:3000/api/resource

# Database — slow query log
# PostgreSQL: enable pg_stat_statements
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;

# Node.js — memory and CPU profiling
node --inspect src/server.js
# Then open chrome://inspect in Chrome
```

### Step 2: Identify the Layer

| Symptom             | Likely Layer | First Action                                   |
| ------------------- | ------------ | ---------------------------------------------- |
| High LCP, low TTFB  | Frontend     | Check bundle size, images, fonts               |
| High LCP, high TTFB | Backend/DB   | Check API response time, DB queries            |
| High INP            | Frontend     | Check JS execution, hydration, event handlers  |
| High CLS            | Frontend     | Check image dimensions, dynamic content, fonts |
| Slow API responses  | Backend      | Check caching, N+1, connection pool            |
| API fast, page slow | Frontend     | Check bundle size, rendering strategy          |
| Everything slow     | Database     | Check query plans, indexes, connection limits  |

### Step 3: Framework Detection

Detect the tech stack to apply framework-specific optimizations:

```bash
# Auto-detect from package.json
cat package.json | grep -E "next|react|vue|svelte|angular|express|fastify|fastapi|django|flask|prisma|typeorm|drizzle|sequelize"

# Database detection
cat package.json | grep -E "pg|mysql2|mongodb|sqlite|redis"
# Or check docker-compose.yaml for database services
```

---

## Phase 2: Frontend Performance

### Core Web Vitals Optimization

#### LCP (Largest Contentful Paint) — Target: ≤ 2.5s

The LCP element is usually a hero image, heading, or video. Optimize the critical rendering path:

```html
<!-- Preload the LCP image — MUST be in <head> -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

<!-- Hero image with explicit dimensions and priority loading -->
<img
  src="/hero.webp"
  alt="Hero"
  width="1200"
  height="600"
  fetchpriority="high"
  decoding="async"
/>
```

```tsx
// Next.js — priority prop for LCP image
import Image from "next/image";

<Image
  src="/hero.webp"
  alt="Hero"
  width={1200}
  height={600}
  priority // Disables lazy loading, preloads
  sizes="100vw"
  quality={85}
/>;
```

LCP optimization checklist:

- Preload LCP image with `fetchpriority="high"`
- Use `priority` prop in Next.js Image for above-the-fold images
- Inline critical CSS (first 14KB) — avoid render-blocking stylesheets
- Preload fonts with `font-display: swap`
- Use SSR or SSG for initial HTML — don't rely on client-side rendering
- Minimize server response time (TTFB ≤ 800ms)
- Avoid lazy loading above-the-fold content
- Use CDN for static assets

#### INP (Interaction to Next Paint) — Target: ≤ 200ms

INP replaced FID in 2024. It measures the worst-case responsiveness across ALL interactions, not just the first one:

```tsx
// BAD — blocking the main thread during interaction
function handleClick() {
  const result = heavyComputation(data); // Blocks for 300ms
  setItems(result);
}

// GOOD — yield to main thread with scheduler
function handleClick() {
  startTransition(() => {
    const result = heavyComputation(data);
    setItems(result);
  });
}

// GOOD — break up long tasks with requestIdleCallback
function processLargeList(items: Item[]) {
  const CHUNK_SIZE = 50;
  let index = 0;

  function processChunk() {
    const end = Math.min(index + CHUNK_SIZE, items.length);
    for (let i = index; i < end; i++) {
      processItem(items[i]);
    }
    index = end;
    if (index < items.length) {
      requestIdleCallback(processChunk);
    }
  }
  requestIdleCallback(processChunk);
}

// GOOD — debounce expensive handlers
import { useDeferredValue } from "react";

function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  // Renders with stale value first, then updates when idle
  return <ExpensiveList filter={deferredQuery} />;
}
```

INP optimization checklist:

- Use `startTransition` for non-urgent state updates
- Break long tasks (>50ms) into smaller chunks
- Use `useDeferredValue` for expensive re-renders
- Debounce/throttle input handlers (search, scroll, resize)
- Avoid synchronous layout reads (forced reflow)
- Minimize hydration cost — use RSC to reduce client JS
- Use `content-visibility: auto` for off-screen content
- React Compiler (stable in Next.js 16) auto-memoizes — reduces re-render cost

#### CLS (Cumulative Layout Shift) — Target: ≤ 0.1

```html
<!-- ALWAYS set explicit dimensions on images and videos -->
<img src="/photo.webp" alt="" width="800" height="600" />
<video width="1280" height="720" poster="/poster.webp"></video>

<!-- Reserve space for dynamic content with aspect-ratio -->
<div style="aspect-ratio: 16/9; background: #f0f0f0;">
  <!-- Lazy-loaded content goes here -->
</div>

<!-- Font loading without layout shift -->
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<style>
  @font-face {
    font-family: "Inter";
    src: url("/fonts/inter.woff2") format("woff2");
    font-display: swap; /* Shows fallback immediately, swaps when loaded */
    size-adjust: 100%; /* Minimize shift between fallback and custom font */
  }
</style>
```

CLS optimization checklist:

- Set explicit `width` and `height` on all images and videos
- Use `aspect-ratio` CSS for dynamic containers
- Preload fonts with `font-display: swap` and `size-adjust`
- Avoid injecting content above existing content (banners, ads)
- Use `min-height` on containers that load dynamic content
- Use `transform` animations instead of `top`/`left`/`width`/`height`
- Avoid `document.write()` and late-loading CSS

### Bundle Size Optimization

```tsx
// BAD — importing entire library
import { format, parse, addDays, subDays, isAfter, isBefore } from "date-fns";

// GOOD — import only what you need (tree-shakeable)
import { format } from "date-fns/format";
import { addDays } from "date-fns/addDays";

// BAD — importing entire icon library
import { Icons } from "lucide-react";

// GOOD — import individual icons
import { Search, Plus, Trash2 } from "lucide-react";

// Dynamic import for heavy components
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("@/components/chart"), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false, // Skip SSR for client-only components
});

// Dynamic import for route-level code splitting
const AdminPanel = dynamic(() => import("@/components/admin-panel"));
```

Bundle size reduction strategies:

- Tree shaking: use ESM imports, avoid barrel files (`index.ts` re-exports)
- Dynamic imports: `next/dynamic` or `React.lazy()` for below-the-fold components
- Analyze bundle: `@next/bundle-analyzer` or `vite-bundle-visualizer`
- Replace heavy libraries with lighter alternatives:
  - `moment.js` (330KB) → `date-fns` (tree-shakeable) or `dayjs` (2KB)
  - `lodash` (72KB) → `lodash-es` (tree-shakeable) or native JS
  - `axios` (13KB) → native `fetch` API
  - `uuid` (4KB) → `crypto.randomUUID()` (built-in)
- Use `"sideEffects": false` in package.json for tree shaking
- Turbopack (Next.js 16 default) tree-shakes more aggressively than Webpack

### Image Optimization

Images account for 50-90% of page weight. Modern formats reduce payload by 60-80%:

```tsx
// Next.js Image — automatic optimization
import Image from "next/image";

<Image
  src="/resort-view.jpg"
  alt="Resort panoramic view"
  width={1200}
  height={800}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  quality={80}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>;

// For non-Next.js — use <picture> with format fallback
// <picture>
//   <source srcset="/image.avif" type="image/avif" />
//   <source srcset="/image.webp" type="image/webp" />
//   <img src="/image.jpg" alt="" width="800" height="600"
//        loading="lazy" decoding="async" />
// </picture>
```

Image optimization checklist:

- Use AVIF (50% smaller than WebP) with WebP fallback
- Serve responsive images with `srcset` and `sizes`
- Lazy load below-the-fold images (`loading="lazy"`)
- Set `decoding="async"` on non-critical images
- Use `placeholder="blur"` for perceived performance
- Compress: AVIF quality 60-70, WebP quality 75-85, JPEG quality 80-85
- Max dimensions: serve at 2x display size (retina), not larger
- Use CDN with automatic format negotiation (Cloudflare, Vercel, imgix)

### Rendering Strategy Selection

| Strategy                | TTFB       | LCP     | INP       | Best For                |
| ----------------------- | ---------- | ------- | --------- | ----------------------- |
| SSG (Static)            | ⚡ Fastest | ⚡ Best | ⚡ Best   | Marketing, docs, blog   |
| ISR (Incremental)       | ⚡ Fast    | ⚡ Good | ⚡ Best   | E-commerce, listings    |
| SSR (Server)            | 🔶 Medium  | 🔶 Good | ⚡ Best   | Personalized, real-time |
| RSC (Server Components) | ⚡ Fast    | ⚡ Good | ⚡ Best   | Dashboard, data-heavy   |
| CSR (Client)            | ⚡ Fast    | 🔴 Slow | 🔶 Medium | Private dashboards      |
| Streaming SSR           | ⚡ Fast    | ⚡ Good | ⚡ Best   | Complex pages, mixed    |

```tsx
// Next.js 16 — "use cache" for opt-in caching (replaces ISR)
async function ProductList() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const products = await getProducts();
  return <Grid products={products} />;
}

// Streaming with Suspense — show content progressively
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div>
      {/* Renders immediately */}
      <h1>Dashboard</h1>

      {/* Streams when ready */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentReservations />
      </Suspense>
    </div>
  );
}
```

### Font Optimization

```css
/* Preload critical fonts */
/* In <head>: <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin /> */

@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2");
  font-display: swap;
  font-weight: 100 900; /* Variable font — single file for all weights */
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}
```

Font optimization checklist:

- Use variable fonts (single file for all weights)
- Subset fonts to used character ranges (`unicode-range`)
- Preload critical fonts in `<head>`
- Use `font-display: swap` (or `optional` for non-critical)
- Self-host fonts instead of Google Fonts CDN (eliminates DNS lookup)
- Use `size-adjust` to minimize CLS during font swap
- WOFF2 format only — 30% smaller than WOFF, universal browser support

---

## Phase 3: Backend Performance

### API Response Time Optimization

Target: p95 ≤ 200ms for list endpoints, ≤ 100ms for detail endpoints.

```typescript
// PATTERN: Parallel data fetching — don't waterfall
// BAD — sequential (total: query1 + query2 + query3)
const users = await prisma.user.findMany();
const stats = await getStats();
const notifications = await getNotifications(userId);

// GOOD — parallel (total: max(query1, query2, query3))
const [users, stats, notifications] = await Promise.all([
  prisma.user.findMany({ where: { deletedAt: null } }),
  getStats(),
  getNotifications(userId),
]);

// PATTERN: Early return for unauthorized requests
export async function GET(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) return errorResponse("Unauthorized", 401); // Fast fail

  // Expensive operations only after auth check
  const data = await ExpensiveService.list(params);
  return successResponse(data);
}

// PATTERN: Streaming large responses
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const cursor = prisma.record.findMany({
        take: 100,
        cursor: { id: lastId },
      });
      for await (const batch of cursor) {
        controller.enqueue(encoder.encode(JSON.stringify(batch) + "\n"));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
```

### Multi-Tier Caching Strategy

```
Request → L1 (In-Memory) → L2 (Redis) → L3 (Database)
          ~0.1ms            ~1-5ms        ~10-100ms
```

```typescript
// L1: In-memory cache with Map (per-process, fastest)
const memoryCache = new Map<string, { data: any; expiry: number }>();

function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInMemory(key: string, data: any, ttlMs: number) {
  memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
}

// L2: Redis cache (shared across processes/instances)
import { Redis } from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: { memory: number; redis: number } = { memory: 30_000, redis: 300 },
): Promise<T> {
  // L1: Check in-memory
  const memResult = getFromMemory<T>(key);
  if (memResult) return memResult;

  // L2: Check Redis
  const redisResult = await redis.get(key);
  if (redisResult) {
    const parsed = JSON.parse(redisResult) as T;
    setInMemory(key, parsed, ttl.memory);
    return parsed;
  }

  // L3: Query database
  const dbResult = await queryFn();

  // Populate both caches
  setInMemory(key, dbResult, ttl.memory);
  await redis.setex(key, ttl.redis, JSON.stringify(dbResult));

  return dbResult;
}

// Usage
const stats = await cachedQuery(
  "dashboard:stats",
  () => DashboardService.getStats(),
  { memory: 60_000, redis: 300 }, // 1min memory, 5min Redis
);

// Cache invalidation — delete from both layers
async function invalidateCache(pattern: string) {
  // Clear memory cache entries matching pattern
  for (const key of memoryCache.keys()) {
    if (key.startsWith(pattern)) memoryCache.delete(key);
  }
  // Clear Redis cache entries matching pattern
  const keys = await redis.keys(`${pattern}*`);
  if (keys.length > 0) await redis.del(...keys);
}
```

### Cache Invalidation Patterns

```typescript
// Pattern 1: Cache-Aside with TTL (simplest, eventual consistency)
// Good for: dashboard stats, reports, non-critical data
await redis.setex("stats:daily", 300, JSON.stringify(stats)); // 5min TTL

// Pattern 2: Write-Through (immediate consistency)
// Good for: user profiles, settings, critical data
async function updateUser(id: string, data: UpdateUserInput) {
  const updated = await prisma.user.update({ where: { id }, data });
  await redis.setex(`user:${id}`, 3600, JSON.stringify(updated));
  return updated;
}

// Pattern 3: Event-Based Invalidation (best for distributed systems)
// Good for: multi-instance deployments, microservices
async function createReservation(data: CreateReservationInput) {
  const reservation = await prisma.reservation.create({ data });
  // Invalidate all related caches
  await Promise.all([
    invalidateCache("reservations:"),
    invalidateCache("dashboard:stats"),
    invalidateCache(`cabana:${data.cabanaId}:availability`),
  ]);
  return reservation;
}

// Pattern 4: Stale-While-Revalidate (best UX)
// Good for: frequently accessed, tolerance for brief staleness
async function swr<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number,
  staleTime: number,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age < ttl * 1000) return data; // Fresh
    if (age < staleTime * 1000) {
      // Stale — return cached, revalidate in background
      queryFn().then(async (fresh) => {
        await redis.setex(
          key,
          staleTime,
          JSON.stringify({ data: fresh, timestamp: Date.now() }),
        );
      });
      return data;
    }
  }
  // Miss or expired — fetch fresh
  const fresh = await queryFn();
  await redis.setex(
    key,
    staleTime,
    JSON.stringify({ data: fresh, timestamp: Date.now() }),
  );
  return fresh;
}
```

### HTTP Compression

```typescript
// Next.js — compression is automatic with Vercel/Node.js
// For custom Node.js servers:
import compression from "compression";
app.use(compression({ level: 6 })); // gzip level 6 (good balance)

// Brotli is 15-25% smaller than gzip — preferred for static assets
// nginx config:
// brotli on;
// brotli_types text/html text/css application/javascript application/json;
// brotli_comp_level 6;

// Dictionary compression (2026) — Zstandard with shared dictionaries
// 90%+ compression for API responses with similar structure
// Supported in Chrome 130+, Firefox 134+
```

Compression checklist:

- Enable Brotli for static assets (15-25% smaller than gzip)
- Use gzip level 6 for dynamic responses (good speed/ratio balance)
- Set `Cache-Control` headers for static assets: `public, max-age=31536000, immutable`
- Use `ETag` headers for conditional requests (304 Not Modified)
- Enable HTTP/2 or HTTP/3 for multiplexed connections
- Compress API responses — JSON compresses 70-90% with Brotli

### Connection Pooling

```typescript
// PostgreSQL — pg Pool configuration
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections in pool
  min: 5, // Min idle connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
  maxUses: 7500, // Close connection after N uses (prevent leaks)
  allowExitOnIdle: true, // Allow process to exit when pool is idle
});

// Monitor pool health
pool.on("error", (err) => {
  console.error("Pool error:", err.message);
});

// Log pool stats periodically
setInterval(() => {
  console.log({
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
}, 60000);
```

Connection pool sizing formula:

- **Optimal pool size** = (CPU cores × 2) + effective_spindle_count
- For SSD: pool size ≈ CPU cores × 2 + 1
- Example: 4-core server with SSD → pool size = 9-10
- Too many connections = context switching overhead
- Too few connections = request queuing
- Use PgBouncer for connection pooling at scale (100+ connections)

### Memory Management

```typescript
// Node.js — detect memory leaks
// Start with: node --max-old-space-size=512 --inspect server.js

// Monitor memory usage
function logMemory() {
  const usage = process.memoryUsage();
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`, // Total allocated
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`, // Actual usage
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
  });
}
setInterval(logMemory, 30000);

// Common memory leak patterns:
// 1. Growing Map/Set without cleanup
// 2. Event listeners not removed
// 3. Closures holding references to large objects
// 4. Global caches without eviction policy
// 5. Unresolved promises accumulating

// Fix: Use WeakMap/WeakRef for caches
const cache = new WeakMap<object, any>(); // GC-friendly

// Fix: Bounded LRU cache
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.maxSize) {
      // Delete oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
  }
}
```

---

## Phase 4: Database Performance

### Query Plan Analysis with EXPLAIN ANALYZE

```sql
-- Always use EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) for real execution stats
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT r.*, c.name as cabana_name
FROM "Reservation" r
JOIN "Cabana" c ON r."cabanaId" = c.id
WHERE r."deletedAt" IS NULL
  AND r.status = 'APPROVED'
  AND r."startDate" >= '2026-01-01'
ORDER BY r."createdAt" DESC
LIMIT 20;

-- What to look for in the output:
-- Seq Scan → needs an index (unless table is very small)
-- Nested Loop with inner Seq Scan → N+1 pattern, needs index on join column
-- Sort with high cost → add index matching ORDER BY
-- Hash Join → usually OK for large tables
-- Bitmap Heap Scan → good, using index efficiently
-- Index Only Scan → best case, all data from index
```

### Indexing Strategy

```sql
-- 1. COMPOSITE INDEX — for multi-column WHERE + ORDER BY
-- Most impactful optimization for list queries
CREATE INDEX CONCURRENTLY idx_reservation_status_date
ON "Reservation" (status, "startDate" DESC)
WHERE "deletedAt" IS NULL;  -- Partial index: only active records

-- 2. COVERING INDEX — includes all selected columns (Index Only Scan)
CREATE INDEX CONCURRENTLY idx_reservation_covering
ON "Reservation" (status, "startDate" DESC)
INCLUDE ("guestName", "totalPrice", "cabanaId")
WHERE "deletedAt" IS NULL;

-- 3. PARTIAL INDEX — index only relevant subset
-- Perfect for soft-delete pattern: index only non-deleted records
CREATE INDEX CONCURRENTLY idx_user_active_email
ON "User" (email)
WHERE "deletedAt" IS NULL;

-- 4. GIN INDEX — for full-text search and JSONB
CREATE INDEX CONCURRENTLY idx_product_search
ON "Product" USING GIN (to_tsvector('turkish', name || ' ' || COALESCE(description, '')));

-- 5. EXPRESSION INDEX — for computed lookups
CREATE INDEX CONCURRENTLY idx_user_email_lower
ON "User" (LOWER(email))
WHERE "deletedAt" IS NULL;
```

Prisma schema index definitions:

```prisma
model Reservation {
  id        String    @id @default(cuid())
  status    String
  startDate DateTime
  endDate   DateTime
  guestName String
  totalPrice Decimal
  cabanaId  String
  deletedAt DateTime?
  createdAt DateTime  @default(now())

  cabana Cabana @relation(fields: [cabanaId], references: [id])

  // Composite index for list queries
  @@index([status, startDate(sort: Desc)])
  // Index for soft-delete filtered lookups
  @@index([cabanaId, deletedAt])
  // Index for date range queries
  @@index([startDate, endDate])
}
```

### Index Maintenance

```sql
-- Find unused indexes (wasting write performance)
SELECT
  schemaname, tablename, indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (SELECT conindid FROM pg_constraint)
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (sequential scans on large tables)
SELECT
  schemaname, relname as table_name,
  seq_scan, seq_tup_read,
  idx_scan, idx_tup_fetch,
  pg_size_pretty(pg_relation_size(relid)) as table_size
FROM pg_stat_user_tables
WHERE seq_scan > 100
  AND pg_relation_size(relid) > 10000000  -- > 10MB
ORDER BY seq_tup_read DESC;

-- Reindex bloated indexes (after heavy UPDATE/DELETE)
REINDEX INDEX CONCURRENTLY idx_reservation_status_date;

-- Update statistics for query planner
ANALYZE "Reservation";
```

### N+1 Query Prevention

```typescript
// BAD — N+1: 1 query for list + N queries for relations
const reservations = await prisma.reservation.findMany({
  where: { deletedAt: null },
});
// Then in template: reservation.cabana.name → triggers N queries

// GOOD — Eager loading with include (1+1 queries)
const reservations = await prisma.reservation.findMany({
  where: { deletedAt: null },
  include: {
    cabana: { select: { id: true, name: true } },
    guest: { select: { id: true, name: true } },
  },
});

// GOOD — Select only needed fields (reduces data transfer)
const reservations = await prisma.reservation.findMany({
  where: { deletedAt: null },
  select: {
    id: true,
    guestName: true,
    startDate: true,
    status: true,
    totalPrice: true,
    cabana: { select: { name: true } },
  },
});

// GOOD — Batch loading for custom relations
const cabanaIds = reservations.map((r) => r.cabanaId);
const cabanas = await prisma.cabana.findMany({
  where: { id: { in: [...new Set(cabanaIds)] } },
});
const cabanaMap = new Map(cabanas.map((c) => [c.id, c]));
// Now: cabanaMap.get(reservation.cabanaId) — O(1) lookup

// DETECT N+1 — Prisma query logging
const prisma = new PrismaClient({
  log: [{ level: "query", emit: "event" }],
});
prisma.$on("query", (e) => {
  if (e.duration > 50) {
    console.warn(`Slow query (${e.duration}ms):`, e.query);
  }
});
```

### PostgreSQL Configuration Tuning

```ini
# postgresql.conf — tuning for 8GB RAM server

# Memory
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
work_mem = 64MB                   # Per-operation sort/hash memory
maintenance_work_mem = 512MB      # For VACUUM, CREATE INDEX

# Write Performance
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB

# Query Planner
random_page_cost = 1.1            # SSD (default 4.0 is for HDD)
effective_io_concurrency = 200    # SSD (default 1 is for HDD)
default_statistics_target = 200   # More accurate query plans

# Connections
max_connections = 100             # Use PgBouncer for more
```

### Batch Operations

```typescript
// BAD — individual creates in a loop
for (const item of items) {
  await prisma.product.create({ data: item }); // N round trips
}

// GOOD — createMany (single round trip)
await prisma.product.createMany({
  data: items,
  skipDuplicates: true,
});

// GOOD — transaction for mixed operations
await prisma.$transaction(
  items.map((item) =>
    prisma.product.upsert({
      where: { sku: item.sku },
      create: item,
      update: { price: item.price, updatedAt: new Date() },
    }),
  ),
);

// GOOD — raw SQL for bulk updates (fastest)
await prisma.$executeRaw`
  UPDATE "Product"
  SET "salePrice" = "purchasePrice" * 1.2,
      "updatedAt" = NOW()
  WHERE "categoryId" = ${categoryId}
    AND "deletedAt" IS NULL
`;
```

### Query Optimization Patterns

```typescript
// PATTERN: Cursor-based pagination (faster than offset for large datasets)
// Offset pagination: O(offset + limit) — gets slower as page increases
// Cursor pagination: O(limit) — constant time regardless of page

// BAD — offset pagination on large tables
const items = await prisma.reservation.findMany({
  skip: (page - 1) * limit, // Scans and discards skip rows
  take: limit,
  orderBy: { createdAt: "desc" },
});

// GOOD — cursor pagination
const items = await prisma.reservation.findMany({
  take: limit,
  ...(cursor && {
    skip: 1, // Skip the cursor itself
    cursor: { id: cursor },
  }),
  orderBy: { createdAt: "desc" },
  where: { deletedAt: null },
});
// Return: { items, nextCursor: items[items.length - 1]?.id }

// PATTERN: Count estimation for large tables
// Exact count is expensive on large tables (full table scan)
// Use estimate for UI "~1,234 results"
const estimate = await prisma.$queryRaw<[{ estimate: bigint }]>`
  SELECT reltuples::bigint AS estimate
  FROM pg_class
  WHERE relname = 'Reservation'
`;

// PATTERN: Materialized views for complex aggregations
// Instead of computing stats on every request:
await prisma.$executeRaw`
  CREATE MATERIALIZED VIEW IF NOT EXISTS daily_stats AS
  SELECT
    DATE("createdAt") as date,
    COUNT(*) as total_reservations,
    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
    SUM("totalPrice") as total_revenue
  FROM "Reservation"
  WHERE "deletedAt" IS NULL
  GROUP BY DATE("createdAt")
  ORDER BY date DESC
`;

-- Refresh periodically (e.g., every 5 minutes via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
```

---

## Phase 5: Performance Monitoring

### Key Metrics to Track

```typescript
// API endpoint timing middleware
export function withTiming(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const start = performance.now();
    const response = await handler(req, ...args);
    const duration = performance.now() - start;

    // Log slow endpoints
    if (duration > 200) {
      console.warn(
        `Slow API: ${req.method} ${req.url} — ${duration.toFixed(0)}ms`,
      );
    }

    // Add Server-Timing header for DevTools
    response.headers.set("Server-Timing", `total;dur=${duration.toFixed(1)}`);
    return response;
  };
}

// Database query timing (Prisma Client Extension)
const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const start = performance.now();
        const result = await query(args);
        const duration = performance.now() - start;

        if (duration > 50) {
          console.warn(
            `Slow query: ${model}.${operation} — ${duration.toFixed(0)}ms`,
          );
        }
        return result;
      },
    },
  },
});
```

### Performance Budget

Define and enforce performance budgets in CI/CD:

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-byte-weight": ["warning", { "maxNumericValue": 500000 }]
      }
    }
  }
}
```

```bash
# Run in CI
npx @lhci/cli autorun
```

### Real User Monitoring (RUM)

```typescript
// Track Core Web Vitals from real users
// Install: npm install web-vitals
import { onLCP, onINP, onCLS, onTTFB } from "web-vitals";

function sendMetric(metric: { name: string; value: number; id: string }) {
  // Send to your analytics endpoint
  navigator.sendBeacon(
    "/api/metrics",
    JSON.stringify({
      name: metric.name,
      value: Math.round(metric.value),
      page: window.location.pathname,
      timestamp: Date.now(),
    }),
  );
}

onLCP(sendMetric);
onINP(sendMetric);
onCLS(sendMetric);
onTTFB(sendMetric);
```

### Tools Reference

| Tool                        | Layer    | Purpose                         |
| --------------------------- | -------- | ------------------------------- |
| Lighthouse                  | Frontend | Core Web Vitals audit           |
| `@next/bundle-analyzer`     | Frontend | Bundle size visualization       |
| Chrome DevTools Performance | Frontend | Runtime profiling, flame charts |
| React DevTools Profiler     | Frontend | Component render timing         |
| React Doctor                | Frontend | Anti-pattern detection CLI      |
| `web-vitals`                | Frontend | Real User Monitoring            |
| `Server-Timing` header      | Backend  | API timing in DevTools          |
| `pg_stat_statements`        | Database | Slow query identification       |
| `EXPLAIN ANALYZE`           | Database | Query plan analysis             |
| `pg_stat_user_indexes`      | Database | Unused index detection          |
| `pg_stat_user_tables`       | Database | Sequential scan detection       |
| PgBouncer                   | Database | Connection pooling proxy        |
| Redis Insight               | Backend  | Cache monitoring                |
| `node --inspect`            | Backend  | Memory/CPU profiling            |
| OpenTelemetry               | All      | Distributed tracing             |

---

## Quick Reference: Optimization Checklist

### Frontend (Impact: High → Low)

1. ✅ Serve images in AVIF/WebP with responsive `srcset`
2. ✅ Preload LCP image with `fetchpriority="high"`
3. ✅ Use RSC — keep pages as Server Components, minimize `"use client"`
4. ✅ Dynamic import heavy components (`next/dynamic`, `React.lazy`)
5. ✅ Eliminate barrel file re-exports (kills tree shaking)
6. ✅ Self-host fonts, use variable fonts, `font-display: swap`
7. ✅ Set explicit dimensions on all images/videos (prevents CLS)
8. ✅ Use `Suspense` boundaries for streaming (progressive rendering)
9. ✅ Enable React Compiler for automatic memoization
10. ✅ Use `content-visibility: auto` for long lists

### Backend (Impact: High → Low)

1. ✅ Implement multi-tier caching (memory → Redis → DB)
2. ✅ Use `Promise.all` for parallel data fetching
3. ✅ Enable Brotli compression for responses
4. ✅ Set proper `Cache-Control` and `ETag` headers
5. ✅ Configure connection pool size correctly
6. ✅ Use streaming for large responses
7. ✅ Implement SWR (stale-while-revalidate) pattern
8. ✅ Monitor memory usage, use bounded LRU caches
9. ✅ Enable HTTP/2 or HTTP/3
10. ✅ Use CDN for static assets and API edge caching

### Database (Impact: High → Low)

1. ✅ Add composite indexes matching WHERE + ORDER BY patterns
2. ✅ Use partial indexes for soft-delete filtered queries
3. ✅ Fix N+1 queries with `include`/`select` or batch loading
4. ✅ Use `select` instead of `include` when you don't need all fields
5. ✅ Use cursor pagination instead of offset for large tables
6. ✅ Use `createMany` and raw SQL for bulk operations
7. ✅ Tune `shared_buffers`, `work_mem`, `random_page_cost`
8. ✅ Use covering indexes (INCLUDE) for Index Only Scans
9. ✅ Monitor and remove unused indexes
10. ✅ Use materialized views for complex aggregations
11. ✅ Run `ANALYZE` after large data changes
12. ✅ Use PgBouncer for connection pooling at scale

### Anti-Patterns to Avoid

- ❌ Importing entire libraries (`import _ from "lodash"`)
- ❌ Using `Float` for money fields (use `Decimal`)
- ❌ Hard deleting records (use soft delete)
- ❌ Offset pagination on tables with 100K+ rows
- ❌ Fetching all columns when you need 3 (`SELECT *`)
- ❌ Creating indexes on every column (slows writes)
- ❌ Caching without invalidation strategy
- ❌ Unbounded in-memory caches (memory leak)
- ❌ Synchronous file I/O in request handlers
- ❌ Missing `loading.tsx` / Suspense boundaries (blocks entire page)
- ❌ Lazy loading above-the-fold images (hurts LCP)
- ❌ Using `useEffect` for data fetching in RSC-capable apps
