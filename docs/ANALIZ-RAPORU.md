# Fabana (Royal Cabana) — Kapsamlı Analiz Raporu

**Tarih:** 2025-03-04  
**Kapsam:** İşlevsellik, fonksiyonellik, performans, kullanıcı deneyimi, mobile-first yaklaşım, geliştirilebilirlik, hata ve eksik tespiti.

---

## 1. Analiz planı (Brainstorm → Plan → Execute)

| Aşama | İçerik |
|-------|--------|
| **Brainstorm** | Uygulama alanları: dashboard (admin, casino, fnb, system-admin), API (~108 route), auth, rezervasyon, F&B, raporlar, harita, bildirimler, PWA. |
| **Plan** | 1) Auth & API güvenliği 2) Soft delete uyumu 3) API response formatı 4) Mobile-first & UX 5) Performans 6) Hata/eksik listesi. |
| **Execute** | Kod tabanı tarandı; aşağıda bulgular özetlendi. |

---

## 2. İşlevsellik ve fonksiyonellik

### 2.1 Genel yapı

- **Stack:** Next.js 16 (App Router), Prisma, PostgreSQL, Tailwind, shadcn/ui, next-intl, React Query, Socket.io, Redis.
- **Sayfa grupları:** `(auth)`, `(dashboard)` — admin, casino, fnb, system-admin, reports, profile, weather.
- **API:** ~108 route; auth, reservations, cabanas, guests, products, F&B orders, waitlist, reviews, reports, notifications, system config, vb.

### 2.2 Auth ve API güvenliği

| Durum | Açıklama |
|-------|----------|
| ✅ | Çoğu API route `withAuth()` kullanıyor (rate limit + session + RBAC + isteğe bağlı permission). |
| ✅ | Middleware: JWT/session kontrolü, role-based path (`ROLE_ALLOWED_PATHS`), public route listesi. |
| ⚠️ | **SSE (`/api/sse`)**: Auth `getAuthSession()` ile yapılıyor, `withAuth` yok. Response formatı `{ message: "Unauthorized" }` — proje standardı `{ success: false, error: "..." }` ile uyumsuz. |
| ✅ | Bilinçli public route’lar: `/api/health`, `/api/system/public-config`, `/api/metrics` (Web Vitals), `/api/auth/*`, `/api/csp-report`. |

**Öneri:** SSE route’unda 401 cevabını `{ success: false, error: "Unauthorized" }` formatına getirmek (isteğe bağlı).

### 2.3 Soft delete uyumu

AGENTS.md: Soft delete için `isDeleted` + `deletedAt` kullanılmalı; `findMany` vb. sorgularda filtre olmalı.

| Konum | Sorun | Öneri |
|-------|--------|--------|
| `src/app/api/products/route.ts` (GET) | `where: activeOnly ? { isActive: true } : undefined` — `activeOnly === false` iken silinmiş ürünler de döner. | En azından `isDeleted: false` (veya `deletedAt: null`) ekle. |
| `src/services/presentation.service.ts` | `cabana.findMany`, `cabanaClass.findMany`, `concept.findMany` — `where` yok, silinmiş kayıtlar dahil. | Tüm findMany’lere `where: { isDeleted: false }` (veya modelde varsa `deletedAt: null`) ekle. |
| `src/services/report.service.ts` | `cabana.findMany` (satır ~92) — classId filtresi var, isDeleted yok. | `isDeleted: false` (veya `deletedAt: null`) ekle. |
| `src/app/api/staff/route.ts` | `staff.findMany` — where’da sadece pagination/sort; Staff modelinde isDeleted var. | Silinmiş personeli göstermemek için `isDeleted: false` ekle. |
| `src/app/api/task-definitions/route.ts` | `taskDefinition.findMany` — TaskDefinition modelinde isDeleted/deletedAt varsa filtre eksik. | Schema’ya göre soft delete filtresi ekle. |
| `src/app/api/blackout-dates/route.ts` | `blackoutDate.findMany` — BlackoutDate’te isDeleted/deletedAt varsa filtre eksik. | Schema kontrolü + gerekirse filtre. |
| `src/app/api/reviews/route.ts` | `review.findMany` — Review’da isDeleted var; where’da kullanılmıyor olabilir. | `isDeleted: false` ile filtrele. |
| `src/app/api/guests/route.ts` | `guest.findMany` — where’da `deletedAt: null` kullanılıyor mu kontrol edildi; bazı path’lerde eksik olabilir. | Tüm listeleme sorgularında soft delete filtresi olduğundan emin ol. |
| `src/app/api/auth/sessions/route.ts` | `loginSession.findMany` — LoginSession’da soft delete yoksa sorun yok; varsa filtre ekle. | Schema’ya göre karar ver. |

**Özet:** En kritik düzeltmeler: `products/route.ts` GET, `presentation.service.ts`, `report.service.ts` cabana sorguları, `staff/route.ts`. Diğerleri schema’ya göre teker teker doğrulanmalı.

### 2.4 API response formatı

- **Hedef:** `{ success, data?, error? }`.
- **Durum:** Çoğu route bu formatta; health, public-config, metrics de `success` kullanıyor.
- **Tutarsızlık:** SSE 401’de `{ message: "Unauthorized" }` (yukarıda belirtildi).

---

## 3. Performans

| Konu | Durum | Not |
|------|--------|-----|
| **Viewport / PWA** | ✅ | `viewport`: device-width, initialScale, themeColor; manifest, appleWebApp, service worker kayıt. |
| **Font** | ✅ | Geist + Geist Mono, `display: swap`, `preload: false`. |
| **API timing** | ✅ | `withTiming` (api-timing) kullanılıyor. |
| **Caching** | ✅ | Weather/forecast’te cache (expiresAt); presentation’da cached() kullanımı. |
| **React Query** | ✅ | Stale time vb. kullanımı (ör. module config 60_000). |
| **Rate limit** | ✅ | withAuth ve bazı public route’larda (metrics, SSE prod) uygulanıyor. |

**Öneri:** Büyük listelerde (rezervasyon, misafir, ürün) sayfalama ve gerekirse virtual list / windowing kontrol edilsin; bundle analizi (next/bundle-analyzer) ile LCP’ye etki eden chunk’lar işaretlensin.

---

## 4. Kullanıcı deneyimi ve mobile-first

### 4.1 Mobile-first ve responsive

| Öğe | Durum |
|-----|--------|
| Viewport | ✅ device-width, initialScale, maximumScale, viewportFit. |
| Sidebar | ✅ Mobilde overlay + slide-in (`-translate-x-full` / `translate-x-0`), `lg:static`; rota değişince kapanıyor. |
| StickyHeader | ✅ Sidebar toggle (hamburger) ile entegre. |
| Breakpoint kullanımı | ✅ Birçok sayfa/bileşende `sm:`, `md:`, `lg:` (FormPageTemplate, ListPageTemplate, takvim, harita, fnb, admin, system-admin). |

### 4.2 Eksik veya iyileştirilebilir UX

- **Loading / error:** Çoğu segment’te `loading.tsx` ve `error.tsx` var (admin, casino, fnb, system-admin, weather, reports, profile). Yine de her yeni route grubu için bu dosyaların varlığı kontrol edilmeli.
- **Form validasyonu:** Zod kullanımı API tarafında yaygın; formlarda kullanıcıya anlamlı hata mesajları (TR) ve alan bazlı gösterim gözden geçirilebilir.
- **Erişilebilirlik:** Sidebar’da `aria-label`, overlay’de `aria-hidden` var. Klavye ile gezinme ve focus yönetimi (modal/sheet kapatma) genel olarak gözden geçirilebilir.

---

## 5. Geliştirilebilirlik

| Konu | Durum |
|------|--------|
| AGENTS.md | ✅ Kurallar net: migration, withAuth, soft delete, Decimal, response format, .env.local. |
| Service layer | ✅ İş mantığı `src/services/` altında; API route’lar ince. |
| Tip güvenliği | ✅ Shared types; Prisma + Zod. |
| Audit | ✅ `logAudit()` kullanımı. |
| Subagent / paylaşılan dosyalar | ✅ schema, types, auth, middleware için sıralı kural tanımlı. |

**Öneri:** Kritik API’ler için (rezervasyon, ödeme, onay) integration test ve E2E senaryoları eklenebilir; büyük refactor’larda type ve API contract testleri faydalı olur.

---

## 6. Hata ve eksik özet listesi

### 6.1 Düzeltilmesi önerilen hatalar / riskler

1. **Products listesi soft delete:** `src/app/api/products/route.ts` GET — `isDeleted: false` (veya eşdeğeri) filtresi ekle.
2. **Presentation service soft delete:** `src/services/presentation.service.ts` — cabana, cabanaClass, concept findMany’lerine soft delete filtresi ekle.
3. **Report service cabana:** `src/services/report.service.ts` — cabana findMany’de `isDeleted: false` ekle.
4. **Staff listesi:** `src/app/api/staff/route.ts` — Staff modelinde soft delete varsa `isDeleted: false` ekle.
5. **SSE 401 formatı:** `/api/sse` — 401 cevabını `{ success: false, error: "Unauthorized" }` yap (opsiyonel ama tutarlılık için iyi).

### 6.2 Kontrol edilmesi önerilen yerler

- **TaskDefinition, BlackoutDate, Review, LoginSession** ve diğer modellerde soft delete alanı varsa ilgili tüm `findMany`/`findFirst` sorgularında filtre.
- **FNB orders, waitlist, reservation extra requests** vb. listeleme endpoint’lerinde soft delete kullanılıyorsa aynı mantık.
- **Guests route:** Tüm listeleme path’lerinde `deletedAt: null` (veya isDeleted) tutarlı kullanılsın.

### 6.3 Eksiklikler (zorunlu değil, iyileştirme)

- Bazı route gruplarında `error.tsx` / `loading.tsx` eksik olabilir; yeni sayfalar eklendikçe kontrol.
- Form hata mesajlarının Türkçe ve alan bazlı gösterimi.
- Büyük listelerde sayfalama/virtual list ve bundle boyutu izleme.
- E2E ve API integration testleri.

---

## 7. Doğrulama adımları (AGENTS.md ile uyumlu)

Analiz sonrası değişiklik yapıldıysa aşağıdakiler çalıştırılmalı:

```bash
npx tsc --noEmit
npx next lint
npx next build
npx prisma validate   # schema değişikliği yapıldıysa
```

---

## 8. Sonuç

- **İşlevsellik:** Genel olarak güçlü; auth, RBAC ve rate limit doğru kullanılıyor. Düzeltilmesi gereken noktalar özellikle soft delete filtreleri ve tek bir response format tutarsızlığı (SSE).
- **Performans:** Viewport, PWA, cache, React Query ve rate limit mevcut; büyük listeler ve bundle için ek iyileştirme yapılabilir.
- **UX ve mobile:** Layout, sidebar ve breakpoint kullanımı mobile-first ile uyumlu; loading/error ve erişilebilirlik detayları artırılabilir.
- **Geliştirilebilirlik:** AGENTS.md ve servis katmanı iyi tanımlı; test ve dokümantasyon artırılabilir.

Bu rapor, düzeltmeleri uyguladıktan sonra `verification-before-completion` ile tekrar doğrulanabilir.
