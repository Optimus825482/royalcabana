# Requirements Document — System Hardening

## Introduction

Royal Cabana Yönetim Sistemi'nin kapsamlı analizi sonucunda tespit edilen güvenlik, erişilebilirlik, performans ve altyapı iyileştirmelerini kapsayan sistem sağlamlaştırma (hardening) gereksinimleri. Analiz skoru 7.4/10 olup, bu doküman skoru yükseltmek için gerekli tüm düzeltmeleri tanımlar.

## Glossary

- **System**: Royal Cabana Next.js web uygulaması (frontend + API)
- **Service_Worker**: Tarayıcıda arka planda çalışan, cache ve offline deneyimi yöneten JavaScript worker (`public/sw.js`)
- **Rate_Limiter**: API isteklerini sınırlandıran güvenlik katmanı (`src/lib/rate-limit.ts`)
- **CSP**: Content-Security-Policy — tarayıcıya hangi kaynakların yüklenebileceğini bildiren HTTP header
- **Sidebar**: Sol navigasyon menüsü (`src/components/shared/Sidebar.tsx`)
- **StickyHeader**: Üst sabit başlık bileşeni (`src/components/shared/StickyHeader.tsx`)
- **Edge_Middleware**: Next.js edge runtime'da çalışan istek önişleyici (`src/middleware.ts`)
- **Viewport_Config**: HTML viewport meta tag ayarları (`src/app/layout.tsx`)
- **PWA_Manifest**: Progressive Web App yapılandırma dosyası (`public/manifest.json`)
- **Loading_Screen**: Dashboard yüklenme ekranı (`src/app/(dashboard)/loading.tsx`)
- **Offline_Page**: İnternet bağlantısı olmadığında gösterilen fallback sayfası (`public/offline.html`)
- **Redis**: In-memory veri deposu, rate limiting ve cache için kullanılacak
- **Touch_Target**: Mobil cihazlarda dokunulabilir alan boyutu (WCAG 2.5.8 minimum 44×44px)
- **Composite_Index**: Birden fazla sütunu kapsayan veritabanı indeksi

## Requirements

### Requirement 1: Viewport Erişilebilirlik Düzeltmesi (CRITICAL)

**User Story:** As a kullanıcı, I want sayfayı yakınlaştırabilmek, so that görme güçlüğüm olsa bile içeriği rahatça okuyabileyim.

#### Acceptance Criteria

1. THE Viewport_Config SHALL `userScalable` değerini `true` olarak ayarlamak
2. THE Viewport_Config SHALL `maximumScale` değerini `5` olarak ayarlamak
3. WHEN kullanıcı pinch-to-zoom hareketi yaptığında, THE System SHALL sayfanın yakınlaştırılmasına izin vermek

### Requirement 2: Service Worker Güçlendirmesi (CRITICAL)

**User Story:** As a kullanıcı, I want uygulama çevrimdışıyken de temel işlevlere erişebilmek, so that internet bağlantısı kesildiğinde iş akışım durmasın.

#### Acceptance Criteria

1. THE Service_Worker SHALL critical static asset'leri (CSS, JS bundle, font, icon) install aşamasında cache'lemek
2. WHEN bir navigation isteği ağ hatası döndüğünde, THE Service_Worker SHALL Offline_Page'i fallback olarak sunmak
3. THE Service_Worker SHALL static asset istekleri için stale-while-revalidate stratejisi uygulamak
4. THE Service_Worker SHALL API istekleri için network-first stratejisi uygulamak
5. WHEN yeni bir Service_Worker versiyonu aktif olduğunda, THE Service_Worker SHALL eski cache'leri temizlemek
6. THE Service_Worker SHALL cache versiyonunu uygulama versiyonuyla senkronize tutmak

### Requirement 3: Redis Tabanlı Rate Limiting (CRITICAL)

**User Story:** As a sistem yöneticisi, I want rate limiting'in tüm uygulama instance'larında tutarlı çalışmasını, so that multi-instance deployment'ta güvenlik açığı oluşmasın.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL Redis'i rate limit sayaçları için veri deposu olarak kullanmak
2. WHEN Redis bağlantısı kurulamadığında, THE Rate_Limiter SHALL in-memory fallback mekanizmasına geçmek
3. THE Rate_Limiter SHALL sliding window algoritması ile istek sayısını takip etmek
4. THE Rate_Limiter SHALL mevcut `rateLimit(key, limit, windowMs)` fonksiyon imzasını korumak
5. WHEN bir istek rate limit'i aştığında, THE Rate_Limiter SHALL `Retry-After` header'ı ile kalan süreyi bildirmek

### Requirement 4: Content Security Policy Header (CRITICAL)

**User Story:** As a sistem yöneticisi, I want XSS saldırılarına karşı ek koruma katmanı, so that kötü niyetli script enjeksiyonları engellensin.

#### Acceptance Criteria

1. THE System SHALL tüm HTTP yanıtlarına `Content-Security-Policy` header'ı eklemek
2. THE CSP SHALL `default-src 'self'` direktifini temel politika olarak tanımlamak
3. THE CSP SHALL `script-src` direktifinde yalnızca uygulamanın kendi script'lerine ve gerekli inline script'lere izin vermek
4. THE CSP SHALL `style-src` direktifinde yalnızca uygulamanın kendi stil dosyalarına izin vermek
5. THE CSP SHALL `img-src` direktifinde uygulama domain'i ve kullanılan harici görsel kaynaklarına izin vermek
6. THE CSP SHALL `connect-src` direktifinde API endpoint'leri ve WebSocket bağlantılarına izin vermek
7. IF CSP ihlali tespit edildiğinde, THEN THE System SHALL ihlali `report-uri` endpoint'ine raporlamak

### Requirement 5: Sidebar Touch Target Büyütme (HIGH)

**User Story:** As a mobil kullanıcı, I want menü öğelerine rahatça dokunabilmek, so that yanlış tıklama yapmadan navigasyon yapabileyim.

#### Acceptance Criteria

1. THE Sidebar SHALL grup içi alt linklerin dikey padding'ini minimum 44px touch target sağlayacak şekilde ayarlamak
2. THE Sidebar SHALL tüm tıklanabilir navigasyon öğelerinin minimum 44×44px dokunma alanına sahip olmasını sağlamak
3. WHILE Sidebar daraltılmış (collapsed) moddayken, THE Sidebar SHALL ikon butonlarının minimum 44×44px dokunma alanını korumasını sağlamak

### Requirement 6: StickyHeader Hamburger Button Büyütme (HIGH)

**User Story:** As a mobil kullanıcı, I want hamburger menü butonuna rahatça dokunabilmek, so that menüyü açıp kapatırken zorluk yaşamamam.

#### Acceptance Criteria

1. THE StickyHeader SHALL hamburger butonunun boyutunu minimum 44×44px olarak ayarlamak
2. THE StickyHeader SHALL hamburger butonunun dokunma alanının komşu öğelerle örtüşmemesini sağlamak

### Requirement 7: Veritabanı Composite Index Optimizasyonu (HIGH)

**User Story:** As a sistem yöneticisi, I want sık kullanılan sorguların veritabanı indeksleriyle desteklenmesini, so that sayfa yükleme süreleri kısalsın.

#### Acceptance Criteria

1. THE System SHALL Reservation modeline `[status, deletedAt, startDate]` composite index'i eklemek
2. THE System SHALL Notification modeline `[userId, isRead, createdAt]` composite index'i eklemek
3. WHEN composite index'ler eklendiğinde, THE System SHALL Prisma migration oluşturmak

### Requirement 8: Edge Middleware Oluşturma (HIGH)

**User Story:** As a geliştirici, I want merkezi bir middleware katmanı, so that auth redirect, public route filtreleme ve locale detection tek noktadan yönetilsin.

#### Acceptance Criteria

1. THE Edge_Middleware SHALL kimlik doğrulaması gerektiren route'lara erişimde oturum kontrolü yapmak
2. WHEN oturum geçersiz olduğunda, THE Edge_Middleware SHALL kullanıcıyı `/login` sayfasına yönlendirmek
3. THE Edge_Middleware SHALL public route'ları (login, register, api/auth) auth kontrolünden muaf tutmak
4. THE Edge_Middleware SHALL static dosyaları (\_next/static, favicon, icons) auth kontrolünden muaf tutmak
5. THE Edge_Middleware SHALL `matcher` config ile yalnızca ilgili route'larda çalışmak

### Requirement 9: Skeleton Loading Ekranı (MEDIUM)

**User Story:** As a kullanıcı, I want sayfa yüklenirken içerik yapısını gösteren iskelet animasyonu görmek, so that yükleme süresini daha kısa algılayayım.

#### Acceptance Criteria

1. THE Loading_Screen SHALL spinner yerine skeleton placeholder bileşenleri göstermek
2. THE Loading_Screen SHALL dashboard layout yapısını (sidebar genişliği, header yüksekliği, içerik alanı) yansıtan iskelet göstermek
3. THE Loading_Screen SHALL skeleton animasyonu için pulse efekti kullanmak

### Requirement 10: PWA Manifest Zenginleştirme (MEDIUM)

**User Story:** As a kullanıcı, I want uygulamayı ana ekrana eklerken zengin bir deneyim yaşamak, so that uygulama native bir uygulama gibi hissettirsin.

#### Acceptance Criteria

1. THE PWA_Manifest SHALL maskable purpose'a sahip ikon tanımı içermek
2. THE PWA_Manifest SHALL en az iki screenshot tanımı içermek
3. THE PWA_Manifest SHALL categories alanında uygun kategorileri listelemek
4. THE PWA_Manifest SHALL shortcuts alanında sık kullanılan sayfalara kısayol tanımlamak
5. THE PWA_Manifest SHALL `id` alanını tanımlayarak PWA kimliğini sabitlemek

### Requirement 11: Redis Container Eklenmesi (MEDIUM)

**User Story:** As a DevOps mühendisi, I want Docker ortamında Redis container'ı bulunmasını, so that rate limiter ve cache mekanizmaları production'da düzgün çalışsın.

#### Acceptance Criteria

1. THE System SHALL `docker-compose.yaml` dosyasına Redis 7 Alpine container tanımı eklemek
2. THE System SHALL Redis container'ı için healthcheck tanımlamak
3. THE System SHALL app servisinin Redis container'a bağımlılığını (`depends_on`) tanımlamak
4. THE System SHALL Redis bağlantı bilgisini environment variable olarak app servisine iletmek
5. THE System SHALL Redis verisi için persistent volume tanımlamak

### Requirement 12: Static Asset Cache-Control Header (MEDIUM)

**User Story:** As a kullanıcı, I want statik dosyaların tarayıcıda cache'lenmesini, so that tekrar ziyaretlerde sayfa daha hızlı yüklensin.

#### Acceptance Criteria

1. THE System SHALL `_next/static` altındaki dosyalar için `Cache-Control: public, max-age=31536000, immutable` header'ı döndürmek
2. THE System SHALL font dosyaları için `Cache-Control: public, max-age=31536000, immutable` header'ı döndürmek
3. THE System SHALL ikon ve görsel dosyaları için `Cache-Control: public, max-age=86400` header'ı döndürmek

### Requirement 13: API Response Format Tutarlılığı (MEDIUM)

**User Story:** As a geliştirici, I want tüm API yanıtlarının tutarlı formatta olmasını, so that frontend'de hata yönetimi standart ve öngörülebilir olsun.

#### Acceptance Criteria

1. THE System SHALL tüm başarılı API yanıtlarını `{ success: true, data: <payload> }` formatında döndürmek
2. THE System SHALL tüm hata API yanıtlarını `{ success: false, error: <message> }` formatında döndürmek
3. THE System SHALL `withAuth` middleware'inin hata yanıtlarını standart formata uygun döndürmesini sağlamak

### Requirement 14: Offline Fallback Sayfası (MEDIUM)

**User Story:** As a kullanıcı, I want internet bağlantısı kesildiğinde bilgilendirici bir sayfa görmek, so that uygulamanın çökmediğini ve bağlantı gelince devam edebileceğimi anlayayım.

#### Acceptance Criteria

1. THE Offline_Page SHALL kullanıcıya internet bağlantısının kesildiğini açıkça bildirmek
2. THE Offline_Page SHALL uygulama markasını (logo, renk şeması) yansıtmak
3. THE Offline_Page SHALL bağlantı tekrar sağlandığında otomatik yeniden yükleme denemesi yapmak
4. THE Offline_Page SHALL harici kaynaklara bağımlı olmadan (inline CSS/JS) çalışmak
5. THE Service_Worker SHALL Offline_Page'i install aşamasında cache'lemek

### Requirement 15: DigitalClock Performans İyileştirmesi (LOW)

**User Story:** As a geliştirici, I want saat bileşeninin gereksiz re-render'ları tetiklememesini, so that header performansı olumsuz etkilenmesin.

#### Acceptance Criteria

1. THE StickyHeader SHALL DigitalClock bileşenini `React.memo` ile sarmalayarak izole etmek
2. WHEN DigitalClock her saniye güncellendiğinde, THE StickyHeader SHALL yalnızca saat bileşeninin yeniden render edilmesini sağlamak

### Requirement 16: Orphan Route Temizliği (LOW)

**User Story:** As a geliştirici, I want kullanılmayan route'ların temizlenmesini, so that kod tabanı gereksiz dosyalardan arındırılsın.

#### Acceptance Criteria

1. THE System SHALL kullanılmayan `concepts/[conceptId]/` route dosyalarını kaldırmak
2. THE System SHALL kullanılmayan `loyalty/admin/` route dosyalarını kaldırmak
3. THE System SHALL kullanılmayan `products/stock/` route dosyalarını kaldırmak
4. WHEN orphan route'lar kaldırıldığında, THE System SHALL ilgili navigasyon referanslarının da temizlenmesini sağlamak

### Requirement 17: Geist Mono Font Lazy Loading (LOW)

**User Story:** As a kullanıcı, I want yalnızca gerektiğinde yüklenen fontlar, so that ilk sayfa yükleme süresi kısalsın.

#### Acceptance Criteria

1. THE System SHALL Geist Mono fontunu `display: 'swap'` stratejisiyle yüklemek
2. THE System SHALL Geist Mono fontunu yalnızca monospace metin içeren bileşenlerde kullanmak
