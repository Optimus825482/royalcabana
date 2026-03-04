# Royal Cabana — Sistem Analiz Raporu

**Tarih:** 4 Mart 2026  
**Kapsam:** Tam sistem analizi (DB → API → Service → Frontend → Güvenlik)  
**Proje:** Beach Resort Cabana Yönetim Sistemi  
**Stack:** Next.js 15 (App Router) + Prisma + PostgreSQL + Redis + Tailwind + shadcn/ui

---

## Sistem Tanımı

Royal Cabana, bir oteldeki **Casino** ve **F&B (Food & Beverage)** departmanları arasında dijital köprü kuran bir Cabana rezervasyon yönetim sistemidir. Temel akış:

```
Casino Talebi → Admin Onay/Red → Fiyatlandırma → Check-in → FnB Sipariş → Check-out → Raporlama
```

**4 Kullanıcı Rolü:** SYSTEM_ADMIN, ADMIN, CASINO_USER, FNB_USER  
**28 Veritabanı Modeli** | **101 API Route Dosyası** | **45+ Frontend Sayfası**

---

## 1. KRİTİK HATALAR (Acil Düzeltme Gerekli)

### 1.1 RBAC Permission Kontrolü Devre Dışı

**Severity: KRİTİK | OWASP: A01 Broken Access Control**

`withAuth()` middleware'inde `requiredPermissions` parametresi tanımlanıyor ama **hiçbir yerde enforce edilmiyor**. 100+ endpoint permission tanımlamış ama hepsi ignore ediliyor. Sadece `allowedRoles` kontrolü yapılıyor.

**Sonuç:** Bir `CASINO_USER` rolü olan kullanıcı, o role atanmış **tüm** endpoint'lere erişebilir — granular permission sistemi tamamen dekoratif.

**Etki:** Permission tablosu, RoleDefinition, RolePermission junction table'ı var ama veritabanında sadece süs olarak duruyor.

### 1.2 Client-Side Kodda Hardcoded Şifreler

**Severity: KRİTİK | OWASP: A04 Cryptographic Failures**

Login sayfasında (`src/app/(auth)/login/page.tsx`) demo hesap bilgileri client-side JS bundle'a dahil ediliyor:

| Hesap | Kullanıcı | Şifre |
|-------|----------|-------|
| Sistem Yöneticisi | sysadmin | admin123 |
| Admin | admin | 123456 |
| Casino Kullanıcısı | casino1 | admin123 |
| F&B Kullanıcısı | fnb1 | admin123 |

Demo modu kapatılsa bile şifreler JS bundle'da okunabilir halde kalır.

### 1.3 CSP'de `unsafe-inline` — XSS Koruması Etkisiz

Middleware'de nonce üretiliyor ama CSP header'ında `'unsafe-inline'` olduğu için nonce'un hiçbir etkisi yok. XSS mitigasyonu fiilen devre dışı.

### 1.4 Hard Delete + `$executeRawUnsafe` Kullanımı

AGENTS.md'de "hard delete YASAK" denilmesine rağmen, birden fazla endpoint'te hard delete yapılıyor:

| Endpoint | Model | Yöntem |
|----------|-------|--------|
| `waitlist/[id]` | WaitlistEntry | `$executeRawUnsafe` DELETE |
| `recurring-bookings/[id]` | RecurringBooking | `$executeRawUnsafe` DELETE |
| `classes/[id]/attributes/[attrId]` | ClassAttribute | `prisma.delete()` |
| `concepts/[id]/products` | ConceptProduct | `prisma.delete()` |
| `concepts/[id]/extra-services` | ConceptExtraService | `prisma.delete()` |
| `service-points/[id]/staff` | ServicePointStaff | `prisma.delete()` |

`$executeRawUnsafe` parametrize edilmiş olsa da, `$executeRaw` (tagged template) kullanılması gerekir.

### 1.5 `onDelete` Tanımsız 17 İlişki — Orphan Kayıt Riski

17 foreign key ilişkisinde `onDelete` davranışı tanımlanmamış. Prisma default'u `Restrict` uygulasa da, açık tanımlama yapılmalı. Özellikle:

- `Reservation → Cabana/User/Guest/Concept` — hiçbirinde `onDelete` yok
- `AuditLog → User` — kullanıcı silinirse log'lar ne olacak belirsiz
- `FnbOrder → Cabana` / `FnbOrderItem → Product`
- `RecurringBooking → Cabana/User`

---

## 2. VERİ MODELİ EKSİKLİKLERİ

### 2.1 Ödeme/Fatura Altyapısı Tamamen Eksik

Sistemde **Payment, Invoice, Deposit, Refund** modelleri yok. Rezervasyonda sadece `totalPrice` var ama:

- Ödendi mi? ❌ Bilinmiyor
- Ne kadar ödendi? ❌ Takip edilemiyor
- Kalan ne kadar? ❌ Hesaplanamıyor
- Fatura kesildi mi? ❌ Fatura modeli yok
- Kapora alındı mı? ❌ Deposit modeli yok
- İade yapıldı mı? ❌ Refund modeli yok

**Bu, bir rezervasyon sisteminin en temel eksikliğidir.**

### 2.2 Soft Delete Pattern Tutarsızlığı (12 Model)

AGENTS.md kuralı `isDeleted + deletedAt` ikisini birden zorunlu kılıyor ama:

| Durum | Model Sayısı | Modeller |
|-------|-------------|----------|
| `isDeleted` + `deletedAt` (doğru) | 10 | RoleDefinition, Permission, RolePermission, CabanaClass, ProductGroup, Concept, Notification, BlackoutDate, Review, ServicePoint, ExtraService |
| Sadece `deletedAt` (eksik isDeleted) | 7 | User, Cabana, Product, Reservation, Guest, TaskDefinition, Staff |
| Hiçbiri yok (tamamen eksik) | 3 | ClassAttribute, WaitlistEntry, RecurringBooking |

### 2.3 String Olarak Tutulan Alanlar (Enum Olmalı)

| Alan | Model | Mevcut | Olması Gereken |
|------|-------|--------|---------------|
| type | ServicePoint | String | ServicePointType enum |
| category | ExtraService | String | ExtraServiceCategory enum |
| priority | TaskDefinition | String | TaskPriority enum |
| shift | StaffAssignment, ServicePointStaff | String | ShiftType enum |

### 2.4 Foreign Key Yerine String Tutulan Alanlar

`requestedBy`, `changedBy`, `addedBy`, `createdBy`, `checkedInBy`, `checkedOutBy` alanları düz String olarak tutuluyor — User modeline FK ilişkisi yok. Referential integrity yok.

### 2.5 Diğer Eksik Alanlar

| Eksik Alan | Model | Açıklama |
|-----------|-------|----------|
| `paxCount` | Reservation | Kişi sayısı — kapasite kontrolü yapılamıyor |
| `source` | Reservation | Talep kaynağı (direkt/online/telefon) |
| `totalAmount` | FnbOrder | Toplam tutar — her sorguda SUM gerekiyor |
| `unit` | Product | Birim bilgisi (adet/porsiyon/şişe) |
| `recurringBookingId` | Reservation | Otomatik oluşturulan rez → recurring bağlantısı kopuk |
| `userId` | Staff | Personel ↔ kullanıcı bağlantısı yok |

### 2.6 Guest Modeli Unique Constraint Eksik

`Guest` modelinde `name`, `phone`, `email` hiçbiri unique değil. Aynı misafir birden fazla kayıt olarak oluşturulabilir — mükerrer kayıt riski yüksek.

---

## 3. API KATMANINDAKİ SORUNLAR

### 3.1 Response Format Tutarsızlığı (~15 Route)

Kural: `{ success: boolean, data: T, error?: string }` — ama birçok endpoint düz obje döndürüyor:

**Doğru format kullanmayan önemli endpoint'ler:**
- `reservations/[id]/approve` — `{ ...updated, priceBreakdown }`
- `reservations/[id]/reject` — direkt `updated` objesi
- `reservations/[id]/check-in` / `check-out` — direkt `updated`
- `reservations/[id]/extras` — direkt `extras` / `created`
- `reservations/[id]/modifications` — direkt `modRequest`
- `reservations/[id]/cancellations` — direkt `cancelRequest`
- `fnb/orders/[id]` — direkt `updated` / `cancelled`
- `concepts/[id]/products` — `{ message }` formatı
- `classes/[id]/attributes` — `{ message }` formatı

**Error response tutarsızlığı:** ~12 route `{ error }` kullanıyor (`{ success: false, error }` yerine), 3 route `{ message }` kullanıyor.

### 3.2 Check-in/Check-out'ta Cabana Status Lifecycle Eksik

- Check-in yapıldığında Cabana durumu **OCCUPIED** yapılmıyor
- Check-out yapıldığında Cabana durumu **AVAILABLE** yapılmıyor
- Sadece Approve'da RESERVED yapılıyor

### 3.3 Pending Update'te Race Condition

`reservations/[id]/pending-update` endpoint'inde conflict kontrolü var ama `FOR UPDATE` lock'u yok. Ana `POST /api/reservations` endpoint'inde Serializable TX + `FOR UPDATE` doğru kullanılmış ama pending-update'te atlanmış.

### 3.4 Audit Logging Tutarsızlıkları

- `cabanas/route.ts` POST — audit YOK
- `classes/[id]/attributes/[attrId]` DELETE — audit YOK
- `map/elevation` ve `users/` — `logAudit()` helper yerine direkt `prisma.auditLog.create` kullanıyor
- `profile/route.ts` — profil güncelleme audit YOK

### 3.5 `prisma as any` Type Safety İhlali (~10 Route)

`guests`, `staff`, `fnb/orders`, `waitlist`, `recurring-bookings` route'larında `(prisma as any).model.method()` kullanılıyor. Prisma extension middleware'lerini bypass edebilir, type safety yok.

### 3.6 Eksik API Endpoint'leri

| Endpoint | Açıklama | Öncelik |
|----------|----------|---------|
| `DELETE /api/reservations/[id]` | Admin tarafından soft delete | YÜKSEK |
| `POST /api/reservations/[id]/direct-cancel` | Admin direkt iptal (talep süreci geçmeden) | YÜKSEK |
| `GET /api/reservations/export` | CSV/Excel export | ORTA |
| `POST /api/reservations/bulk` | Toplu rezervasyon | DÜŞÜK |
| `POST /api/fnb/orders/[id]/items` | Mevcut siparişe ürün ekleme | ORTA |
| `GET /api/fnb/orders/stats` | FnB istatistikleri | DÜŞÜK |
| `POST /api/guests/merge` | Mükerrer misafir birleştirme | DÜŞÜK |
| `GET /api/pricing/history` | Fiyat değişiklik geçmişi | DÜŞÜK |
| Payment/Invoice endpoint'leri | Ödeme ve fatura yönetimi | KRİTİK |

---

## 4. GÜVENLİK SORUNLARI

### 4.1 Auth Endpoint'lerinde Rate Limiting Yok

| Endpoint | Auth | Rate Limit |
|----------|------|------------|
| `/api/auth/callback/credentials` (login) | NextAuth | ❌ YOK |
| `/api/auth/token` | getToken() | ❌ YOK |
| `/api/auth/login-track` | getAuthSession | ❌ YOK |
| `/api/auth/heartbeat` | getAuthSession | ❌ YOK |
| `/api/sse` | getAuthSession | ❌ YOK |
| `/api/push/subscribe` | getAuthSession | ❌ YOK |
| `/api/metrics` | ❌ Hiç yok | ❌ YOK |
| `/api/csp-report` | ❌ Hiç yok | ❌ YOK |

### 4.2 Middleware'de Route-Based RBAC Yok

`MODULE_ACCESS` map'i types'ta tanımlı ama middleware enforce etmiyor. Token varsa herhangi bir dashboard sayfası açılabilir (API seviyesinde 403 alır ama sayfa skeleton'u render olur).

### 4.3 Password Policy Yok

Kullanıcı oluşturmada sadece `z.string().min(6)` — büyük/küçük harf, rakam, özel karakter zorunluluğu yok.

### 4.4 Account Lockout Yok

Başarısız giriş denemeleri sayılmıyor. Sınırsız brute-force denemesi yapılabilir.

### 4.5 Redis Şifresiz Çalışıyor

Docker Compose'da Redis `requirepass` olmadan çalışıyor.

### 4.6 bcrypt Cost Factor Tutarsız

- `users/route.ts` ve `users/[id]/route.ts`: salt rounds = **10**
- `profile/route.ts`: salt rounds = **12**

OWASP 2025 önerisi minimum 12 rounds.

### 4.7 Middleware Token Doğrulama Eksik

Middleware sadece session cookie'nin **varlığını** kontrol ediyor, **geçerliliğini** (JWT verify, expiry) doğrulamıyor. Expired token ile sayfa yüklenebilir.

---

## 5. FRONTEND / UX EKSİKLİKLERİ

### 5.1 Eksik Sayfalar ve Özellikler

| Eksik | Açıklama | Etki |
|-------|----------|------|
| **Invoice/Fatura** | Check-out sonrası toplam harcama (cabana + FnB) yok | Finansal akış tamamlanmıyor |
| **Ödeme Takibi** | Ödemenin alınıp alınmadığı izlenemiyor | Gelir takibi yapılamıyor |
| **Check-in/Check-out Dashboard** | Bugünkü giriş/çıkışları toplu gösterecek sayfa yok | Operasyonel verimlilik düşük |
| **Dashboard Grafikleri** | Hiçbir dashboard'da zaman serisi grafik yok | Trend analizi yapılamıyor |
| **FnB Raporlama** | FnB-specifik raporlar (en çok satılan, günlük ciro) yok | Departman analizi eksik |
| **Bulk Actions** | Toplu onay/red yapılamıyor | Yoğun dönemlerde yavaşlık |
| **Bildirim Ayarları** | Push notification var ama tercih yönetim UI'ı yok | Kullanıcı deneyimi eksik |
| **Sezonsal Fiyatlandırma** | `admin/pricing/seasons` sayfası silinmiş | Fiyat yönetimi eksik |

### 5.2 Data Fetching Tutarsızlığı

3 sayfada eski `useState + useEffect + fetch` pattern'i kullanılıyor:
- `admin/reservations/page.tsx`
- `reports/page.tsx`
- `profile/page.tsx`

Diğer tüm sayfalar TanStack Query kullanıyor. Bu tutarsızlık:
- Cache yok (sayfa geçişlerinde her seferinde refetch)
- Optimistic update desteği yok
- Background refetch yok
- Error/retry logic manual

### 5.3 SSE (Real-time) Sınırlı Kullanım

- **SSE aktif**: Sadece `admin/requests` sayfası
- **SSE aktif DEĞİL**: Admin reservations, casino reservations, FnB orders (30s polling)

Casino kullanıcısı talep oluşturduktan sonra admin'in talep sayfasında anlık güncelleme var, ama admin reservation listesinde yok — tutarsız.

### 5.4 Departman Akışı Kopuklukları

| Akış Adımı | Durum | Kopukluk |
|-----------|-------|----------|
| Casino → Talep oluşturma | ✅ Var | — |
| Admin → Talep görme (SSE) | ✅ Var | — |
| Admin → Fiyat + Onay | ✅ Var | Otomatik fiyat önerisi UI'da gösterilmiyor |
| Check-in | ⚠️ Kısmi | QR scan ile check-in yok, cabana status güncellenmiyor |
| Check-in → FnB bildirim | ❌ Yok | FnB kullanıcısına otomatik bildirim gitmiyor |
| FnB sipariş | ✅ Var | — |
| Check-out | ⚠️ Kısmi | Toplam harcama özeti (cabana + FnB) yok |
| Check-out → Fatura | ❌ Yok | Invoice sayfası/modeli yok |
| Raporlama | ⚠️ Kısmi | Sadece JSON + export, grafik yok |

### 5.5 Accessibility Sorunları

- KPI kartlarında, FnB butonlarında, casino listelerinde `aria-label` eksik
- Skeleton loading'lerde `role="status"` / `aria-busy` yok
- Focus ring'ler çoğu yerde görünmüyor
- `text-neutral-500` on dark bg — WCAG AA contrast ratio'sunu karşılamayabilir
- Detail panel açıldığında focus otomatik taşınmıyor

### 5.6 Kod Tekrarları

- `KpiSkeleton` — 3 farklı dosyada tanımlanmış
- `StatusBadge` — 3 farklı implementasyon
- `formatDate` helper — 5+ dosyada ayrı ayrı tanımlanmış
- Lokal `fetchCabanas` — 7 dosyada ayrı tanımlanmış (bu oturumda merkezi `fetchers.ts` düzeltildi ama lokal kopyalar hâlâ mevcut)

---

## 6. SEED DATA EKSİKLİKLERİ

| Eksik Veri | Etki |
|-----------|------|
| Reservation | UI test edilemiyor — takvim, liste, detay sayfaları boş |
| Guest | Misafir yönetimi test edilemiyor |
| FnbOrder | FnB sayfası boş açılıyor |
| Staff / StaffAssignment | Personel yönetimi test edilemiyor |
| ExtraService | Ekstra hizmetler sayfası boş |
| ServicePoint | Hizmet noktaları haritası boş |
| Review | İnceleme sayfası boş |
| Notification | Bildirim akışı test edilemiyor |

Ayrıca:
- Tüm cabana'lar neredeyse aynı sınıf/konsepte atanmış (gerçekçi değil)
- `(prisma as any)` cast'leri seed'de potansiyel runtime hatası riski

---

## 7. ÖZET SKOR TABLOSU

| Kategori | KRİTİK | YÜKSEK | ORTA | DÜŞÜK |
|----------|--------|--------|------|-------|
| **Güvenlik** | 3 (RBAC devre dışı, hardcoded şifre, CSP) | 5 (rate limit, route RBAC, lockout, bcrypt, token) | 4 | 3 |
| **Veri Modeli** | 2 (onDelete eksik, payment modeli yok) | 3 (soft delete tutarsız, FK eksik, enum eksik) | 5 | 3 |
| **API Katmanı** | 2 (hard delete, race condition) | 3 (response format, cabana lifecycle, audit) | 4 | 3 |
| **Frontend/UX** | 0 | 4 (invoice, check-in/out, SSE, data fetch) | 6 | 5 |
| **Seed Data** | 0 | 1 (test verisi yok) | 2 | 1 |
| **TOPLAM** | **7** | **16** | **21** | **15** |

---

## 8. ÖNCELİKLENDİRİLMİŞ AKSİYON PLANI

### P0 — Bu Hafta (Production Blocker)

1. `requiredPermissions` enforcement'ı implement et (`withAuth` içinde)
2. Hardcoded şifreleri client koddan çıkar
3. CSP'yi nonce-based yap (`unsafe-inline` kaldır)
4. Login endpoint'ine agresif rate limit ekle (5 req/dk/IP)
5. Account lockout mekanizması (5 başarısız → 15 dk kilit)

### P1 — Bu Sprint (İş Mantığı Düzeltmeleri)

6. Hard delete'leri soft delete'e çevir (waitlist, recurring, classAttribute)
7. Response format standardizasyonu (~15 route)
8. Check-in/Check-out'ta Cabana status lifecycle tamamla
9. Pending-update race condition'ı `FOR UPDATE` ile düzelt
10. `onDelete` davranışlarını tüm ilişkilerde açıkça tanımla
11. Soft delete pattern tutarsızlığını gider (`isDeleted` eksik modellere ekle)
12. Middleware'de route-based RBAC enforce et

### P2 — Sonraki Sprint (Özellik Tamamlama)

13. Payment/Invoice/Deposit/Refund modelleri ve endpoint'leri
14. Fatura görüntüleme ve check-out summary sayfası
15. Check-in/Check-out dashboard'u
16. Dashboard'lara grafik görselleştirme ekle
17. TanStack Query'ye migrate (reservations, reports, profile)
18. SSE'yi tüm real-time sayfalara genişlet
19. Seed data'yı zenginleştir (reservation, guest, fnb order, staff vb.)
20. `prisma as any` cast'leri temizle

### P3 — Backlog (İyileştirmeler)

21. Shared component'ler çıkar (KpiSkeleton, StatusBadge, formatDate)
22. Lokal `fetchCabanas` kopyalarını merkezi `fetchers.ts`'e yönlendir
23. Password policy ekle
24. Redis'e şifre ekle
25. bcrypt cost factor normalize et (tüm yerlerde 12)
26. Audit log'a HMAC integrity ekle
27. Guest unique constraint ekle
28. String alanları enum'a çevir (ServicePoint.type, ExtraService.category vb.)
29. Accessibility iyileştirmeleri (aria-label, focus ring, contrast)
30. Bulk actions (toplu onay/red)
31. FnB raporlama sayfası
32. API versioning stratejisi

---

> **Genel Değerlendirme:** Sistem temel rezervasyon akışını (talep → onay → check-in → check-out) başarıyla karşılıyor. Real-time SSE, PricingEngine, cache katmanı ve optimistic update gibi ileri seviye özellikler mevcut. Ancak güvenlik katmanında RBAC'ın devre dışı olması, ödeme/fatura altyapısının tamamen eksik olması ve veri modeli tutarsızlıkları production öncesinde **mutlaka** düzeltilmesi gereken kritik sorunlardır.
