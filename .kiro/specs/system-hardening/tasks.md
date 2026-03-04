# Tasks — System Hardening

## Task 1: Viewport Erişilebilirlik Düzeltmesi

- [x] `src/app/layout.tsx` dosyasında `viewport` export'unu güncelle: `maximumScale: 5`, `userScalable: true`
- [x] Doğrulama: `npx tsc --noEmit` ile type check

**Requirements:** Req 1 (CRITICAL)
**Design Reference:** Components §1

## Task 2: Geist Mono Font Lazy Loading

- [x] `src/app/layout.tsx` dosyasında `Geist_Mono` config'ine `display: 'swap'` ekle
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 17 (LOW)
**Design Reference:** Data Models §Geist Mono

## Task 3: Skeleton Loading Ekranı

- [x] `src/app/(dashboard)/loading.tsx` dosyasını skeleton placeholder ile değiştir (spinner yerine `animate-pulse` skeleton)
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 9 (MEDIUM)
**Design Reference:** Components §9

## Task 4: DigitalClock React.memo & StickyHeader Hamburger Büyütme

- [x] `src/components/shared/StickyHeader.tsx` — DigitalClock bileşenini `React.memo` ile sarmala
- [x] `src/components/shared/StickyHeader.tsx` — Hamburger buton boyutunu minimum 44×44px yap (`w-11 h-11`)
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 6 (HIGH), Req 15 (LOW)
**Design Reference:** Components §6

## Task 5: Sidebar Touch Target Büyütme

- [x] `src/components/shared/Sidebar.tsx` — Grup alt linklerinin dikey padding'ini `min-h-[44px] py-2.5` yap
- [x] `src/components/shared/Sidebar.tsx` — Collapsed ikon butonlarını `w-11 h-11` (44px) yap
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 5 (HIGH)
**Design Reference:** Components §5

## Task 6: Offline Fallback Sayfası

- [x] `public/offline.html` oluştur — inline CSS/JS, Royal Cabana teması, auto-reload (`navigator.onLine`)
- [x] Harici kaynak bağımlılığı olmadığını doğrula

**Requirements:** Req 14 (MEDIUM)
**Design Reference:** Components §10

## Task 7: Service Worker Güçlendirmesi

- [x] `public/sw.js` dosyasını yeniden yaz: cache versioning, precache (offline.html dahil), stale-while-revalidate (static), network-first (API), navigation fail → offline.html
- [x] Activate event'te eski cache temizliği
- [x] Doğrulama: SW syntax kontrolü

**Requirements:** Req 2 (CRITICAL)
**Design Reference:** Components §2

## Task 8: PWA Manifest Zenginleştirme

- [x] `public/manifest.json` güncelle: `id`, `categories`, `shortcuts`, maskable icon, screenshots tanımları
- [x] Screenshot placeholder dosyaları için yorum ekle (gerçek screenshot'lar sonra eklenir)

**Requirements:** Req 10 (MEDIUM)
**Design Reference:** Data Models §PWA Manifest

## Task 9: Docker Redis Container Eklenmesi

- [x] `docker-compose.yaml` — Redis 7 Alpine service ekle (healthcheck, volume, maxmemory)
- [x] `docker-compose.yaml` — app service'e `depends_on: redis` ve `REDIS_URL` env ekle
- [x] `.env.example` — `REDIS_URL` ekle

**Requirements:** Req 11 (MEDIUM)
**Design Reference:** Components §11

## Task 10: Redis Rate Limiter

- [x] `ioredis` paketini yükle: `npm install ioredis`
- [x] `src/lib/redis.ts` oluştur — Redis client singleton (bağlantı hatası handling)
- [x] `src/lib/rate-limit.ts` yeniden yaz — Redis sliding window + in-memory fallback, `rateLimitWithInfo()` ekle, mevcut `rateLimit()` imzasını koru
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 3 (CRITICAL)
**Design Reference:** Components §3, Data Models §Redis

## Task 11: API Response Format & Rate Limit Header

- [x] `src/lib/api-middleware.ts` — Tüm hata yanıtlarını `{ success: false, error }` formatına çevir
- [x] `src/lib/api-middleware.ts` — Rate limit aşımında `Retry-After` header ekle
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 13 (MEDIUM), Req 3.5 (CRITICAL)
**Design Reference:** Components §8

## Task 12: CSP Header & Cache-Control Headers

- [x] `next.config.ts` — `headers()` fonksiyonuna CSP header ekle (report-uri dahil)
- [x] `next.config.ts` — Static asset, font, icon için Cache-Control header'ları ekle
- [x] CSP report endpoint: `src/app/api/csp-report/route.ts` oluştur (basit log)
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 4 (CRITICAL), Req 12 (MEDIUM)
**Design Reference:** Components §4, §12

## Task 13: Edge Middleware

- [x] `src/middleware.ts` oluştur — Auth kontrolü, public/static route bypass, `/login` redirect
- [x] `matcher` config ile scope tanımla
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Req 8 (HIGH)
**Design Reference:** Components §7

## Task 14: Veritabanı Composite Index

- [x] `prisma/schema.prisma` — Reservation modeline `@@index([status, deletedAt, startDate])` ekle
- [x] `prisma/schema.prisma` — Notification modeline `@@index([userId, isRead, createdAt])` ekle
- [x] `npx prisma validate` ile schema doğrula
- [x] `npx prisma migrate dev --name add-composite-indexes` ile migration oluştur

**Requirements:** Req 7 (HIGH)
**Design Reference:** Data Models §Prisma Composite Indexes

## Task 15: Orphan Route Temizliği

- [x] Kullanılmayan route dosyalarını tespit et: `concepts/[conceptId]/`, `loyalty/admin/`, `products/stock/`
- [x] İlgili navigasyon referanslarını kontrol et ve temizle
- [x] Route dosyalarını sil
- [x] Doğrulama: `npx next build`

**Requirements:** Req 16 (LOW)
**Design Reference:** Requirements §16

## Task 16: Final Doğrulama

- [x] `npx tsc --noEmit` — Type check
- [x] `npx next lint` — Lint
- [x] `npx prisma validate` — Schema validation
- [x] `npx next build` — Build check

## Task 17: Health Check Endpoint

- [x] `src/app/api/health/route.ts` oluştur — DB + Redis bağlantı kontrolü, latency ölçümü
- [x] Production'da error mesajlarını maskele (sadece dev'de detay göster)
- [x] `src/middleware.ts` — `/api/health` route'unu PUBLIC_ROUTES'a ekle (K8s probes auth gönderemez)
- [x] Response format: `{ success: true, data: { status, timestamp, uptime, checks } }`
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Health endpoint for K8s readiness/liveness probes
**Design Reference:** Deployment §Health Check

## Task 18: Redis Cache Layer

- [x] `src/lib/cache.ts` oluştur — `cached(key, ttl, fetcher)` generic cache helper
- [x] Redis primary + in-memory fallback (max 500 entry)
- [x] `invalidateCache(key)` ve `invalidateCachePattern(pattern)` fonksiyonları
- [x] Redis SCAN ile pattern-based invalidation
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** Server-side Redis cache layer for API response caching
**Design Reference:** Performance §Cache Layer

## Task 19: Push Notification Altyapısı

- [x] `public/sw.js` v3 — Push event handler, notification click, background sync
- [x] `src/lib/push.ts` — Client-side helpers (subscribe, unsubscribe, permission request, background sync)
- [x] `src/app/api/push/subscribe/route.ts` — POST (subscribe) + DELETE (unsubscribe) with auth
- [x] `prisma/schema.prisma` — PushSubscription modeli (endpoint unique, userId index)
- [x] User modeline `pushSubscriptions` relation eklendi
- [x] `.env.example` — VAPID key placeholder'ları eklendi
- [x] `npx prisma generate` + `npx prisma migrate dev --name add-push-subscriptions --create-only`
- [x] Doğrulama: `npx tsc --noEmit`, `npx prisma validate`

**Requirements:** Push notifications + background sync for PWA
**Design Reference:** PWA §Push Notifications

## Task 20: CSP Nonce & Middleware Enhancement

- [x] `src/middleware.ts` — `crypto.randomUUID()` ile CSP nonce üretimi
- [x] `x-nonce` response header ile downstream'e iletim
- [x] `/api/health` public route bypass eklendi
- [x] Doğrulama: `npx tsc --noEmit`

**Requirements:** CSP nonce for inline script security
**Design Reference:** Security §CSP Nonce

## Task 21: Final Doğrulama (Phase 2)

- [x] `npx tsc --noEmit` — Type check ✅
- [x] `npx eslint` — Lint (yeni dosyalar) ✅
- [x] `npx prisma validate` — Schema validation ✅
- [x] `npx prisma generate` — Client generation ✅
