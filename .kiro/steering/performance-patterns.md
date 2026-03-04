---
inclusion: fileMatch
fileMatchPattern: "**/services/**,**/app/api/**,**/lib/prisma*,**/prisma/**,**/middleware*,**/proxy*,**/*.config.ts,**/*.config.js,**/next.config.*,**/docker-compose*,**/Dockerfile*,**/nginx*"
---

# Performance Optimizer — Quick Reference (March 2026)

When working on backend services, API routes, database queries, or infrastructure config:

**Detection first — measure before optimizing:**

- API: `curl -s -w "TTFB: %{time_starttransfer}s\n"` for quick timing
- DB: `EXPLAIN (ANALYZE, BUFFERS)` before adding indexes
- Frontend: Lighthouse CI in pipeline, `web-vitals` for RUM
- Bundle: `ANALYZE=true npx next build` or `vite-bundle-visualizer`

**Database (highest impact):**

- Composite indexes matching WHERE + ORDER BY: `@@index([status, startDate(sort: Desc)])`
- Partial indexes for soft-delete: `WHERE "deletedAt" IS NULL`
- Covering indexes with INCLUDE for Index Only Scans
- N+1 fix: `include` or `select` with relations, never loop-fetch
- Cursor pagination for large tables (not offset)
- `createMany` / raw SQL for bulk operations
- `select` only needed fields — avoid fetching entire rows
- Monitor: `pg_stat_statements`, `pg_stat_user_indexes` for unused indexes

**Backend:**

- `Promise.all` for parallel data fetching — never waterfall
- Multi-tier cache: memory (Map/LRU, ~0.1ms) → Redis (~1-5ms) → DB (~10-100ms)
- Cache invalidation: write-through for critical data, SWR for dashboards
- Connection pool: (CPU cores × 2) + 1 for SSD, PgBouncer at scale
- Brotli compression for static, gzip level 6 for dynamic
- `Cache-Control: public, max-age=31536000, immutable` for static assets
- Streaming responses for large datasets (ReadableStream + ndjson)
- Bounded LRU caches — never unbounded Map (memory leak)

**Frontend:**

- LCP: preload hero image `fetchpriority="high"`, `priority` prop in Next.js Image
- INP: `startTransition` for non-urgent updates, break tasks >50ms
- CLS: explicit `width`/`height` on images, `font-display: swap`
- Bundle: tree-shake imports, dynamic import heavy components, kill barrel files
- Images: AVIF > WebP > JPEG, responsive `srcset` + `sizes`
- RSC by default, `"use client"` only for interactive components
- `Suspense` boundaries for streaming — progressive rendering

**Anti-patterns to catch:**

- ❌ `import _ from "lodash"` → use `lodash-es` or native
- ❌ `Float` for money → `Decimal`
- ❌ Offset pagination on 100K+ rows → cursor
- ❌ `SELECT *` when you need 3 fields → `select`
- ❌ Unbounded in-memory cache → LRU with maxSize
- ❌ Missing `loading.tsx` → blocks entire page render
- ❌ Lazy loading above-the-fold → hurts LCP

For full optimization phases (Detection → Frontend → Backend → Database → Monitoring):
Activate power `performance-optimizer` via Powers panel.
