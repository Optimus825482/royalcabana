# Royal Cabana — Genel Uygulama Analiz Raporu

**Tarih:** 4 Mart 2026  
**Kapsam:** Genel mimari, modüller, veri modeli, API ve frontend yapısı

---

## 1. Uygulama Özeti

**Royal Cabana** (fabana), plaj kulübesi (Cabana) ve rezervasyon yönetimi için tasarlanmış **fullstack bir plaj resort yönetim uygulamasıdır**. Casino, F&B (yiyecek-içecek), sistem yönetimi ve raporlama modülleri tek bir dashboard altında toplanmıştır.

| Özellik | Değer |
|--------|--------|
| Proje adı | royal-cabana-temp (fabana) |
| Versiyon | 0.1.0 |
| Port | 3006 (Next.js), 3007 (Socket.IO) |
| Dil / UI | Türkçe (next-intl), kod/API İngilizce |

---

## 2. Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 16.1.6 (App Router), React 19.2.3 |
| Veritabanı | PostgreSQL 16, Prisma 7.4.1 (+ @prisma/adapter-pg) |
| Auth | NextAuth 4.24.13 (JWT + Credentials) |
| State | Zustand 5.0.11 (client), TanStack React Query 5.90.21 (server) |
| Real-time | Socket.IO 4.8.3 (ayrı socket-server) |
| i18n | next-intl 4.8.3 (TR) |
| UI | Tailwind CSS 4, Radix UI, Lucide React, shadcn/ui |
| Harita | Leaflet, react-leaflet |
| Takvim | FullCalendar 6 (core, daygrid, timegrid, resource-timeline, interaction) |
| 3D | Three.js, @react-three/fiber, @react-three/drei, postprocessing |
| Export | jsPDF, pptxgenjs, xlsx |
| Validation | Zod 4.3.6 |
| Ortam | Docker, docker-compose (PostgreSQL, Redis, app, socket) |

---

## 3. Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  Next.js App Router │ React 19 │ TanStack Query │ Zustand        │
│  Tailwind │ shadcn │ FullCalendar │ Leaflet │ Three.js          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                     NEXT.JS (Port 3006)                          │
│  Middleware (auth, CSP nonce) → App Router → API Routes           │
│  withAuth() → RBAC + rate limit → Service / Prisma               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  PostgreSQL (royal_cabana)  │  Redis (cache/rate-limit)          │
│  Socket server (3007) — real-time notifications                 │
└─────────────────────────────────────────────────────────────────┘
```

- **API cevap formatı:** `{ success, data?, error? }`
- **Soft delete:** Kritik modellerde `isDeleted` + `deletedAt` kullanılır; hard delete yasak (AGENTS.md).
- **Fiyat alanları:** `Decimal` (Float yasak).

---

## 4. Veri Modeli Özeti (Prisma)

### 4.1 Kullanıcı ve Yetkilendirme

| Model | Açıklama |
|-------|----------|
| **User** | username, email, passwordHash, role (SYSTEM_ADMIN, ADMIN, CASINO_USER, FNB_USER), isActive |
| **RoleDefinition** | Rol tanımları, displayName, permissions ilişkisi |
| **Permission** | key, module, action (RBAC izinleri) |
| **RolePermission** | Rol–Permission çoklu ilişki |
| **LoginSession** | Oturum takibi (ip, userAgent, deviceType, lastSeenAt) |
| **PushSubscription** | Web Push abonelikleri (endpoint, p256dh, auth) |

### 4.2 Cabana ve Sınıflandırma

| Model | Açıklama |
|-------|----------|
| **CabanaClass** | Cabana sınıfları (VIP, Standard vb.), metadata JSON |
| **ClassAttribute** | Sınıf bazlı key-value (EAV) |
| **Cabana** | name, classId, conceptId, coordX/Y, rotation, scale, status (AVAILABLE, RESERVED, CLOSED), isOpenForReservation |

### 4.3 Konsept ve Ürün

| Model | Açıklama |
|-------|----------|
| **ProductGroup** | Ürün grupları, sortOrder |
| **Concept** | Konsept (paket), classId, serviceFee (Decimal) |
| **Product** | name, groupId, purchasePrice, salePrice, isActive, stok alanları |
| **ConceptProduct** | Konsept–ürün (quantity) |
| **ConceptExtraService** | Konsept–ekstra hizmet (ExtraService) ilişkisi |
| **ExtraService** | Ekstra hizmet tanımı, category |
| **ExtraServicePrice** | Ekstra hizmet fiyat geçmişi (effectiveFrom, effectiveTo) |

### 4.4 Rezervasyon ve Talepler

| Model | Açıklama |
|-------|----------|
| **Reservation** | cabanaId, userId, guestId, guestName, startDate, endDate, status, totalPrice, conceptId, extraItems_json, customRequests, check-in/out |
| **ReservationStatusHistory** | Durum geçmişi (fromStatus, toStatus, changedBy) |
| **ModificationRequest** | Tarih/Cabana/misafir değişiklik talepleri |
| **CancellationRequest** | İptal talepleri |
| **ExtraConceptRequest** | Ek konsept talepleri (items JSON) |
| **ExtraItem** | Rezervasyona eklenen F&B ürünleri (productId, quantity, unitPrice) |

### 4.5 Diğer İş Alanları

| Model | Açıklama |
|-------|----------|
| **Guest** | Misafir (name, phone, email, vipLevel, isBlacklisted) |
| **Notification** | type, title, message, metadata, isRead |
| **AuditLog** | action, entity, entityId, oldValue, newValue |
| **FnbOrder / FnbOrderItem** | F&B siparişleri (reservationId, cabanaId, status) |
| **BlackoutDate** | Cabana veya genel kapalı tarihler |
| **WaitlistEntry** | Bekleme listesi (cabanaId, desiredStart/End) |
| **RecurringBooking** | Tekrarlayan rezervasyon (pattern: WEEKLY, BIWEEKLY, MONTHLY) |
| **TaskDefinition, Staff, StaffAssignment, StaffTask** | Personel ve görev yönetimi |
| **ServicePoint, ServicePointStaff** | Hizmet noktaları (BAR, RESTAURANT vb.) ve personel ataması |
| **Review** | Rezervasyon değerlendirmeleri |
| **SystemConfig** | Key-value sistem ayarları |

Fiyatlandırma: Schema içinde eski CabanaPrice/ConceptPrice kaldırılmış; günlük fiyat ve hesaplanan varsayılan fiyat API tarafında (`/api/pricing/cabana-daily-prices`, `/api/pricing/calculated-default`, `/api/pricing/preview`) yönetiliyor.

---

## 5. Uygulama Yapısı (Sayfalar ve API)

### 5.1 Route Grupları (Sayfalar)

| Grup | Yol | Açıklama |
|------|-----|----------|
| **(auth)** | `/login` | Giriş sayfası |
| **(dashboard)** | `/` | Ana dashboard (role’e göre yönlendirme) |
| **admin** | `/admin`, `/admin/calendar`, `/admin/pricing`, `/admin/requests`, `/admin/reservations`, `/admin/users` | Admin takvim, fiyat, talepler, rezervasyonlar |
| **casino** | `/casino`, `/casino/calendar`, `/casino/map`, `/casino/reservations`, `/casino/recurring`, `/casino/view`, `/casino/waitlist`, `/casino/reviews` | Casino kullanıcı rezervasyon ve harita |
| **fnb** | `/fnb`, `/fnb/[id]/extras` | F&B sipariş ve ekstralar |
| **reports** | `/reports` | Raporlar |
| **system-admin** | `/system-admin/*` | Sistem yönetimi (cabanas, calendar, classes, concepts, pricing, products, staff, map, blackout-dates, reservations, audit-trail, api-docs, qr-codes, role-definitions, system-control, extra-services, service-points, service-point-definitions, pricing/services, cabanas, guests, help, guide, cancellation-policy, users, weather) |
| **profile** | `/profile` | Kullanıcı profili |
| **weather** | `/weather` | Hava durumu |

Toplam **~47 sayfa** (page.tsx).

### 5.2 API Route’lar (Özet)

- **Auth:** `/api/auth/[...nextauth]`, `/api/auth/token`, `/api/auth/login-track`, `/api/auth/logout-track`, `/api/auth/heartbeat`, `/api/auth/permissions`, `/api/auth/sessions`
- **Cabanas:** CRUD, `/api/cabanas/[id]/location`, `/api/cabanas/[id]/qr`, `/api/cabanas/[id]/status`
- **Reservations:** CRUD, approve, reject, check-in, check-out, modifications, cancellations, extra-concepts, extras, custom-request-price, pending-update, calendar
- **Concepts / Products / Product groups:** CRUD, concepts’e products/extra-services
- **Pricing:** `/api/pricing/cabana-daily-prices`, `/api/pricing/calculated-default`, `/api/pricing/preview`
- **F&B:** `/api/fnb/orders`, `/api/fnb/orders/[id]`
- **Staff:** CRUD, assignments, assignments/bulk, tasks
- **Service points:** CRUD, `/api/service-points/[id]/staff`
- **Guests, Notifications, Audit, Blackout, Waitlist, Recurring, Reviews, Push (subscribe), Health, CSP report, System config, Reports (generate, presentation), Weather, Map elevation, Task definitions, System-admin (role-definitions, permissions, stats), Admin stats, Casino stats**

API route’lar **withAuth(allowedRoles, handler)** ile korunuyor; isteğe bağlı rate limit ve `requiredPermissions` kullanılabiliyor.

---

## 6. Bileşen Yapısı (src/components)

| Kategori | Bileşenler |
|----------|------------|
| **shared** | SessionProvider, QueryProvider, ToastProvider, NotificationProvider, DashboardLayoutClient, Navbar, Sidebar, Breadcrumb, StickyHeader, LoadingSpinner, NotificationPopup, NotificationPanel, PermissionGate, SessionTracker, FormComponents, PWAInstallPrompt, WeatherCard, WeatherWidget |
| **calendar** | ReservationCalendar, ReservationCalendarInner, ReservationTimeline, ReservationTimelineInner, ReservationRequestForm, ReservationDetailModal, CabanaDetailModal |
| **map** | CabanaMap, CabanaMapInner, TransformControls, cabana-icons |
| **three** | CabanaThreeView, CabanaThreeViewInner, effects (SkyDome, ParticleSystem, CameraAnimator, CabanaLights, WaterPlane, PostProcessing) |
| **service-points** | ServicePointMapPlacer |
| **products** | ImportModal |
| **reports** | SlidevEditor |

---

## 7. Güvenlik ve Erişim Kontrolü

- **Middleware:** Public route’lar (`/login`, `/register`, `/api/auth`, `/api/health`) ve statik prefix’ler hariç; token yoksa `/login`’e yönlendirme. CSP nonce üretimi.
- **Dashboard:** `getServerSession(authOptions)` ile oturum yoksa `/login`’e redirect.
- **API:** `withAuth(allowedRoles)` ile JWT session, rol kontrolü ve rate limiting (varsayılan 30 req/dk).
- **RBAC:** `src/lib/rbac.ts` — Permission ve RoleDefinition tabanlı; path bazlı erişim ve API için `requiredPermissions` kullanılabilir.

---

## 8. Konvansiyonlar ve Kurallar (AGENTS.md)

- Prisma schema değişince: `npx prisma migrate dev --name <name>`
- API’lerde auth: `withAuth()` kullanımı zorunlu
- Soft delete: `isDeleted` + `deletedAt`; hard delete yasak
- Para birimi: `Decimal`; Float yasak
- Response: `{ success, data?, error? }`
- Secret’lar: `.env.local`; `.env`’e secret yazılmaz
- Doğrulama: `npx tsc --noEmit`, `npx next lint`, `npx next build`, `npx prisma validate`

---

## 9. Bilinen Dikkat Noktaları

- **Decimal:** JSON’da string; frontend’de `parseFloat()` gerekebilir.
- **Soft delete:** Prisma `findMany` varsayılan olarak silinmiş kayıtları da getirir; `where: { isDeleted: false }` kullanılmalı.
- **Next.js 15+:** `cookies()` ve `headers()` async; await unutulmamalı.
- **Paylaşılan dosyalar (paralel düzenleme riski):** `prisma/schema.prisma`, `src/types/index.ts`, `src/lib/auth.ts`, `src/middleware.ts`.

---

## 10. Mevcut Raporlarla İlişki

- **ANALIZ-RAPORU.md** (26 Şubat 2026): Detaylı risk analizi, iş akışları, güvenlik ve performans önerileri (race condition, soft delete, NextAuth uyumluluk, IDOR, rate limiting, bundle size vb.). Bu rapor genel yapıyı özetler; derinlemesi için ANALIZ-RAPORU.md’e bakılmalı.
- **prisma/PRISMA-ANALIZ-RAPORU.md:** Prisma ve migration odaklı analiz.

---

## 11. Özet Tablo

| Başlık | Durum |
|--------|--------|
| Modül sayısı | Admin, Casino, F&B, System-Admin, Reports, Profile, Weather |
| Sayfa sayısı | ~47 |
| API route sayısı | ~100 (route.ts) |
| Prisma model sayısı | ~45+ |
| Auth | NextAuth JWT + withAuth + RBAC |
| Real-time | Socket.IO (ayrı servis) |
| Deployment | Docker Compose (postgres, redis, app, socket) |

Bu doküman, uygulamanın **genel analiz ve rapor** özetidir; detaylı risk ve iyileştirme listesi için **ANALIZ-RAPORU.md** kullanılmalıdır.

---

## Rapor Bilgisi

| Alan | Değer |
|------|--------|
| **Oluşturan** | Cursor Auto (agent router) |
| **Model** | Auto (Cursor agent router) |
| **Oluşturulma tarihi** | 4 Mart 2026 |
