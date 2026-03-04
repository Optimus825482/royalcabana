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

Production-ready patterns for using Prisma ORM with Next.js 15 App Router. This power covers the Prisma client singleton, soft delete middleware, Decimal field serialization, type-safe API response format, server-side pagination, N+1 query prevention, and transaction patterns.

All patterns follow the project convention: service layer in `src/services/`, thin API routes in `src/app/api/`, JWT auth via `src/lib/auth.ts`.

## Prisma Client Singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

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
    data: { deletedAt: new Date() },
  });
}

// ALWAYS filter soft-deleted records in queries
const activeRecords = await prisma.resource.findMany({
  where: { deletedAt: null }, // NOT isDeleted — use deletedAt
});

// For models with isDeleted field, use both:
const records = await prisma.resource.findMany({
  where: {
    isDeleted: false,
    deletedAt: null,
  },
});
```

## Decimal Field Handling

Prisma `Decimal` fields serialize as strings in JSON. Handle carefully:

```typescript
// In API response — Decimal auto-serializes to string
// Frontend must parseFloat()

// When creating/updating — pass string or number
await prisma.product.create({
  data: {
    purchasePrice: 150.50,  // number OK
    salePrice: "200.00",    // string OK
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

// Decimal comparison — use Prisma's Decimal helpers
import { Decimal } from "@prisma/client/runtime/library";

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

## Next.js App Router Gotchas

```typescript
// cookies() and headers() are ASYNC in App Router — always await
import { cookies, headers } from "next/headers";

export async function GET() {
  const cookieStore = await cookies(); // AWAIT required
  const headerList = await headers(); // AWAIT required
  const token = cookieStore.get("token")?.value;
}

// searchParams is a Promise in Next.js 15
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams; // AWAIT required
  const page = Number(params.page) || 1;
}
```

## Best Practices

- Always use `deletedAt: null` in WHERE clauses (soft delete)
- Use `Decimal` type for money fields, never `Float`
- Return `{ success, data, error }` from all API routes
- Use `include` or `select` to prevent N+1 queries
- Wrap multi-step operations in `$transaction`
- Keep business logic in `src/services/`, API routes thin
- Use `Promise.all` for parallel independent queries (count + findMany)
- Always `await cookies()` and `await headers()` in App Router
- Always `await searchParams` in page components (Next.js 15)
- Use Zod for request body validation before Prisma operations
