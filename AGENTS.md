# AGENTS.md — Beach Resort Management

## Must-follow constraints

- Prisma schema değişikliğinden sonra `npx prisma migrate dev --name <name>` çalıştır
- API route'larında her zaman auth kontrolü yap — `verifyToken()` veya `getServerSession()` kullan
- Soft delete pattern: `isDeleted` + `deletedAt` alanları kullan, hard delete YASAK
- Decimal alanlar (fiyat, tutar) için `Decimal` tipi kullan, `Float` YASAK
- Tüm API response'ları `{ success, data, error }` formatında olmalı
- Environment variable'lar `.env.local`'dan okunur, `.env` dosyasına secret YAZMA

## Validation before finishing

```bash
npx tsc --noEmit          # Type check
npx next lint             # Lint
npx next build            # Build check
npx prisma validate       # Schema validation (prisma değişikliğinde)
```

## Repo-specific conventions

- Tech stack: Next.js 15 (App Router) + Prisma + PostgreSQL + Tailwind + shadcn/ui
- Dosya yapısı: `src/app/(dashboard)/` altında sayfa grupları, `src/app/api/` altında API route'ları
- Service layer: `src/services/` — iş mantığı burada, API route'lar ince tutuluyor
- Component library: `src/components/ui/` (shadcn) + `src/components/` (proje özel)
- Auth: JWT token tabanlı, `src/lib/auth.ts` ve `src/app/api/auth/`
- Roller: SYSTEM_ADMIN, ADMIN, MANAGER, STAFF, CASHIER — role-based access control
- i18n: Türkçe UI, İngilizce kod/değişken isimleri

## Important locations

- `prisma/schema.prisma` — veritabanı şeması, tüm model tanımları
- `src/lib/auth.ts` — JWT doğrulama ve session yönetimi
- `src/lib/prisma.ts` — Prisma client singleton
- `docker-compose.yaml` — PostgreSQL + Redis + app servisleri
- `.env.example` — gerekli environment variable listesi

## Change safety rules

- Prisma model değişikliği = migration ZORUNLU
- API route imzası değişikliği = frontend çağrılarını da güncelle
- Role/permission değişikliği = seed.ts'i de güncelle
- Mevcut API'lerde backward compatibility koru (breaking change için versiyon ekle)

## Known gotchas

- `Decimal` alanlar JSON serialize edilirken string olur — frontend'de `parseFloat()` gerekir
- Prisma `findMany` default olarak soft-deleted kayıtları da getirir — `where: { isDeleted: false }` ekle
- Next.js App Router'da `cookies()` ve `headers()` async — await unutma
- Docker'da Prisma client generate edilmeli — `prisma generate` Dockerfile'da var
