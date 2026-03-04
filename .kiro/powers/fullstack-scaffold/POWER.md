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

Ready-to-use scaffold patterns for creating new pages, API routes, and complete CRUD modules in a Next.js 15 + Prisma + shadcn/ui project. Each pattern follows the project conventions: service layer for business logic, thin API routes, role-based access control, Turkish UI labels, and English code/variable names.

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
// src/services/{module}.service.ts
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

## Zod Validation Scaffold

```typescript
// src/lib/validations/{module}.ts
import { z } from "zod";

export const createModuleSchema = z.object({
  name: z.string().min(2, "En az 2 karakter gerekli"),
  description: z.string().optional(),
  // Add fields as needed
  // For Decimal fields:
  // price: z.union([z.string(), z.number()]).transform(String),
});

export const updateModuleSchema = createModuleSchema.partial();

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
```

## Role-Based Access Pattern

```typescript
// Middleware-style role check for API routes
import { Role } from "@prisma/client";

const ROLE_HIERARCHY: Record<Role, number> = {
  SYSTEM_ADMIN: 100,
  ADMIN: 80,
  CASINO_USER: 40,
  FNB_USER: 20,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Usage in API route
const user = await verifyToken(req);
if (!user || !hasMinRole(user.role, "ADMIN")) {
  return errorResponse("Yetkiniz yok", 403);
}
```

## Checklist: New Module

When creating a new module, follow this order:

1. Add Prisma model to `prisma/schema.prisma` (if new entity)
2. Run `npx prisma migrate dev --name add-{module}`
3. Create Zod validation: `src/lib/validations/{module}.ts`
4. Create service: `src/services/{module}.service.ts`
5. Create API routes: `src/app/api/{module}/route.ts` + `[id]/route.ts`
6. Create page: `src/app/(dashboard)/{role}/{module}/page.tsx`
7. Create loading: `src/app/(dashboard)/{role}/{module}/loading.tsx`
8. Create components: `_components/columns.tsx`, `{module}-form.tsx`, `{module}-table.tsx`
9. Add navigation link to sidebar
10. Test: `npx tsc --noEmit && npx next lint`

## Best Practices

- Always `await params` and `await searchParams` (Next.js 15)
- Always check auth with `verifyToken()` in every API route
- Always filter `deletedAt: null` in queries
- Use `$transaction` for multi-step writes
- Create audit logs for all CUD operations
- Use Zod for input validation before Prisma
- Keep service methods static for simplicity
- Use `Promise.all` for parallel count + findMany
- Return `{ success, data, error }` from all endpoints
