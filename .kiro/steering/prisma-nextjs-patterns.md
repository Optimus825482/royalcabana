---
inclusion: fileMatch
fileMatchPattern: "**/prisma/**,**/lib/prisma*,**/services/**,**/app/api/**"
---

# Prisma 7 + Next.js 16 — Quick Reference (March 2026)

When working with Prisma and API routes:

**Prisma 7 (Breaking Changes):**

- Singleton: `src/lib/prisma.ts` — driver adapter (`@prisma/adapter-pg` + `pg.Pool`) is REQUIRED
- Import from `../generated/prisma/client` (NOT `@prisma/client`) — generator is `prisma-client` (not `prisma-client-js`)
- `output` field REQUIRED in generator block — client lives in project source, not `node_modules`
- `prisma.config.ts` at project root — datasource config, seed command, shadow DB
- No automatic `.env` loading — must `import "dotenv/config"` in `prisma.config.ts`
- ESM-first: `"type": "module"` in `package.json`
- `$use()` middleware REMOVED — use `$extends()` Client Extensions for soft delete, logging, audit
- 90% smaller bundle (14MB → 1.6MB), 3x faster queries, native edge runtime support
- Soft delete: ALWAYS filter `deletedAt: null`, or use Client Extensions for auto-filtering
- Decimal: use `Decimal` type (never Float), frontend must `parseFloat()` string values

**Next.js 16:**

- `proxy.ts` replaces `middleware.ts` — rename function `middleware` → `proxy`
- `"use cache"` directive for opt-in caching — replaces implicit caching
- `cacheLife("hours")` for TTL, `cacheTag("reservations")` for tag-based invalidation
- `revalidateTag(tag, profile)` — background revalidation (SWR behavior)
- `updateTag(tag)` — read-your-writes (Server Actions, user sees changes immediately)
- `refresh()` — refresh uncached dynamic data (counters, live status)
- Turbopack is default bundler — no flags needed, 2-5x faster builds
- React Compiler stable (opt-in) — auto-memoizes, no manual `useMemo`/`useCallback`
- React 19.2: `<Activity>` for offscreen rendering, `useEffectEvent` for stable callbacks

**Unchanged conventions:**

- API response: always `{ success, data, error }` via `successResponse()`/`errorResponse()`
- N+1: use `include` or `select` for relations, never loop-fetch
- Transactions: `$transaction` for multi-step writes with audit logs
- Async gotchas: `await cookies()`, `await headers()`, `await searchParams`, `await params`
- Pagination: `buildPagination(page, limit, total)` helper

For full patterns (singleton, soft delete, Decimal, pagination, N+1, transactions, migration guide):
Activate power `prisma-nextjs-patterns` via Powers panel.
