---
name: "fullstack-scaffold"
displayName: "Fullstack Scaffold Patterns"
description: "Scaffold patterns for new pages, API routes, and CRUD modules in Next.js 15 + Prisma + shadcn/ui projects. Role-based access, Turkish UI, English code."
keywords:
  [
    "scaffold-pattern",
    "crud-module",
    "nextjs-page",
    "api-route-template",
    "role-based-access",
  ]
author: "Erkan"
---

# Fullstack Scaffold Patterns

## Overview

Ready-to-use scaffold patterns for creating new pages, API routes, and complete CRUD modules in a Next.js 16 + Prisma 7 + shadcn/ui project. Each pattern follows the project conventions: service layer for business logic, thin API routes, role-based access control, Turkish UI labels, and English code/variable names.

### Platform Changes (March 2026)

**Prisma 7 — Major Breaking Changes:**

- Generator changed from `prisma-client-js` to `prisma-client`
- Client output is now in project source (e.g. `./generated/prisma`), not `node_modules`
- Import from generated path: `import { PrismaClient } from "../generated/prisma/client"` — NOT `@prisma/client`
- Driver adapters are **required** for all databases — no more direct URL connections
- New `prisma.config.ts` file replaces `.env` auto-loading for datasource config
- No automatic `.env` loading — must import `dotenv/config` manually in config
- ESM-first: `"type": "module"` required in `package.json`
- `$use()` middleware removed — use Client Extensions instead
- `npx prisma generate` outputs to project source directory

**Next.js 16 — Key Changes:**

- `proxy.ts` replaces `middleware.ts` for network boundary concerns (auth redirects, rewrites, geo-routing)
- `"use cache"` directive for cacheable pages/layouts/components — replaces manual `cache` and `revalidate` options
- `cacheLife()` and `cacheTag()` APIs for fine-grained cache control
- Turbopack is the **default** bundler — no webpack config needed, 2-5× faster dev builds
- React 19.2: `<Activity>` for offscreen rendering, `useEffectEvent` for stable callbacks, View Transitions API
- React Compiler is stable (opt-in) — auto-memoizes components, drastically reduces manual `useMemo`/`useCallback`

## New Page Scaffold

### File Structure for a New Module

```
src/app/(dashboard)/{role}/{module}/
├── page.tsx              # Server component — data fetching + layout
├── loading.tsx           # Skeleton loading state
├── _components/
│   ├── columns.tsx       # Table column definitions
│   ├── {module}-form.tsx # Create/edit form (client component)
│   └── {module}-table.tsx # Table wrapper (client component)
src/app/api/{module}/
├── route.ts              # GET (list) + POST (create)
├── [id]/
│   └── route.ts          # GET (detail) + PATCH (update) + DELETE (soft delete)
src/services/
└── {module}.service.ts   # Business logic
src/generated/prisma/
└── client/               # Prisma 7 generated client (output target)
prisma/
├── schema.prisma         # Database schema (generator: prisma-client)
├── prisma.config.ts      # Prisma 7 config (datasource, migrations, seed)
└── migrations/           # Migration files
proxy.ts                  # Next.js 16 proxy (replaces middleware.ts)
```

### Page Component (Server Component)

```tsx
// src/app/(dashboard)/admin/{module}/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable } from "./_components/{module}-table";
import { CreateModal } from "@/components/shared/create-modal";
import { ModuleForm } from "./_components/{module}-form";

export default async function ModulePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";

  // Fetch data server-side
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/{module}?page=${page}&search=${search}`,
    { cache: "no-store" },
  );
  const { data } = await res.json();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {/* Modül Adı */}
          </h1>
          <p className="text-muted-foreground">{/* Açıklama */}</p>
        </div>
        <CreateModal title="Yeni Ekle">
          <ModuleForm />
        </CreateModal>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable data={data?.items ?? []} pagination={data?.pagination} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Page Component with Cache (Static/Semi-Static Data)

```tsx
// src/app/(dashboard)/admin/{module}/page.tsx — cacheable variant
"use cache";
import { cacheLife, cacheTag } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTable } from "./_components/{module}-table";

export default async function ModulePage() {
  cacheLife("hours"); // Cache for 1 hour — options: "seconds", "minutes", "hours", "days", "weeks", "max"
  cacheTag("module-list"); // Tag for targeted revalidation via revalidateTag("module-list")

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/{module}`);
  const { data } = await res.json();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {/* Modül Adı */}
          </h1>
          <p className="text-muted-foreground">{/* Açıklama */}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleTable data={data?.items ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
```

> **When to use `"use cache"`**: Use for pages with mostly static or slowly-changing data (settings lists, category pages, dashboard summaries). Do NOT use for pages with dynamic search params, user-specific content, or real-time data. Turbopack (now default) makes dev iteration 2-5× faster — no config needed.

### Loading State

```tsx
// src/app/(dashboard)/admin/{module}/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Proxy (Replaces Middleware)

```typescript
// proxy.ts — Next.js 16 (replaces middleware.ts)
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  const publicPaths = ["/login", "/register", "/api/auth/login"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check auth token
  const token = request.cookies.get("token")?.value;
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // API routes — let verifyToken() handle auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}
```

> **`proxy.ts` vs `middleware.ts`**: In Next.js 16, `proxy.ts` is the new convention for network boundary logic — auth redirects, rewrites, geo-routing, header manipulation. Same API as middleware, different file name and execution model. Runs at the edge by default.

## API Route Scaffold

### List + Create Route

```typescript
// src/app/api/{module}/route.ts
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ModuleService } from "@/services/{module}.service";
import { createModuleSchema } from "@/lib/validations/{module}";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return errorResponse("Yetkisiz erişim", 401);

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || "";

    const result = await ModuleService.list({ page, limit, search });
    return successResponse(result);
  } catch {
    return errorResponse("Sunucu hatası", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return errorResponse("Yetkisiz erişim", 401);

    // Role check
    if (!["SYSTEM_ADMIN", "ADMIN"].includes(user.role)) {
      return errorResponse("Yetkiniz yok", 403);
    }

    const body = await req.json();
    const parsed = createModuleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 422);
    }

    const created = await ModuleService.create(parsed.data, user.id);
    return successResponse(created, 201);
  } catch {
    return errorResponse("Oluşturma hatası", 500);
  }
}
```

### Detail + Update + Delete Route

```typescript
// src/app/api/{module}/[id]/route.ts
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ModuleService } from "@/services/{module}.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await verifyToken(req);
    if (!user) return errorResponse("Yetkisiz erişim", 401);

    const { id } = await params;
    const item = await ModuleService.getById(id);
    if (!item) return errorResponse("Kayıt bulunamadı", 404);

    return successResponse(item);
  } catch {
    return errorResponse("Sunucu hatası", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await verifyToken(req);
    if (!user) return errorResponse("Yetkisiz erişim", 401);

    const { id } = await params;
    const body = await req.json();

    const updated = await ModuleService.update(id, body, user.id);
    return successResponse(updated);
  } catch {
    return errorResponse("Güncelleme hatası", 500);
  }
}

// Soft delete — NEVER hard delete
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await verifyToken(req);
    if (!user) return errorResponse("Yetkisiz erişim", 401);

    if (!["SYSTEM_ADMIN", "ADMIN"].includes(user.role)) {
      return errorResponse("Yetkiniz yok", 403);
    }

    const { id } = await params;
    await ModuleService.softDelete(id, user.id);
    return successResponse({ deleted: true });
  } catch {
    return errorResponse("Silme hatası", 500);
  }
}
```

## Service Layer Scaffold

```typescript
// src/services/{module}.service.ts — Prisma 7
// prisma singleton uses driver adapter (see src/lib/prisma.ts)
import { prisma } from "@/lib/prisma";
import { buildPagination } from "@/lib/pagination";

export class ModuleService {
  static async list(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;

    const where = {
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.module.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.module.count({ where }),
    ]);

    return { items, pagination: buildPagination(page, limit, total) };
  }

  static async getById(id: string) {
    return prisma.module.findFirst({
      where: { id, deletedAt: null },
    });
  }

  static async create(data: any, userId: string) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.module.create({ data });

      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entity: "Module",
          entityId: created.id,
          newValue: data,
        },
      });

      return created;
    });
  }

  static async update(id: string, data: any, userId: string) {
    return prisma.$transaction(async (tx) => {
      const old = await tx.module.findUnique({ where: { id } });

      const updated = await tx.module.update({
        where: { id },
        data,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          entity: "Module",
          entityId: id,
          oldValue: old as any,
          newValue: data,
        },
      });

      return updated;
    });
  }

  static async softDelete(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.module.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entity: "Module",
          entityId: id,
        },
      });
    });
  }
}
```

## Prisma 7 Setup

### Prisma Client Singleton

```typescript
// src/lib/prisma.ts — Prisma 7 with driver adapter (REQUIRED)
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const pool = new Pool({
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

> **Prisma 7 breaking change**: Driver adapters are now **required**. There is no direct URL connection mode. You must use `@prisma/adapter-pg` with a `pg.Pool` for PostgreSQL. Import `PrismaClient` from the generated path (`@/generated/prisma/client`), NOT from `@prisma/client`.

### Prisma Schema

```prisma
// prisma/schema.prisma — Prisma 7
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Module {
  id          String    @id @default(cuid())
  name        String
  description String?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

> **Generator change**: `prisma-client` replaces `prisma-client-js`. The `output` field is **required** — client is generated into project source, not `node_modules`. Always use a relative path from the schema file to your source directory.

### Prisma Config

```typescript
// prisma.config.ts — Prisma 7 (project root)
import "dotenv/config"; // REQUIRED — Prisma 7 does NOT auto-load .env
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

> **No automatic `.env` loading**: Prisma 7 does not auto-load `.env` files. You must explicitly `import "dotenv/config"` at the top of `prisma.config.ts`. This is a common gotcha during migration from Prisma 5/6.

### Client Extensions (Replaces $use Middleware)

```typescript
// src/lib/prisma.ts — with Client Extensions (Prisma 7)
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({ adapter });

  // Client Extensions replace $use() middleware
  return client.$extends({
    query: {
      $allModels: {
        // Auto-filter soft-deleted records on all findMany
        async findMany({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        // Auto-filter soft-deleted records on findFirst
        async findFirst({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

> **`$use()` removed in Prisma 7**: All middleware logic must migrate to Client Extensions (`$extends`). Extensions are type-safe and composable. Use `query` extensions for cross-cutting concerns like soft-delete filtering, logging, or performance tracking.

## Zod Validation Scaffold

```typescript
// src/lib/validations/{module}.ts
import { z } from "zod";

export const createModuleSchema = z.object({
  name: z.string().min(2, "En az 2 karakter gerekli"),
  description: z.string().optional(),
  // Add fields as needed
  // For Decimal fields (Prisma Decimal → string in JSON):
  // price: z.union([z.string(), z.number()]).transform(String),
});

export const updateModuleSchema = createModuleSchema.partial();

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
```

## Role-Based Access Pattern

```typescript
// src/lib/roles.ts
// Prisma 7: Import enums from generated path
import { Role } from "@/generated/prisma/client";

const ROLE_HIERARCHY: Record<Role, number> = {
  SYSTEM_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  STAFF: 40,
  CASHIER: 20,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

// Usage in API route:
// const user = await verifyToken(req);
// if (!user || !hasMinRole(user.role, "ADMIN")) {
//   return errorResponse("Yetkiniz yok", 403);
// }
```

## Checklist: New Module

When creating a new module, follow this order:

1. Add Prisma model to `prisma/schema.prisma` (generator: `prisma-client`, `output` field required)
2. Run `npx prisma migrate dev --name add-{module}`
3. Run `npx prisma generate` (generates to project source, e.g. `src/generated/prisma/client`)
4. Create Zod validation: `src/lib/validations/{module}.ts`
5. Create service: `src/services/{module}.service.ts` (imports from `@/lib/prisma` — singleton with driver adapter)
6. Create API routes: `src/app/api/{module}/route.ts` + `[id]/route.ts`
7. Create page: `src/app/(dashboard)/{role}/{module}/page.tsx` (add `"use cache"` for cacheable data)
8. Create loading: `src/app/(dashboard)/{role}/{module}/loading.tsx`
9. Create components: `_components/columns.tsx`, `{module}-form.tsx`, `{module}-table.tsx`
10. Add navigation link to sidebar
11. Test: `npx tsc --noEmit && npx next lint`

## Best Practices

### General

- Always `await params` and `await searchParams` (Next.js 15+)
- Always check auth with `verifyToken()` in every API route
- Always filter `deletedAt: null` in queries (or use Client Extensions for auto-filtering)
- Use `$transaction` for multi-step writes
- Create audit logs for all CUD operations
- Use Zod for input validation before Prisma
- Keep service methods static for simplicity
- Use `Promise.all` for parallel count + findMany
- Return `{ success, data, error }` from all endpoints

### Prisma 7

- Import from `@/generated/prisma/client`, **never** from `@prisma/client`
- Use driver adapters (`@prisma/adapter-pg` + `pg` Pool) — direct URL connection is removed
- Generator is `prisma-client` (not `prisma-client-js`), `output` field is required
- Configure datasource in `prisma.config.ts` with explicit `import "dotenv/config"`
- Ensure `"type": "module"` in `package.json` for ESM compatibility
- Run `npx prisma generate` after schema changes — output goes to project source
- Use Client Extensions (`$extends`) instead of `$use()` middleware (removed)
- `Decimal` fields serialize as strings in JSON — use `parseFloat()` on frontend

### Next.js 16

- Turbopack is the default bundler — no webpack config needed, 2-5× faster dev builds
- Use `"use cache"` directive for cacheable pages/layouts instead of manual `cache` options
- Use `cacheLife()` for TTL control: `"seconds"`, `"minutes"`, `"hours"`, `"days"`, `"weeks"`, `"max"`
- Use `cacheTag()` for targeted revalidation via `revalidateTag()`
- `proxy.ts` replaces `middleware.ts` for network boundary concerns (auth redirects, rewrites)
- React 19.2: `<Activity>` for offscreen rendering, `useEffectEvent` for stable callbacks, View Transitions API
- React Compiler is stable (opt-in) — auto-memoizes components, reduces manual `useMemo`/`useCallback`
- No need for `React.memo()` wrappers when React Compiler is enabled
