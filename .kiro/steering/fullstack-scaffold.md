---
inclusion: fileMatch
fileMatchPattern: "**/app/(dashboard)/**,**/app/api/**,**/services/**"
---

# Fullstack Scaffold — Quick Reference (March 2026)

When creating new pages, API routes, or CRUD modules:

**File structure:**

- page.tsx (RSC) + loading.tsx + \_components/ + API route + service
- `proxy.ts` at project root (replaces `middleware.ts` in Next.js 16)
- `prisma.config.ts` at project root (Prisma 7 config — datasource, seed, migrations)
- `src/generated/prisma/client/` — Prisma 7 generated client output

**Prisma 7 conventions:**

- Generator: `prisma-client` (not `prisma-client-js`), `output` field REQUIRED
- Import from `@/generated/prisma/client`, NOT `@prisma/client`
- Driver adapter (`@prisma/adapter-pg` + `pg.Pool`) is REQUIRED — no direct URL connection
- `$use()` middleware REMOVED — use `$extends()` Client Extensions for soft delete auto-filtering
- `import "dotenv/config"` in `prisma.config.ts` — no automatic `.env` loading

**Next.js 16 conventions:**

- `proxy.ts` replaces `middleware.ts` — same API, rename function `middleware` → `proxy`
- `"use cache"` directive for cacheable pages — `cacheLife("hours")`, `cacheTag("module-list")`
- Turbopack is default bundler — no webpack config needed, 2-5x faster dev builds
- React Compiler stable (opt-in via `reactCompiler: true` in next.config.ts)

**Unchanged conventions:**

- API routes: always `verifyToken()`, always `{ success, data, error }` response
- Service layer: static methods, `$transaction` for multi-step writes, audit logs
- Soft delete only: `deletedAt: null` filter in all queries, never hard delete
- Zod validation before Prisma operations
- `await searchParams` and `await params` (Next.js 15+)
- Role check: `["SYSTEM_ADMIN", "ADMIN"].includes(user.role)` for write ops
- Pagination: `Promise.all([findMany, count])` pattern

For full scaffold templates (page, API, service, validation, loading, proxy, prisma config):
Activate power `fullstack-scaffold` via Powers panel.
