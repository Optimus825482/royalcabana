---
applyTo: "prisma/**"
---

# Prisma & Database Kuralları

## Schema Değişikliği Akışı (ZORUNLU SIRA)

1. `schema.prisma` düzenle
2. `npx prisma validate` — syntax kontrolü
3. `npx prisma migrate dev --name <açıklayıcı-isim>` — migration oluştur
4. `npx prisma generate` — client güncelle
5. Gerekirse `prisma/seed.ts` güncelle

## Veri Tipleri

- Fiyat/tutar alanları → `Decimal` kullan, `Float` YASAK
- ID alanları → `@id @default(cuid())`
- Tarih alanları → `DateTime @default(now())`

## Soft Delete Pattern (ZORUNLU)

Her modelde şu alanlar olmalı:

```prisma
isDeleted    Boolean   @default(false)
deletedAt    DateTime?
```

Hard delete YASAK. `findMany` sorgularında `where: { isDeleted: false }` ekle.

## İlişki Kuralları

- Foreign key'ler için `@relation` tanımla
- Cascade delete yerine soft delete uygula
- Index ekle: sık sorgulanan alanlar + composite index'ler

## Mevcut Enum'lar

- `Role`: SYSTEM_ADMIN, ADMIN, CASINO_USER, FNB_USER
- `CabanaStatus`: AVAILABLE, RESERVED, CLOSED
- `ReservationStatus`: PENDING, APPROVED, REJECTED, CANCELLED, CHECKED_IN, CHECKED_OUT, MODIFICATION_PENDING, EXTRA_PENDING

## Seed Kuralları

- Role/permission değişikliğinde `prisma/seed.ts` güncelle
- Test verileri seed'de tutulur, migration'da DEĞİL

## ⚠️ Paralel Çalışma Uyarısı

`schema.prisma` tek dosyadır — birden fazla subagent AYNI ANDA düzenleyemez.
Prisma değişiklikleri DAIMA sıralı çalıştırılmalı.
