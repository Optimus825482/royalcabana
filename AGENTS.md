# AGENTS.md — Beach Resort Management

## Must-follow constraints

- Prisma schema değişikliğinden sonra `npx prisma migrate dev --name <name>` çalıştır
- API route'larında her zaman auth kontrolü yap — `withAuth()` wrapper kullan (`src/lib/api-middleware.ts`)
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
- Auth: JWT + NextAuth, `src/lib/auth.ts` ve `src/lib/api-middleware.ts`
- Roller: SYSTEM_ADMIN, ADMIN, CASINO_USER, FNB_USER — role-based access control
- i18n: Türkçe UI, İngilizce kod/değişken isimleri

## Important locations

- `prisma/schema.prisma` — veritabanı şeması, tüm model tanımları
- `src/lib/auth.ts` — JWT doğrulama, `getAuthSession()` ve `authOptions`
- `src/lib/api-middleware.ts` — `withAuth()` wrapper (auth + RBAC + rate limit)
- `src/lib/prisma.ts` — Prisma client singleton
- `src/lib/audit.ts` — `logAudit()` fonksiyonu
- `docker-compose.yaml` — PostgreSQL + Redis + app servisleri
- `.env.example` — gerekli environment variable listesi

## Change safety rules

- Prisma model değişikliği = migration ZORUNLU
- API route imzası değişikliği = frontend çağrılarını da güncelle
- Role/permission değişikliği = seed.ts'i de güncelle
- Mevcut API'lerde backward compatibility koru (breaking change için versiyon ekle)

## Subagent coordination rules

### Dosya Çakışma Matrisi (Paylaşılan Kaynaklar)

Aşağıdaki dosyalar birden fazla domain'i etkiler — paralel düzenleme YASAK:

| Dosya | Etkileyen Domain'ler | Kural |
|-------|---------------------|-------|
| `prisma/schema.prisma` | Tüm domain'ler | SIRALI - tek subagent |
| `src/types/index.ts` | API + UI + Services | SIRALI - tek subagent |
| `src/lib/auth.ts` | API + Dashboard | SIRALI - tek subagent |
| `src/middleware.ts` | Tüm route'lar | SIRALI - tek subagent |

### Güvenli Paralel Alanlar

Bu domain'ler birbirinden bağımsız düzenlenebilir:

| Domain A | Domain B | Paralel? |
|----------|----------|----------|
| `src/app/api/reservations/` | `src/app/api/products/` | ✅ Farklı API |
| `src/components/calendar/` | `src/components/reports/` | ✅ Farklı UI |
| `src/app/(dashboard)/admin/` | `src/app/(dashboard)/casino/` | ✅ Farklı sayfa |
| `src/app/api/X/` | `src/app/(dashboard)/X/` | ⚠️ Dikkat — aynı feature |
| `prisma/schema.prisma` | herhangi bir dosya | ❌ Schema = sıralı |

### Subagent için Bağlam Kuralları

Bir subagent olarak çalışıyorsan:

1. Önce bu dosyayı (AGENTS.md) tamamen oku
2. Sadece sana verilen dosya kapsamı içinde çalış
3. Kapsam dışı dosyayı düzenleme — orchestrator'a bildir
4. İşini bitirince doğrulama komutlarını çalıştır

## Known gotchas

- `Decimal` alanlar JSON serialize edilirken string olur — frontend'de `parseFloat()` gerekir
- Prisma `findMany` default olarak soft-deleted kayıtları da getirir — `where: { isDeleted: false }` ekle
- Next.js App Router'da `cookies()` ve `headers()` async — await unutma
- Docker'da Prisma client generate edilmeli — `prisma generate` Dockerfile'da var
