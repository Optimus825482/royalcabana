# Optimizasyon Planı — Uygulama (Execution) Planı

**Kaynak:** `OPTIMIZASYON-PLANI.md` (Faz 0–4)  
**Tarih:** 4 Mart 2026

---

## Amaç

- **Kritik öncelik:** Rezervasyon + Takvim **real-time** (SSE + fallback) kalacak.
- Performans/UX iyileştirmeleri **real-time'ı kırmadan** uygulanacak.
- Bağımsız işleri paralel ilerletip, çakışan dosyaları sıralı yöneteceğiz.

---

## Paralel Orkestrasyon (Workstreams)

Bu repo için güvenli paralel akışlar:

1. **API Cache Workstream (real-time dışı)**  
   - Hedef: sınıflar/konseptler/ürün grupları gibi **okuma yoğun ama real-time kritik olmayan** listeleri cache'lemek.
2. **UX Workstream (Optimistic Update)**  
   - Hedef: admin onay/red gibi aksiyonlarda UI'ı anında güncellemek, hata olursa rollback.
3. **Doğrulama Workstream**  
   - Hedef: `tsc`, hedefli `eslint`, `next build` ile değişikliklerin güvenli olduğunu doğrulamak.

> Not: `prisma/schema.prisma`, `src/types/index.ts`, `src/lib/auth.ts`, `src/middleware.ts` gibi paylaşımlı dosyalar paralel düzenlenmez.

---

## Uygulanan (Done) İşler

### ✅ Faz 1.1 / 1.2 — Read cache + invalidation (real-time dışı)

**Cache key'leri**

- `classes:list:v1` (TTL: 300s)
- `concepts:list:v1` (TTL: 120s)
- `product-groups:list:v1` (TTL: 300s)

**Değişen dosyalar**

- `src/app/api/classes/route.ts`  
  - GET: `cached()` ile cache + `isDeleted: false` filtre
  - POST: `invalidateCache("classes:list:v1")`
- `src/app/api/classes/[id]/route.ts`  
  - PATCH/DELETE: `invalidateCache("classes:list:v1")`
- `src/app/api/classes/[id]/attributes/route.ts`  
  - POST: `invalidateCache("classes:list:v1")`
- `src/app/api/classes/[id]/attributes/[attrId]/route.ts`  
  - DELETE: `invalidateCache("classes:list:v1")`
- `src/app/api/concepts/route.ts`  
  - GET: `cached()` ile cache + `isDeleted: false` filtre
  - POST: `invalidateCache("concepts:list:v1")`
- `src/app/api/concepts/[id]/route.ts`  
  - PATCH/DELETE: `invalidateCache("concepts:list:v1")`
- `src/app/api/concepts/[id]/products/route.ts`  
  - POST/PATCH/DELETE: `invalidateCache("concepts:list:v1")`
- `src/app/api/concepts/[id]/extra-services/route.ts`  
  - POST/PATCH/DELETE: `invalidateCache("concepts:list:v1")`
- `src/app/api/product-groups/route.ts`  
  - GET: `cached()` ile cache + `isDeleted: false` filtre
  - POST: `invalidateCache("product-groups:list:v1")`
- `src/app/api/product-groups/[id]/route.ts`  
  - PATCH/DELETE: `invalidateCache("product-groups:list:v1")`

**Real-time kuralı**

- Rezervasyon/takvim endpoint'lerine cache **eklenmedi** (Faz 0 ile uyumlu).

### ✅ Faz 2.1 — Optimistic update (Admin Talep Yönetimi)

- `src/app/(dashboard)/admin/requests/page.tsx`  
  - Approve/Reject aksiyonlarında `admin-requests` query cache'i **optimistic** olarak güncelleniyor (listeden çıkarma).
  - İstek hata verirse **rollback** yapılıyor.
  - Başarılı olunca yine de `invalidateQueries(["admin-requests"])` ile server truth alınmaya devam ediyor.

### ✅ Faz 1.3 — totalPrice otomasyonu (PricingEngine ile)

- `src/lib/pricing.ts` — `recalculateReservationsByConceptId()` ve `recalculateReservationsByProductId()` eklendi.
- Konsept ürün/extra-service değişikliklerinde etkilenen aktif rezervasyonların `totalPrice`'ı otomatik yeniden hesaplanıyor.
- Next.js `after()` API ile fire-and-forget pattern — API response yavaşlamıyor.
- CANCELLED/REJECTED/CHECKED_OUT rezervasyonlara dokunulmuyor.
- Değişen dosyalar:
  - `src/lib/pricing.ts`
  - `src/app/api/concepts/[id]/products/route.ts`
  - `src/app/api/concepts/[id]/extra-services/route.ts`
  - `src/app/api/products/[id]/route.ts`

### ✅ Faz 3.1 — Reservation listesi include sadeleştirme

- Liste endpoint (`GET /api/reservations`) sadeleştirildi — statusHistory, modifications, cancellations, extraConcepts, extraItems çıkarıldı, `_count` eklendi.
- Detay endpoint (`GET /api/reservations/[id]`) zenginleştirildi — tüm ilişkiler tam olarak yükleniyor.
- Frontend sayfaları "liste hafif + detayda tam yükle" modeline geçirildi.
- Değişen dosyalar:
  - `src/app/api/reservations/route.ts`
  - `src/app/api/reservations/[id]/route.ts`
  - `src/app/(dashboard)/admin/reservations/page.tsx`
  - `src/app/(dashboard)/admin/requests/page.tsx`
  - `src/app/(dashboard)/casino/reservations/page.tsx`
  - `src/app/(dashboard)/system-admin/reservations/page.tsx`

### ✅ Faz 4 — Ölçüm (RUM/APM)

- Core Web Vitals (CLS, INP, LCP, TTFB) raporlama: `web-vitals` paketi + `WebVitalsReporter` component.
- API latency ölçümü: `withTiming()` wrapper `withAuth` içine entegre — `Server-Timing` header'ı + yavaş istek loglaması.
- Basit metrics endpoint: `POST /api/metrics` — gelen vital'ları loglar.
- Yeni dosyalar:
  - `src/lib/web-vitals.ts`
  - `src/lib/api-timing.ts`
  - `src/components/WebVitalsReporter.tsx`
  - `src/app/api/metrics/route.ts`
- Değişen dosyalar:
  - `src/lib/api-middleware.ts` (withTiming entegrasyonu)
  - `src/app/layout.tsx` (WebVitalsReporter eklendi)
  - `package.json` (web-vitals dependency)

---

## Doğrulama (Done)

- ✅ `npx tsc --noEmit`
- ✅ hedefli `npx eslint <değişen dosyalar>`
- ✅ `npx next build`

---

## Kalan İşler

> Tüm planlanan fazlar tamamlandı. Backlog'da kalan iş yok.
