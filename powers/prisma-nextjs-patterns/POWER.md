---
name: "prisma-nextjs-patterns"
displayName: "Prisma + Next.js Patterns"
description: "Production patterns for Prisma ORM with Next.js 15 App Router. Covers client singleton, soft delete, Decimal handling, type-safe API responses, pagination, and N+1 prevention."
keywords:
  [
    "prisma-pattern",
    "nextjs-api",
    "soft-delete",
    "decimal-handling",
    "type-safe-response",
  ]
author: "Erkan"
---

# Prisma + Next.js Patterns

## Overview

Production-ready patterns for using Prisma ORM 7 with Next.js 16 App Router. This power covers the Prisma client singleton with mandatory driver adapters, soft delete via Client Extensions (replacing removed `$use()` middleware), Decimal field serialization, type-safe API response format, server-side pagination, N+1 query prevention, transaction patterns, and comprehensive migration guidance for Prisma 7 + Next.js 16.

All patterns follow the project convention: service layer in `src/services/`, thin API routes in `src/app/api/`, JWT auth via `src/lib/auth.ts`.

## Prisma Client Singleton

Prisma 7 removed the Rust query engine entirely — the client is now pure TypeScript. Driver adapters are mandatory, and the generated client lives in your project source (not `node_modules`):

```typescript
// src/lib/prisma.ts — Prisma 7 with mandatory driver adapter
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Key changes from Prisma 6:

- Import from `../generated/prisma/client` (not `@prisma/client`)
- Driver adapter (`@prisma/adapter-pg`) is REQUIRED — Rust engine completely removed
- Connection pool managed by `pg` directly — you control `max`, timeouts
- 90% smaller bundle (14MB → 1.6MB), 3x faster queries on large result sets
- Works natively on edge runtimes (Cloudflare Workers, Vercel Edge, Deno, Bun)
- 98% fewer types to evaluate, 70% faster type checking
- `$use()` middleware removed — use `$extends()` Client Extensions instead

## Soft Delete via Client Extensions

Prisma 7 removed `$use()` middleware. Use `$extends()` for soft delete:

```typescript
// src/lib/prisma.ts — with soft delete extension
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        // Auto-filter soft-deleted records on all reads
        async findMany({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findUnique({ args, query }) {
          // findUnique doesn't support arbitrary where — use as-is
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        // Convert delete to soft delete
        async delete({ args, query }) {
          return (query as any)({
            ...args,
            data: { deletedAt: new Date(), isDeleted: true },
          });
        },
        async deleteMany({ args, query }) {
          return (query as any)({
            ...args,
            data: { deletedAt: new Date(), isDeleted: true },
          });
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Why Client Extensions over middleware:

- `$use()` is removed in Prisma 7 — no migration path, must rewrite
- `$extends()` is type-safe and composable
- Extensions can be chained: `new PrismaClient({ adapter }).$extends(softDelete).$extends(logging)`
- Each extension gets its own typed return — no `any` leaks

## Type-Safe API Response

ALL API routes must return this format:

```typescript
// src/lib/api-response.ts
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } satisfies ApiResponse<T>, {
    status,
  });
}

export function errorResponse(error: string, status = 400): Response {
  return Response.json({ success: false, error } satisfies ApiResponse, {
    status,
  });
}
```

## API Route Pattern with Auth

```typescript
// src/app/api/{resource}/route.ts
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET — List with pagination
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return errorResponse("Yetkisiz erişim", 401);

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || "";

    const where = {
      deletedAt: null, // Soft delete filter — ALWAYS include
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.resource.count({ where }),
    ]);

    return successResponse({
      items: data,
      pagination: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse("Sunucu hatası", 500);
  }
}

// POST — Create
export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return errorResponse("Yetkisiz erişim", 401);

    const body = await req.json();
    // Validate with Zod schema here

    const created = await prisma.resource.create({ data: body });
    return successResponse(created, 201);
  } catch (error) {
    return errorResponse("Oluşturma hatası", 500);
  }
}
```

## Soft Delete Pattern

NEVER use hard delete. Always soft delete with `deletedAt`:

```typescript
// Soft delete — set deletedAt timestamp
async function softDelete(id: string, userId: string) {
  return prisma.resource.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isDeleted: true,
    },
  });
}

// ALWAYS filter soft-deleted records in queries
const activeRecords = await prisma.resource.findMany({
  where: { deletedAt: null },
});

// For models with isDeleted field, use both:
const records = await prisma.resource.findMany({
  where: {
    isDeleted: false,
    deletedAt: null,
  },
});

// If using the Client Extension above, soft delete is automatic.
// Manual deletedAt: null is still recommended as defense-in-depth.
```

## Decimal Field Handling

Prisma `Decimal` fields serialize as strings in JSON. Handle carefully:

```typescript
// In API response — Decimal auto-serializes to string
// Frontend must parseFloat()

// When creating/updating — pass string or number
await prisma.product.create({
  data: {
    purchasePrice: 150.5, // number OK
    salePrice: "200.00", // string OK
    // NEVER use Float type in schema — always Decimal
  },
});

// In frontend components
function PriceCell({ value }: { value: string | null }) {
  const num = parseFloat(value ?? "0");
  return (
    <span>
      {new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(num)}
    </span>
  );
}

// Decimal import path changed in Prisma 7 — from generated output
import { Decimal } from "../generated/prisma/client/runtime/library";

const price = new Decimal("150.50");
price.greaterThan(new Decimal("100")); // true
```

## Pagination Helper

```typescript
// src/lib/pagination.ts
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

export function getPaginationParams(
  searchParams: URLSearchParams,
): PaginationParams {
  return {
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20)),
  };
}

export function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    pageCount: Math.ceil(total / limit),
  };
}
```

## N+1 Prevention with Include/Select

```typescript
// BAD — N+1 query
const reservations = await prisma.reservation.findMany();
// Then looping to fetch cabana for each → N+1

// GOOD — Eager loading with include
const reservations = await prisma.reservation.findMany({
  where: { deletedAt: null },
  include: {
    cabana: { select: { id: true, name: true } },
    guest: { select: { id: true, name: true, vipLevel: true } },
    concept: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: "desc" },
});

// GOOD — Select only needed fields for performance
const reservations = await prisma.reservation.findMany({
  where: { deletedAt: null },
  select: {
    id: true,
    guestName: true,
    startDate: true,
    endDate: true,
    status: true,
    totalPrice: true,
    cabana: { select: { name: true } },
  },
});
```

## Transaction Pattern

```typescript
// Use transactions for multi-step operations
async function approveReservation(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Update reservation status
    const reservation = await tx.reservation.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    // 2. Create status history
    await tx.reservationStatusHistory.create({
      data: {
        reservationId: id,
        fromStatus: "PENDING",
        toStatus: "APPROVED",
        changedBy: userId,
      },
    });

    // 3. Create notification
    await tx.notification.create({
      data: {
        userId: reservation.userId,
        type: "APPROVED",
        title: "Rezervasyon Onaylandı",
        message: `${reservation.guestName} rezervasyonu onaylandı.`,
      },
    });

    // 4. Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: "APPROVE",
        entity: "Reservation",
        entityId: id,
        newValue: { status: "APPROVED" },
      },
    });

    return reservation;
  });
}
```

## Service Layer Pattern

```typescript
// src/services/reservation.service.ts
import { prisma } from "@/lib/prisma";
import { PaginationParams, buildPagination } from "@/lib/pagination";

export class ReservationService {
  static async list(
    params: PaginationParams & { search?: string; status?: string },
  ) {
    const { page, limit, search, status } = params;

    const where = {
      deletedAt: null,
      ...(search && {
        guestName: { contains: search, mode: "insensitive" as const },
      }),
      ...(status && { status: status as any }),
    };

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          cabana: { select: { id: true, name: true } },
          concept: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.reservation.count({ where }),
    ]);

    return { items, pagination: buildPagination(page, limit, total) };
  }

  static async getById(id: string) {
    return prisma.reservation.findFirst({
      where: { id, deletedAt: null },
      include: {
        cabana: true,
        guest: true,
        concept: { include: { products: { include: { product: true } } } },
        extraItems: { include: { product: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });
  }
}
```

## Prisma 7 Migration Guide

### Breaking Changes Summary

Prisma 7 (late 2025) is the biggest breaking release in Prisma history. The entire Rust-based query engine has been removed and rewritten in TypeScript. Key impacts:

- Rust engine removed → pure TypeScript, 90% smaller (14MB → 1.6MB)
- 3x faster queries on large result sets
- 98% fewer types to evaluate, 70% faster `tsc` type checking
- Native edge runtime support (no binary compatibility issues)
- `$use()` middleware API removed → use `$extends()` Client Extensions
- ESM is the default module format
- No automatic `.env` loading → must `import "dotenv/config"` manually
- Minimum versions: Node.js 20.19+, TypeScript 5.4+

### Schema Changes

```prisma
// prisma/schema.prisma — Prisma 7 style

generator client {
  provider = "prisma-client"            // CHANGED: was "prisma-client-js"
  output   = "../src/generated/prisma"  // REQUIRED: no more node_modules
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // directUrl deprecated — use prisma.config.ts instead
}
```

Key schema changes:

- `provider` is now `"prisma-client"` (not `"prisma-client-js"`)
- `output` is REQUIRED — client no longer lives in `node_modules`
- `directUrl` in datasource is deprecated — move to `prisma.config.ts`

### prisma.config.ts

New configuration file at project root replaces some datasource fields:

```typescript
// prisma.config.ts — project root
import "dotenv/config"; // Manual .env loading required in Prisma 7
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
```

Why `prisma.config.ts`:

- Centralizes all Prisma configuration in one typed file
- Replaces `directUrl` and `shadowDatabaseUrl` from schema datasource
- Seed command defined here (not in `package.json` anymore)
- Supports programmatic env loading — no magic `.env` auto-load

### ESM-First Setup

Prisma 7 ships as ES module. Required changes:

```jsonc
// package.json
{
  "type": "module",
}
```

```jsonc
// tsconfig.json — required compiler options
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
  },
}
```

### Import Path Changes

```typescript
// Before (Prisma 6 and earlier)
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// After (Prisma 7)
import { PrismaClient } from "../generated/prisma/client";
import { Decimal } from "../generated/prisma/client/runtime/library";
// Path depends on your generator output setting
```

### Driver Adapter Setup

All databases now require explicit driver adapters. The built-in Rust engine no longer exists.

```typescript
// PostgreSQL — @prisma/adapter-pg
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000, // pg default is 0 (no timeout)
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

Install required packages:

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

### Middleware to Client Extensions Migration

```typescript
// BEFORE (Prisma 6) — $use() middleware — REMOVED in Prisma 7
prisma.$use(async (params, next) => {
  if (params.action === "findMany") {
    params.args.where = { ...params.args.where, deletedAt: null };
  }
  return next(params);
});

// AFTER (Prisma 7) — $extends() Client Extensions
const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async delete({ args, query }) {
        // Convert hard delete to soft delete
        return (query as any)({
          ...args,
          data: { deletedAt: new Date(), isDeleted: true },
        });
      },
    },
  },
});
```

Key differences:

- `$extends()` is type-safe, `$use()` was not
- Extensions are composable and chainable
- Each extension can add custom model methods, computed fields, or query overrides
- No `params.action` string matching — each action is a separate function

### Migration Checklist

1. Update `prisma/schema.prisma` — change provider to `"prisma-client"`, add `output`
2. Create `prisma.config.ts` — move directUrl, shadow DB config, seed command
3. Add `"type": "module"` to `package.json`
4. Update `tsconfig.json` — `module: "ESNext"`, `moduleResolution: "bundler"`
5. Install driver adapter: `npm install @prisma/adapter-pg pg`
6. Update all imports from `@prisma/client` → `./generated/prisma/client`
7. Update `src/lib/prisma.ts` — add Pool + adapter setup
8. Replace all `$use()` middleware with `$extends()` Client Extensions
9. Add `import "dotenv/config"` where env vars are needed (no auto-loading)
10. Run `npx prisma generate` — verify output directory
11. Update `.gitignore` — add `src/generated/` (generated code, don't commit)
12. Update Dockerfile — ensure `prisma generate` runs after `npm install`
13. Run `npx prisma migrate dev` — verify migrations still work
14. Run `npx tsc --noEmit` — verify no type errors from import changes

### Edge Runtime Support

Prisma 7's pure TypeScript architecture works natively on edge runtimes:

```typescript
// Works in Cloudflare Workers, Vercel Edge, Deno, Bun
// No binary compatibility issues — pure TypeScript
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// For edge: use connection pooler (e.g., PgBouncer, Supabase pooler, Neon)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // pooler URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

No more `binaryTargets` in schema — that concept is gone with the Rust engine.

## Next.js 16 Features

### Turbopack Default

Turbopack is now the default bundler in Next.js 16 for both dev and production:

```bash
# Turbopack is automatic — no flag needed
next dev        # Uses Turbopack by default
next build      # Uses Turbopack by default

# Opt out if needed (not recommended)
next dev --webpack
next build --webpack
```

Benefits:

- 2-5x faster production builds compared to Webpack
- Up to 10x faster Fast Refresh
- Filesystem caching (beta) for even faster restarts across sessions
- Automatic Babel detection — if babel config exists, Turbopack uses it

Enable filesystem caching for large projects:

```typescript
// next.config.ts
const config: NextConfig = {
  turbopack: {
    unstable_fileSystemCache: true,
  },
};
```

### Cache Components (replaces implicit caching)

Next.js 16 makes caching entirely opt-in with the `"use cache"` directive. No more implicit caching — all dynamic code runs at request time by default:

```tsx
// Cached server component — opt-in with "use cache"
async function BlogPosts() {
  "use cache";
  const posts = await prisma.post.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return <PostList posts={posts} />;
}

// Cache with time-based revalidation using cacheLife()
import { cacheLife } from "next/cache";

async function DashboardStats() {
  "use cache";
  cacheLife("hours"); // Built-in profiles: "max", "hours", "days", "minutes"
  const stats = await getStats();
  return <StatsGrid stats={stats} />;
}

// Cache with tag-based invalidation using cacheTag()
import { cacheTag } from "next/cache";

async function ReservationList() {
  "use cache";
  cacheTag("reservations");
  cacheLife("minutes");
  const reservations = await prisma.reservation.findMany({
    where: { deletedAt: null },
  });
  return <ReservationTable data={reservations} />;
}
```

Enable Cache Components in config:

```typescript
// next.config.ts
const config: NextConfig = {
  cacheComponents: true, // was experimental.ppr — now renamed
};
```

### Cache Invalidation APIs

Next.js 16 introduces refined cache invalidation with three distinct APIs:

```typescript
// revalidateTag() — updated, now requires cacheLife profile
import { revalidateTag } from "next/cache";

// SWR behavior: serve stale, revalidate in background
await revalidateTag("reservations", "max");
// Second arg: cacheLife profile name or { expire: number }

// updateTag() — NEW, Server Actions only, read-your-writes
import { updateTag } from "next/cache";

// Expires cache AND reads fresh data in same request
// Perfect for forms where user expects to see changes immediately
async function approveReservation(id: string) {
  "use server";
  await prisma.reservation.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  updateTag("reservations"); // User sees updated data instantly
}

// refresh() — NEW, Server Actions only, uncached data only
import { refresh } from "next/cache";

// Refreshes dynamic (uncached) data without touching cache
// Use for live metrics, notification counts, status indicators
async function markNotificationRead(id: string) {
  "use server";
  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  refresh(); // Refresh uncached data on the page
}
```

When to use which:

- `revalidateTag(tag, profile)` — Background revalidation, eventual consistency OK
- `updateTag(tag)` — User must see changes immediately (forms, settings)
- `refresh()` — Refresh uncached dynamic data (counters, live status)

### proxy.ts (replaces middleware.ts)

Next.js 16 renames `middleware.ts` to `proxy.ts` to clarify the network boundary. Runs on Node.js runtime by default:

```typescript
// proxy.ts — project root (was middleware.ts)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  // Same logic as middleware — just renamed function
  const token = request.cookies.get("token")?.value;

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

Migration: Rename `middleware.ts` → `proxy.ts`, rename exported function `middleware` → `proxy`. Logic stays the same. `middleware.ts` still works but is deprecated and will be removed in a future version.

### React 19.2 Features

```tsx
// <Activity> component — offscreen rendering without unmounting
import { Activity } from "react";

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  // Hides with display:none but maintains state and cleans up Effects
  return <Activity mode={active ? "visible" : "hidden"}>{children}</Activity>;
}

// useEffectEvent — stable event handler reference
import { useEffectEvent } from "react";

function Chat({ roomId }: { roomId: string }) {
  const onMessage = useEffectEvent((msg: string) => {
    showNotification(msg);
  });

  useEffect(() => {
    const conn = connect(roomId, onMessage);
    return () => conn.disconnect();
  }, [roomId]); // onMessage not needed in deps — always stable
}

// View Transitions API — animate between navigations
import { useTransition } from "react";
import { useRouter } from "next/navigation";

function NavigationLink({ href }: { href: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        startTransition(() => {
          // View transition animates automatically
          router.push(href);
        });
      }}
    >
      {isPending ? "Yükleniyor..." : "Git"}
    </a>
  );
}
```

### React Compiler (Stable)

React Compiler is stable in Next.js 16 — automatic memoization with zero manual code changes:

```typescript
// next.config.ts — opt-in (not default yet)
const config: NextConfig = {
  reactCompiler: true, // Promoted from experimental to stable
};
```

What it does:

- Automatically memoizes components, hooks, and expressions
- No more manual `useMemo`, `useCallback`, `React.memo` needed
- Relies on Babel — expect slightly higher compile times
- Enable gradually: per-file with `"use memo"` directive if needed

## Next.js App Router Gotchas

```typescript
// cookies() and headers() are ASYNC in App Router — always await
import { cookies, headers } from "next/headers";

export async function GET() {
  const cookieStore = await cookies(); // AWAIT required
  const headerList = await headers(); // AWAIT required
  const token = cookieStore.get("token")?.value;
}

// searchParams is a Promise in Next.js 15+ — always await
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams; // AWAIT required
  const page = Number(params.page) || 1;
}

// params is also a Promise in Next.js 15+ — always await
export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // AWAIT required
}

// "use cache" is NOT "use server" — don't confuse them
// "use cache" = cache the result of this function/component
// "use server" = run this function on the server (Server Action)
// A component can use both: cached server component

// proxy.ts replaces middleware.ts in Next.js 16
// Rename: middleware.ts → proxy.ts
// Rename: export function middleware → export function proxy
// middleware.ts is deprecated but still works for Edge runtime

// Turbopack is now the default bundler — no flags needed
// If something works in dev but breaks in build, check for:
// - Dynamic imports with complex expressions
// - CSS modules with unusual selectors
// - Barrel file re-exports (Turbopack tree-shakes more aggressively)
// - Automatic Babel detection may change behavior if babel config exists

// React Compiler (opt-in) can break components with side effects in render
// Enable gradually: per-file with "use memo" directive
// Or globally via next.config.ts reactCompiler: true

// revalidateTag() now requires a second argument (cacheLife profile)
// Old: revalidateTag("reservations")
// New: revalidateTag("reservations", "max")

// All parallel route slots now require explicit default.js files
// Builds fail without them — create default.js that returns null or notFound()

// next/image defaults changed:
// - minimumCacheTTL: 60s → 14400s (4 hours)
// - 16px removed from default imageSizes
// - qualities default changed to [75]

// next lint command removed — use Biome or ESLint directly
// next build no longer runs linting automatically
```

## Best Practices

### Prisma 7

- Use driver adapters — `@prisma/adapter-pg` for PostgreSQL, no alternative
- Set `output` in generator block — client lives in your source tree, not `node_modules`
- Import from generated path (`../generated/prisma/client`), not `@prisma/client`
- Use `prisma.config.ts` for datasource configuration, seed command, shadow DB
- Control connection pool via `pg` Pool options (`max`, `connectionTimeoutMillis`)
- Add `src/generated/` to `.gitignore` — regenerate on build with `prisma generate`
- Use `$extends()` Client Extensions for cross-cutting concerns (soft delete, logging, audit)
- Never use `$use()` middleware — it's removed in Prisma 7
- Use `Decimal` type for money fields, never `Float`
- Always use `deletedAt: null` in WHERE clauses (soft delete defense-in-depth)
- Add `import "dotenv/config"` in `prisma.config.ts` — no automatic `.env` loading
- ESM-first: `"type": "module"` in `package.json`, `"module": "ESNext"` in tsconfig
- Minimum versions: Node.js 20.19+, TypeScript 5.4+

### Next.js 16

- Turbopack is default — no flags needed for dev or build
- Use `"use cache"` directive for explicit, opt-in component-level caching
- `cacheLife()` for time-based profiles: `"max"`, `"hours"`, `"days"`, `"minutes"`
- `cacheTag()` for tag-based invalidation inside cached components
- `revalidateTag(tag, profile)` for SWR background revalidation
- `updateTag(tag)` in Server Actions for read-your-writes (user sees changes immediately)
- `refresh()` in Server Actions for uncached dynamic data (counters, live status)
- Rename `middleware.ts` → `proxy.ts`, function `middleware` → `proxy`
- React Compiler is stable but opt-in — enable with `reactCompiler: true` in config
- `<Activity>` component for tab/offscreen rendering without unmounting state
- `useEffectEvent` for stable callbacks without stale closures
- View Transitions for animated navigations via `startTransition`
- All parallel route slots require explicit `default.js` files
- `next lint` removed — use ESLint or Biome directly
- Node.js 20.9+ required, TypeScript 5+ required

### General

- Return `{ success, data, error }` from all API routes — no exceptions
- Use `include` or `select` to prevent N+1 queries — never loop-fetch
- Wrap multi-step operations in `$transaction` for atomicity
- Keep business logic in `src/services/`, API routes thin
- Use `Promise.all` for parallel independent queries (count + findMany)
- Always `await cookies()`, `await headers()`, `await searchParams`, `await params`
- Use Zod for request body validation before Prisma operations
- Auth check (`verifyToken()`) at the top of every API route handler
- Soft delete only — never hard delete, use `deletedAt` + `isDeleted` fields
- `Decimal` fields serialize as strings — `parseFloat()` on frontend
- Environment secrets in `.env.local` only, never in `.env`
