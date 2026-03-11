---
inclusion: fileMatch
fileMatchPattern: "**/prisma/**,**/lib/prisma*,**/services/**,**/app/api/**"
---

# Prisma 7 + Next.js 16 + Fullstack Scaffold — Quick Reference (March 2026)

## Prisma 7 (Breaking Changes)

- Singleton: `src/lib/prisma.ts` — driver adapter (`@prisma/adapter-pg` + `pg.Pool`) REQUIRED
- Import from `@/generated/prisma/client` (NOT `@prisma/client`)
- Generator: `prisma-client` (not `prisma-client-js`), `output` field REQUIRED
- `prisma.config.ts` at project root — datasource, seed, shadow DB. Must `import "dotenv/config"`
- `$use()` middleware REMOVED — use `$extends()` Client Extensions (soft delete, logging, audit)
- ESM-first: `"type": "module"` in `package.json`
- 90% smaller bundle, 3x faster queries, native edge runtime
- Soft delete: ALWAYS filter `deletedAt: null`, or Client Extensions for auto-filtering
- Decimal: `Decimal` type (never Float), frontend must `parseFloat()` string values

## Next.js 16

- `proxy.ts` replaces `middleware.ts` — rename function `middleware` → `proxy`
- `"use cache"` directive for opt-in caching — `cacheLife("hours")`, `cacheTag("module-list")`
- `revalidateTag(tag, profile)` for SWR, `updateTag(tag)` for read-your-writes
- Turbopack default bundler — no flags needed, 2-5x faster builds
- React Compiler stable (opt-in `reactCompiler: true`) — auto-memoizes
- React 19.2: `<Activity>` for offscreen, `useEffectEvent` for stable callbacks

## Fullstack Scaffold

New page/API/CRUD module file structure:

- `page.tsx` (RSC) + `loading.tsx` + `_components/` + API route + service
- API routes: always `verifyToken()`, always `{ success, data, error }` response
- Service layer: static methods, `$transaction` for multi-step writes, audit logs
- Zod validation before Prisma operations
- `await searchParams` and `await params` (Next.js 15+)
- Role check: `["SYSTEM_ADMIN", "ADMIN"].includes(user.role)` for write ops
- Pagination: `Promise.all([findMany, count])` pattern

For full scaffold/pattern templates: activate powers `fullstack-scaffold` or `prisma-nextjs-patterns`.
