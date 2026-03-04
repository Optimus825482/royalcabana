---
inclusion: fileMatch
fileMatchPattern: "**/prisma/**,**/lib/prisma*,**/services/**,**/app/api/**"
---

# Prisma + Next.js — Quick Reference

When working with Prisma and API routes:

- Singleton: `src/lib/prisma.ts` — never create new PrismaClient instances
- Soft delete: ALWAYS filter `deletedAt: null`, never hard delete
- Decimal: use `Decimal` type (never Float), frontend must `parseFloat()` string values
- API response: always `{ success, data, error }` via `successResponse()`/`errorResponse()`
- N+1: use `include` or `select` for relations, never loop-fetch
- Transactions: `$transaction` for multi-step writes with audit logs
- Async gotchas: `await cookies()`, `await headers()`, `await searchParams` (Next.js 15)
- Pagination: `buildPagination(page, limit, total)` helper

Refer to `.kiro/powers/prisma-nextjs-patterns/POWER.md` for full patterns.
