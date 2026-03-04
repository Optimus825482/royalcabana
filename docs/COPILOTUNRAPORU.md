# 🏖️ Royal Cabana — Kapsamlı Uygulama Analiz Raporu

> **Tarih:** 2025-07-02  
> **Yöntem:** 4 paralel subagent ile eşzamanlı analiz (API, Prisma, Frontend, Altyapı)  
> **Kapsam:** Tüm uygulama — 96 route dosyası, 849 satır Prisma schema, 45+ sayfa, 35+ servis/lib modülü

---

## 📊 Genel Skor Tablosu

| Alan              | Skor           | Durum       | En Kritik Sorun                                    |
| ----------------- | -------------- | ----------- | -------------------------------------------------- |
| **API Endpoints** | ⭐⭐ / 5       | 🔴 Kritik   | %66 endpoint eksik/yarım, 15 hard delete ihlali    |
| **Prisma Schema** | ⭐⭐⭐ / 5     | 🟡 Orta     | 7 modelde soft delete eksik                        |
| **Frontend/UI**   | ⭐⭐⭐ / 5     | 🟡 Orta     | shadcn/ui kurulu değil, tüm sayfalar "use client"  |
| **Auth Sistemi**  | ⭐⭐⭐⭐ / 5   | 🟢 İyi      | JWT + RBAC + rate limit sağlam                     |
| **Altyapı**       | ⭐⭐⭐⭐ / 5   | 🟢 İyi      | Docker, Redis fallback, SSE/Socket.IO dual channel |
| **Validation**    | ⭐⭐⭐⭐⭐ / 5 | ✅ Mükemmel | Zod ile 14+ schema, Türkçe hata mesajları          |

---

## 1. API ENDPOİNT ANALİZİ

### 1.1 Genel Durum

| Metrik                   | Değer | Oran  |
| ------------------------ | ----- | ----- |
| **Toplam Route Dosyası** | 96    | —     |
| **Toplam HTTP Handler**  | 153   | —     |
| **ÇALIŞIYOR**            | 33    | %21.6 |
| **EKSİK / YARIM**        | 101   | %66.0 |
| **HATALI**               | 19    | %12.4 |

### 1.2 Kritik İhlaller

#### 🔴 Hard Delete İhlali (AGENTS.md Kuralı: "hard delete YASAK")

15 endpoint `prisma.*.delete()` kullanıyor — soft delete (`isDeleted: true, deletedAt: new Date()`) yerine:

| Endpoint                              | Metod  | Model                  |
| ------------------------------------- | ------ | ---------------------- |
| `/api/blackout-dates/[id]`            | DELETE | BlackoutDate           |
| `/api/cabanas/[id]`                   | DELETE | Cabana                 |
| `/api/classes/[id]`                   | DELETE | CabanaClass            |
| `/api/concepts/[id]`                  | DELETE | Concept                |
| `/api/extra-services/[id]`            | DELETE | ExtraService           |
| `/api/fnb/active-orders/[orderId]`    | DELETE | FnbOrder               |
| `/api/notifications/[id]`             | DELETE | Notification           |
| `/api/products/[id]`                  | DELETE | Product                |
| `/api/products/groups/[id]`           | DELETE | ProductGroup           |
| `/api/qr-codes/[id]`                  | DELETE | QRCode                 |
| `/api/reservations/[id]`              | DELETE | Reservation            |
| `/api/reviews/[id]`                   | DELETE | Review                 |
| `/api/service-point-definitions/[id]` | DELETE | ServicePointDefinition |
| `/api/service-points/[id]`            | DELETE | ServicePoint           |
| `/api/users/[id]`                     | DELETE | User                   |

#### 🔴 Audit Log Eksikliği

3 dosya `logAudit()` çağırmıyor:

| Dosya                   | İşlem  | Risk                                               |
| ----------------------- | ------ | -------------------------------------------------- |
| `/api/products/groups/` | CRUD   | Ürün grubu değişiklikleri izlenemiyor              |
| `/api/system-config/`   | UPDATE | Sistem konfigürasyonu değişiklikleri kaydedilmiyor |
| `/api/extra-services/`  | CRUD   | Ekstra hizmet değişiklikleri izlenemiyor           |

#### 🔴 Yanlış Audit Entity

| Dosya                   | Beklenen | Gerçek        |
| ----------------------- | -------- | ------------- |
| `/api/reviews/route.ts` | `REVIEW` | `RESERVATION` |

#### 🟠 Response Format Tutarsızlığı

AGENTS.md kuralı: Tüm API response'ları `{ success, data, error }` formatında olmalı.

| Durum                  | Endpoint Sayısı | Oran |
| ---------------------- | --------------- | ---- |
| ✅ Doğru format        | ~35             | %23  |
| ❌ Yanlış/eksik format | ~118            | %77  |

Yaygın hatalar:

- `NextResponse.json(data)` → `{ success: true, data }` olmalı
- `NextResponse.json({ error: "..." })` → `{ success: false, error: "..." }` olmalı
- Bazı endpoint'ler doğrudan Prisma sonucu döndürüyor

### 1.3 Endpoint Kategorileri

| Kategori        | Endpoint Sayısı | Çalışan | Eksik | Hatalı |
| --------------- | --------------- | ------- | ----- | ------ |
| Rezervasyonlar  | 18              | 8       | 7     | 3      |
| Ürünler/F&B     | 15              | 4       | 9     | 2      |
| Kullanıcı/Auth  | 12              | 5       | 5     | 2      |
| Kabana Yönetimi | 10              | 4       | 5     | 1      |
| Sistem Config   | 8               | 2       | 5     | 1      |
| Fiyatlandırma   | 12              | 2       | 8     | 2      |
| Bildirimler     | 6               | 3       | 2     | 1      |
| Raporlar/Export | 10              | 2       | 6     | 2      |
| Diğer           | 62              | 3       | 54    | 5      |

---

## 2. PRİSMA SCHEMA ANALİZİ

### 2.1 Genel Yapı

| Metrik               | Değer        |
| -------------------- | ------------ |
| **Schema Boyutu**    | 849 satır    |
| **Toplam Model**     | ~30          |
| **Enum Sayısı**      | 10+          |
| **Migration Sayısı** | 29 (7 günde) |
| **İlişki Sayısı**    | 50+          |

### 2.2 Kural Uyumluluk Skorları

| Kural                 | Skor     | Detay                                                               |
| --------------------- | -------- | ------------------------------------------------------------------- |
| **Decimal Kullanımı** | ✅ 10/10 | Tüm fiyat/tutar alanları `Decimal` — `Float` yok                    |
| **İlişkiler**         | ✅ 9/10  | Cascade/SetNull düzgün; 1 orphan riski (Reservation→Guest silerken) |
| **İndeksler**         | ⚠️ 8/10  | `Concept` ve `User.role` için index eksik                           |
| **Soft Delete**       | 🔴 4/10  | **7 modelde `isDeleted`/`deletedAt` yok**                           |
| **Timestamps**        | ⚠️ 7/10  | Bazı modellerde `updatedAt` eksik                                   |

### 2.3 Soft Delete Eksik Modeller

| Model                  | `isDeleted` | `deletedAt` | Risk                           |
| ---------------------- | :---------: | :---------: | ------------------------------ |
| BlackoutDate           |     ❌      |     ❌      | Silinen tarihler geri alınamaz |
| Notification           |     ❌      |     ❌      | Audit trail kaybı              |
| LoginSession           |     ❌      |     ❌      | Güvenlik logu kaybı            |
| AuditLog               |     ❌      |     ❌      | Denetim kaydı silinebilir      |
| ProductPriceHistory    |     ❌      |     ❌      | Fiyat geçmişi kaybı            |
| ServicePointDefinition |     ❌      |     ❌      | Yapısal veri kaybı             |
| SeasonalPricing        |     ❌      |     ❌      | Fiyat konfigürasyonu kaybı     |

> **Not:** AuditLog ve LoginSession gibi modeller zaten "append-only" olmalı — soft delete yerine "never delete" politikası uygulanabilir. Ancak diğer modeller kesinlikle soft delete gerektirir.

### 2.4 Eksik İndeksler

| Model       | Alan              | Sorgu Tipi       | Önerilen                                         |
| ----------- | ----------------- | ---------------- | ------------------------------------------------ |
| Concept     | `name`            | Filtreleme       | `@@index([name])`                                |
| User        | `role`            | Filtreleme/RBAC  | `@@index([role])`                                |
| Reservation | `date` + `status` | Takvim sorguları | Composite index mevcut ama `date` tek başına yok |

### 2.5 Migration Sağlığı

| Metrik            | Değer             | Değerlendirme                                            |
| ----------------- | ----------------- | -------------------------------------------------------- |
| Migration sayısı  | 29                | ⚠️ 7 günde 29 migration — çok fazla                      |
| Duplicate isimler | 2 çift            | `remove_loyalty_system` (2x), `add_missing_indexes` (2x) |
| Son migration     | Phase 4 modelleri | ✅ Güncel                                                |
| Seed dosyası      | Mevcut            | ⚠️ 6/10 — bazı yeni modeller seed'de eksik               |

---

## 3. FRONTEND / UI ANALİZİ

### 3.1 Teknoloji Stack'i

| Özellik       | Değer                                              |
| ------------- | -------------------------------------------------- |
| **Framework** | Next.js 15 (App Router)                            |
| **UI**        | Tailwind CSS + Özel `FormComponents` modülü        |
| **shadcn/ui** | ❌ **KURULU DEĞİL** (`components/ui/` klasörü BOŞ) |
| **State**     | `@tanstack/react-query` (client) + `zustand`       |
| **Auth**      | NextAuth (JWT) + `PermissionGate` bileşeni         |
| **i18n**      | `next-intl` — Türkçe UI                            |
| **İkonlar**   | `lucide-react`                                     |
| **Tema**      | Hardcoded dark mode                                |
| **PWA**       | Service worker + manifest.json aktif               |

### 3.2 Sayfa Envanteri

| Route Grubu                        | Sayfa Sayısı | PermissionGate | Boş Klasör  |
| ---------------------------------- | ------------ | :------------: | :---------: |
| **Admin** (`/admin`)               | 7            |      3/7       |      0      |
| **Casino** (`/casino`)             | 8            |     0/8 ❌     | 1 (loyalty) |
| **F&B** (`/fnb`)                   | 2            |     0/2 ❌     |      0      |
| **System Admin** (`/system-admin`) | 25           |     12/25      |      5      |
| **Diğer**                          | 3            |      0/3       |      0      |
| **TOPLAM**                         | **45**       |   **15/45**    |    **6**    |

### 3.3 Kritik Frontend Sorunları

#### 🔴 Kritik

| #   | Sorun                        | Etki                                                                                                                                                       |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **shadcn/ui tamamen eksik**  | `components/ui/` BOŞ. `globals.css` shadcn import'ları var ama bileşen yüklenmemiş. AGENTS.md'deki "shadcn/ui" deklarasyonu ile gerçek durum tam tutarsız. |
| 2   | **45/45 sayfa "use client"** | Next.js 15'in en güçlü özelliği (RSC) hiç kullanılmıyor. Tüm data fetching client-side → büyük JS bundle, yavaş initial load.                              |
| 3   | **PermissionGate tutarsız**  | Casino (0/8), F&B (0/2), Profile/Reports/Weather (0/3) — hiçbirinde yetkilendirme kontrolü yok.                                                            |

#### 🟠 Yüksek

| #   | Sorun                                  | Etki                                                                                           |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 4   | **Sayfa başına error boundary yok**    | Tek `error.tsx` tüm dashboard'da paylaşılıyor — hata izolasyonu yok                            |
| 5   | **Sayfa başına loading.tsx yok**       | Tek skeleton tüm sayfalar için aynı — tablo/harita/form sayfaları aynı grid skeleton           |
| 6   | **~30 sayfada isError kontrolü eksik** | API hatası sessizce yutulur veya beyaz ekran                                                   |
| 7   | **CSS variable'lar kullanılmıyor**     | 40+ CSS variable tanımlı ama FormComponents hardcoded renk kullanıyor — tema değişimi imkansız |

#### 🟡 Orta

| #   | Sorun                       | Etki                                                                                                                                 |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 8   | **6 boş klasör**            | `casino/loyalty/`, `system-admin/loyalty-settings/`, `task-definitions/`, `pricing/concepts/`, `pricing/history/`, `products/stock/` |
| 9   | **Mega page.tsx dosyaları** | `fnb/page.tsx` (860L), `weather/page.tsx` (708L), `api-docs/page.tsx` (607L) — bileşenlere ayrılmalı                                 |
| 10  | **Modal erişilebilirliği**  | `role="dialog"`, `aria-modal`, focus trap YOK — WCAG 2.1 uyumsuz                                                                     |
| 11  | **Font boyutu 18px base**   | `html { font-size: 18px }` — standart 16px'ten büyük, tüm rem değerleri %12.5 büyük                                                  |

### 3.4 Bileşen Yapısı

| Kategori                                          | Dosya Sayısı | Durum                            |
| ------------------------------------------------- | ------------ | -------------------------------- |
| **Shared** (`components/shared/`)                 | 18           | ✅ Aktif kullanımda              |
| **Calendar** (`components/calendar/`)             | 7            | ✅ Aktif                         |
| **Map** (`components/map/`)                       | 4            | ✅ Aktif                         |
| **Three.js** (`components/three/`)                | 8            | ✅ 3D WebGL görünüm              |
| **Products** (`components/products/`)             | 1            | ✅ Import modal                  |
| **Reports** (`components/reports/`)               | 1            | ✅ Slidev editor                 |
| **Service Points** (`components/service-points/`) | 1            | ✅ Harita yerleştirme            |
| **UI** (`components/ui/`)                         | **0**        | ❌ **BOŞ — shadcn kurulu değil** |

### 3.5 FormComponents — Fiili UI Kütüphanesi

`FormComponents.tsx` projede shadcn yerine kullanılan **tek merkezi UI modülüdür**:

| Export                   | Tip       | Açıklama                                    |
| ------------------------ | --------- | ------------------------------------------- |
| `Modal`                  | Bileşen   | Backdrop + ESC kapatma (ama focus trap yok) |
| `Field`                  | Bileşen   | Label + input wrapper                       |
| `ErrorMsg`               | Bileşen   | Kırmızı hata mesajı                         |
| `primaryBtnCls`          | CSS class | `bg-amber-600`, min-h 44px                  |
| `dangerBtnCls`           | CSS class | `bg-red-600`, min-h 44px                    |
| `successBtnCls`          | CSS class | `bg-emerald-600`, min-h 44px                |
| `editBtnCls`             | CSS class | `bg-sky-950/50`, min-h 44px                 |
| `ghostBtnCls`            | CSS class | `bg-neutral-800`, min-h 44px                |
| `inputCls` / `selectCls` | CSS class | `bg-neutral-800`, focus: yellow-600         |

> **Not:** Buton hiyerarşisi iyi tanımlanmış, dokunma boyutları mobil uyumlu (44px). Ancak tüm renkler hardcoded — CSS variable kullanılmıyor.

---

## 4. SERVİS & ALTYAPI ANALİZİ

### 4.1 Servis Katmanı (`src/services/`)

| Servis                           | Fonksiyonlar                    | Error Handling   | Type Safety              |
| -------------------------------- | ------------------------------- | ---------------- | ------------------------ |
| `rbac.service.ts`                | Permission/role seeding         | ❌ Yok           | ⚠️ `prisma as any`       |
| `report.service.ts`              | 6 rapor tipi + PDF/Excel export | ⚠️ Kısmi         | ✅ Interface'ler tanımlı |
| `notification.service.ts`        | send, markAsRead, getUnread     | ❌ Try-catch yok | ✅ İyi tipler            |
| `presentation.service.ts`        | PPTX sunum üretimi              | ❌ Yok           | ⚠️ Inline cast'ler       |
| `html-presentation.service.ts`   | HTML sunum (493L)               | ❌ Yok           | ✅ Detaylı interface'ler |
| `slidev-presentation.service.ts` | Slidev Markdown sunum (789L)    | ❌ Yok           | ✅ Detaylı tipler        |

**Servis Katmanı Skoru: ⭐⭐⭐ / 5** — Servisler var ama error handling büyük eksik, sunum servisleri çok büyük (refactor gerekir).

### 4.2 Auth Sistemi

| Bileşen                               | Özellik                                                                                | Skor     |
| ------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| **NextAuth** (`auth.ts`)              | JWT 15dk TTL, her refresh'te DB rol kontrolü, deaktif kullanıcı engeli, secure cookies | ⭐⭐⭐⭐ |
| **withAuth()** (`api-middleware.ts`)  | IP+method+path bazlı rate limit, RBAC, try-catch wrapper, standart response            | ⭐⭐⭐⭐ |
| **Edge Middleware** (`middleware.ts`) | Public route bypass, CSP nonce, cookie kontrolü                                        | ⭐⭐⭐½  |

**Eksikler:**

- `requiredPermissions` parametresi tanımlı ama implement edilmemiş
- Middleware'de sadece cookie varlığı kontrol ediliyor, token geçerliliği (expiry) doğrulanmıyor

### 4.3 Lib Utilities Değerlendirmesi

| Utility                            | Skor       | Neden                                                                            |
| ---------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| **Prisma Client** (`prisma.ts`)    | ⭐⭐⭐⭐   | Singleton + PrismaPg adapter + soft-delete middleware ($extends)                 |
| **Rate Limiter** (`rate-limit.ts`) | ⭐⭐⭐⭐⭐ | Redis sliding window + in-memory fallback — çift katmanlı, iyi tasarım           |
| **Redis** (`redis.ts`)             | ⭐⭐⭐⭐   | ioredis singleton, lazy connect, 3 retry, error handler                          |
| **Cache** (`cache.ts`)             | ⭐⭐⭐⭐   | `cached<T>()` generic, Redis → memory fallback, max 500 entry, TTL-based         |
| **Audit** (`audit.ts`)             | ⭐⭐⭐⭐   | Non-blocking `after()` ile, response'ı bloklamaz                                 |
| **RBAC** (`rbac.ts`)               | ⭐⭐⭐⭐   | 424 satır permission template, kapsamlı rol-yol eşlemeleri                       |
| **Validators** (`validators.ts`)   | ⭐⭐⭐⭐⭐ | 14+ Zod schema, `parseBody()` helper, Türkçe hata mesajları                      |
| **Email** (`email.ts`)             | ⭐⭐⭐⭐   | Fire-and-forget, SMTP yoksa sessizce skip                                        |
| **SSE Manager** (`sse.ts`)         | ⭐⭐⭐⭐   | Connection management, user/role/broadcast, ping loop                            |
| **Currency** (`currency.ts`)       | ⭐⭐⭐⭐   | TRY/EUR/USD, NaN koruma, fallback                                                |
| **Pricing** (`pricing.ts`)         | ⭐⭐⭐½    | Konsept + ekstra fiyatlama — Decimal→number dönüşümü düzgün ama null skip sessiz |

### 4.4 Custom Hook'lar

| Hook                        | Fonksiyon                       | Değerlendirme                                      |
| --------------------------- | ------------------------------- | -------------------------------------------------- |
| `usePermissions.ts`         | `can()`, `canAny()`, `canAll()` | ✅ 60s staleTime, SYSTEM_ADMIN bypass              |
| `useSSE.ts`                 | SSE bağlantısı, auto-reconnect  | ✅ Exponential backoff (1s→30s), 12 event listener |
| `useReservationCalendar.ts` | Takvim + SSE real-time          | ✅ Query invalidation on SSE event                 |
| `useNotificationSound.ts`   | Web Audio API ses üretimi       | ✅ 4 ses tipi, harici dosya gerektirmez            |

### 4.5 Docker / Altyapı

| Servis       | Image                | Port     | Durum                             |
| ------------ | -------------------- | -------- | --------------------------------- |
| **postgres** | `postgres:16-alpine` | Internal | ✅ Healthcheck, persistent volume |
| **redis**    | `redis:7-alpine`     | Internal | ✅ 128MB maxmemory, LRU eviction  |
| **app**      | Custom Dockerfile    | 3006     | ✅ Standalone Next.js build       |
| **socket**   | Dockerfile.socket    | 3007     | ✅ Ayrı Socket.IO server          |

### 4.6 Major Dependencies

| Paket                   | Versiyon | Amaç                 |
| ----------------------- | -------- | -------------------- |
| `next`                  | 16.1.6   | Next.js App Router   |
| `react` / `react-dom`   | 19.2.3   | React 19             |
| `@prisma/client`        | ^7.4.1   | ORM                  |
| `next-auth`             | ^4.24.13 | Auth (JWT)           |
| `ioredis`               | ^5.10.0  | Redis client         |
| `zod`                   | ^4.3.6   | Schema validation    |
| `@tanstack/react-query` | ^5.90.21 | Client data fetching |
| `socket.io`             | ^4.8.3   | Real-time            |
| `@fullcalendar/*`       | ^6.1.20  | Takvim UI            |
| `@react-three/fiber`    | ^9.5.0   | 3D harita görünümü   |
| `zustand`               | ^5.0.11  | Client state         |
| `nodemailer`            | ^7.0.13  | E-posta              |

---

## 5. GÜVENLİK ANALİZİ

| #   | Seviye        | Konum                 | Sorun                                                   | Öneri                                                                          |
| --- | ------------- | --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | 🔴 **Kritik** | 15 API endpoint       | Hard delete kullanımı                                   | Soft delete pattern'e geçiş                                                    |
| 2   | 🔴 **Yüksek** | `next.config.ts`      | CSP'de `'unsafe-eval'`                                  | Nonce-based CSP'ye geçiş (middleware'de nonce üretiliyor ama inject edilmiyor) |
| 3   | 🔴 **Yüksek** | `docker-compose.yaml` | `INTERNAL_API_SECRET` = `demo-secret-2026`              | `.env.local`'dan okunmalı                                                      |
| 4   | 🟠 **Yüksek** | Casino/F&B sayfaları  | PermissionGate kullanılmıyor (0/10 sayfa)               | Tüm CRUD sayfalarına PermissionGate eklenmeli                                  |
| 5   | 🟡 **Orta**   | `api-middleware.ts`   | `requiredPermissions` tanımlı ama implement edilmemiş   | Gerçek permission kontrolü veya kaldırma                                       |
| 6   | 🟡 **Orta**   | `rbac.service.ts`     | `prisma as any` — tip kontrolsüz                        | Type-safe Prisma extension                                                     |
| 7   | 🟡 **Orta**   | `middleware.ts`       | Sadece cookie varlığı kontrol — token decode yok        | Edge'de JWT expiry kontrolü                                                    |
| 8   | 🟡 **Orta**   | 3 API endpoint        | `logAudit()` çağırmıyor                                 | Audit log eklenmeli                                                            |
| 9   | 🟢 **Düşük**  | `notify.ts`           | `INTERNAL_API_SECRET` fallback olarak `NEXTAUTH_SECRET` | Ayrı secret                                                                    |

---

## 6. PERFORMANS ANALİZİ

| #   | Seviye        | Konum               | Sorun                                                   | Öneri                                |
| --- | ------------- | ------------------- | ------------------------------------------------------- | ------------------------------------ |
| 1   | 🔴 **Yüksek** | Tüm sayfalar        | 45/45 page.tsx `"use client"` — RSC yok                 | Server Components'a kademeli geçiş   |
| 2   | 🟡 **Orta**   | `auth.ts`           | Her JWT refresh'te `prisma.user.findUnique()`           | Redis cache + 30s TTL                |
| 3   | 🟡 **Orta**   | `report.service.ts` | Raporlar cache'lenmemiş — her çağrıda full DB scan      | `cached()` utility kullanımı         |
| 4   | 🟡 **Orta**   | `rbac.service.ts`   | Bootstrap'te N+1 — her role/permission için ayrı upsert | `createMany` veya transaction batch  |
| 5   | 🟡 **Orta**   | `globals.css`       | 12+ splash/login `@keyframes`, bazıları infinite loop   | Lazy loading veya conditional import |
| 6   | 🟢 **Düşük**  | Sunum servisleri    | 3 servis toplam ~1600L — veri çekimi cache'siz          | `cached()` ile sarma                 |

---

## 7. MİMARİ AKIŞ DİYAGRAMI

```
Kullanıcı İsteği
    │
    ▼
middleware.ts ──→ Token yok? ──→ /login redirect
    │                              CSP nonce üretimi
    ▼ (token var)
(dashboard)/layout.tsx [SERVER]
    ├─ getServerSession() → session yok? → redirect("/login")
    ├─ SessionProvider
    ├─ QueryProvider (React Query)
    ├─ NextIntlClientProvider (Türkçe)
    ├─ ToastProvider / NotificationProvider
    └─ DashboardLayoutClient [CLIENT]
         ├─ Sidebar (role-based nav, collapsible gruplar)
         ├─ StickyHeader (breadcrumb, user menu, bildirimler)
         └─ <main> ──→ page.tsx [CLIENT — tümü "use client"]
                         ├─ useQuery() → /api/* fetch
                         │      │
                         │      ▼
                         │   API Route (withAuth wrapper)
                         │      ├─ Rate limit kontrolü
                         │      ├─ Auth + RBAC kontrolü
                         │      ├─ Zod validation
                         │      ├─ Prisma DB işlemi
                         │      ├─ logAudit() (non-blocking)
                         │      └─ { success, data, error } response
                         │
                         ├─ useSSE() → Real-time güncellemeler
                         │      └─ SSE Manager (broadcast/user/role)
                         │
                         ├─ PermissionGate (YALNIZCA BAZI SAYFALARDA)
                         ├─ FormComponents (Modal, Field, buttons)
                         └─ JSX render (hardcoded Tailwind classes)

    Socket.IO Server (port 3007) ─────── Real-time Events
         ├─ Notification push
         ├─ Reservation updates
         └─ Order status changes
```

---

## 8. ÖNCELİKLENDİRİLMİŞ AKSİYON PLANI

### 🔴 P0 — Acil (1-2 gün)

| #   | Aksiyon                                               | Etki Alanı | Tahmini Efor |
| --- | ----------------------------------------------------- | ---------- | ------------ |
| 1   | **15 endpoint'i soft delete'e çevir**                 | API        | 3-4 saat     |
| 2   | **Casino/F&B sayfalarına PermissionGate ekle**        | Frontend   | 2-3 saat     |
| 3   | **docker-compose.yaml'den hardcoded secret'ı kaldır** | Altyapı    | 15 dakika    |
| 4   | **3 endpoint'e logAudit() ekle**                      | API        | 30 dakika    |
| 5   | **Reviews endpoint'inde audit entity düzelt**         | API        | 10 dakika    |

### 🟠 P1 — Yüksek Öncelik (1 hafta)

| #   | Aksiyon                                                   | Etki Alanı | Tahmini Efor |
| --- | --------------------------------------------------------- | ---------- | ------------ |
| 6   | **7 modele soft delete alanları ekle** + migration        | Prisma     | 2-3 saat     |
| 7   | **API response formatını standardize et** (~118 endpoint) | API        | 1-2 gün      |
| 8   | **CSP'den unsafe-eval kaldır**, nonce injection aktif et  | Güvenlik   | 3-4 saat     |
| 9   | **Per-page error.tsx ve loading.tsx ekle** (en az 5 grup) | Frontend   | 4-5 saat     |
| 10  | **isError kontrolünü ~30 sayfaya ekle**                   | Frontend   | 3-4 saat     |

### 🟡 P2 — Orta Öncelik (2-3 hafta)

| #   | Aksiyon                                                                                             | Etki Alanı | Tahmini Efor |
| --- | --------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| 11  | **shadcn/ui bileşenlerini kur** (button, input, dialog, table, select)                              | Frontend   | 1-2 gün      |
| 12  | **Server Components'a kademeli geçiş** — dashboard sayfalarını RSC + client alt bileşen olarak ayır | Frontend   | 3-5 gün      |
| 13  | **CSS variable standardizasyonu** — FormComponents'ı CSS var'lara bağla                             | Frontend   | 1 gün        |
| 14  | **Servis katmanına error handling ekle** (try-catch + typed errors)                                 | Backend    | 1 gün        |
| 15  | **Eksik index'leri ekle** (Concept.name, User.role)                                                 | Prisma     | 30 dakika    |

### 🟢 P3 — İyileştirme (Sürekli)

| #   | Aksiyon                                                                   | Etki Alanı  | Tahmini Efor |
| --- | ------------------------------------------------------------------------- | ----------- | ------------ |
| 16  | **Mega page.tsx dosyalarını bileşenlere ayır** (fnb 860L, weather 708L)   | Frontend    | 1-2 gün      |
| 17  | **6 boş klasörü temizle veya implement et**                               | Proje       | 2-3 saat     |
| 18  | **Modal erişilebilirliği** (focus trap, aria-modal, role="dialog")        | A11y        | 3-4 saat     |
| 19  | **Report cache'leme** — `cached()` utility ile rapor sonuçlarını cache'le | Performans  | 2-3 saat     |
| 20  | **requiredPermissions** implement et veya kaldır                          | Auth        | 2-3 saat     |
| 21  | **API docs'u OpenAPI/Swagger'dan otomatik üret**                          | DX          | 1 gün        |
| 22  | **`prisma as any` cast'lerini düzelt**                                    | Type Safety | 2-3 saat     |

---

## 9. İSTATİSTİK ÖZETİ

| Metrik                      | Değer                                |
| --------------------------- | ------------------------------------ |
| **Toplam API Handler**      | 153                                  |
| **Çalışan Endpoint**        | 33 (%21.6)                           |
| **Eksik/Yarım Endpoint**    | 101 (%66.0)                          |
| **Hatalı Endpoint**         | 19 (%12.4)                           |
| **Toplam Dashboard Sayfa**  | 45                                   |
| **PermissionGate Kullanan** | 15/45 (%33)                          |
| **"use client" Sayfa**      | 45/45 (%100)                         |
| **Prisma Model**            | ~30                                  |
| **Soft Delete Eksik Model** | 7                                    |
| **Hard Delete İhlali**      | 15 endpoint                          |
| **Audit Log Eksik**         | 3 endpoint                           |
| **Response Format İhlali**  | ~118 endpoint (%77)                  |
| **Boş Klasör**              | 6                                    |
| **Güvenlik Sorunu**         | 9 (3 kritik, 3 yüksek, 3 orta-düşük) |
| **Performans Sorunu**       | 6 (1 yüksek, 4 orta, 1 düşük)        |

---

## 10. SONUÇ

Royal Cabana projesi **güçlü bir altyapı temeline** sahiptir:

- Auth sistemi (JWT + RBAC + rate limit) sağlam
- Çift katmanlı Redis/memory cache & fallback iyi tasarlanmış
- Zod validation kapsamlı (14+ schema, Türkçe mesajlar)
- Real-time dual channel (SSE + Socket.IO) kurulu
- Docker compose + standalone build production-ready

Ancak **kritik boşluklar** mevcuttur:

- API katmanı %66 oranında yarım/eksik — projenin ana zayıf noktası
- 15 hard delete ihlali AGENTS.md kurallarıyla çelişiyor
- Frontend'de shadcn/ui eksikliği ve tüm sayfaların client-side olması performansı etkiliyor
- PermissionGate tutarsızlığı güvenlik açığı oluşturuyor

**Genel Olgunluk Seviyesi: %45 — MVP aşamasında, production'a hazır değil.**

Öncelikli olarak P0 aksiyonları (soft delete, PermissionGate, secret temizliği) tamamlanmalı, ardından P1 ile API standardizasyonu ve frontend error handling güçlendirilmelidir.

---

> _Bu rapor 4 paralel subagent (API, Prisma, Frontend, Altyapı) tarafından eşzamanlı analiz edilerek oluşturulmuştur._
