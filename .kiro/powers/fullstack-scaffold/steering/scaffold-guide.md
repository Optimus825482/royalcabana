---
inclusion: fileMatch
fileMatchPattern: "**/app/(dashboard)/**,**/app/api/**,**/services/**"
---

# Fullstack Scaffold — Quick Reference

When creating new pages, API routes, or CRUD modules:

- File structure: page.tsx (RSC) + loading.tsx + \_components/ + API route + service
- API routes: always `verifyToken()`, always `{ success, data, error }` response
- Service layer: static methods, `$transaction` for multi-step writes, audit logs
- Soft delete only: `deletedAt: null` filter in all queries, never hard delete
- Zod validation before Prisma operations
- `await searchParams` and `await params` (Next.js 15)
- Role check: `["SYSTEM_ADMIN", "ADMIN"].includes(user.role)` for write ops
- Pagination: `Promise.all([findMany, count])` pattern

Refer to `.kiro/powers/fullstack-scaffold/POWER.md` for full scaffold templates.
