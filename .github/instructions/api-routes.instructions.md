---
applyTo: "src/app/api/**"
---

# API Route Kuralları

## Auth (ZORUNLU)
- Her route `withAuth()` wrapper kullanmalı: `import { withAuth } from "@/lib/api-middleware"`
- İzin verilen rolleri belirt: `export const GET = withAuth([Role.ADMIN], async (req, { session, params }) => { ... })`
- Public endpoint'ler hariç (health, auth/login) tüm route'lar korunmalı

## Response Format (ZORUNLU)
```typescript
// Başarılı
NextResponse.json({ success: true, data: result })

// Hata
NextResponse.json({ success: false, error: "Açıklama" }, { status: 4XX })
```

## Prisma Kullanımı
- Soft delete: `where: { isDeleted: false }` her `findMany`/`findFirst`'e ekle
- Decimal alanlar string döner — frontend'de `parseFloat()` gerekir
- İlişkili veriler için `include` veya `select` kullan, lazy loading YOK

## Audit Logging
- Veri değiştiren işlemlerde (POST/PUT/DELETE) `logAudit()` çağır
- `import { logAudit } from "@/lib/audit"`

## Önemli Dosyalar
- Auth middleware: `src/lib/api-middleware.ts` → `withAuth()` fonksiyonu
- Prisma client: `src/lib/prisma.ts`
- Auth config: `src/lib/auth.ts` → `getAuthSession()`
- Rate limiter: `src/lib/rate-limit.ts`
- Roller: `src/types/index.ts` → `Role` enum
