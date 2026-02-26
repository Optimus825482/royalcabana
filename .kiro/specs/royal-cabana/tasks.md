# Uygulama Planı: Royal Cabana

## Genel Bakış

Next.js 14+ App Router tabanlı fullstack uygulama. PostgreSQL + Prisma, NextAuth.js RBAC, Leaflet 2D harita, React Three Fiber 3D görünüm, FullCalendar Resource Timeline, Socket.io gerçek zamanlı bildirimler ve jsPDF/xlsx/pptxgenjs raporlama içerir. Görevler bağımlılık sırasına göre düzenlenmiştir.

## Görevler

- [x] 1. Proje Kurulumu ve Altyapı
  - Next.js 14+ App Router projesi oluştur (`npx create-next-app@latest`)
  - TypeScript, Tailwind CSS, ESLint yapılandır
  - Tüm bağımlılıkları yükle: prisma, next-auth, zustand, @tanstack/react-query, socket.io, leaflet, react-leaflet, @react-three/fiber, @react-three/drei, @fullcalendar/react, @fullcalendar/resource-timeline, jspdf, xlsx, pptxgenjs, next-intl, zod, shadcn/ui
  - `src/app`, `src/components`, `src/lib`, `src/services`, `src/stores`, `src/hooks`, `src/types`, `src/i18n`, `socket-server`, `public/gorsel` klasör yapısını oluştur
  - `.env.local` dosyasını environment değişkenleriyle oluştur (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SOCKET_SERVER_URL`, `NEXT_PUBLIC_APP_URL`)
  - `src/types/index.ts` dosyasında tüm TypeScript tiplerini ve enum'ları tanımla (`Role`, `CabanaStatus`, `ReservationStatus`, `RequestStatus`, `NotificationType`, `PriceBreakdown`, `ApiError` vb.)
  - _Gereksinimler: 18.1, 18.5_

- [~] 2. Veritabanı ve Prisma Şeması
  - [x] 2.1 Prisma şemasını oluştur
    - `prisma/schema.prisma` dosyasına tasarım dokümanındaki tam şemayı yaz: `User`, `CabanaClass`, `ClassAttribute`, `Cabana`, `Concept`, `Product`, `ConceptProduct`, `CabanaPrice`, `ConceptPrice`, `Reservation`, `ReservationStatusHistory`, `ModificationRequest`, `CancellationRequest`, `ExtraConceptRequest`, `ExtraItem`, `Notification`, `AuditLog`, `SystemConfig` modelleri
    - Tüm enum'ları tanımla: `Role`, `CabanaStatus`, `ReservationStatus`, `RequestStatus`, `NotificationType`
    - `src/lib/prisma.ts` Prisma client singleton'ını oluştur
    - _Gereksinimler: 18.2, 18.3, 18.4_

  - [x] 2.2 Migration ve seed
    - `npx prisma migrate dev --name init` ile ilk migration'ı çalıştır
    - `prisma/seed.ts` dosyasında başlangıç verilerini oluştur: SystemAdmin kullanıcısı, örnek kabana sınıfları, `SystemConfig` kaydı (`system_open_for_reservation: true`)
    - _Gereksinimler: 1.1, 7.1_

- [~] 3. Auth Sistemi (NextAuth.js + RBAC)
  - [x] 3.1 NextAuth.js yapılandırması
    - `src/lib/auth.ts` dosyasında NextAuth config oluştur: Credentials provider, JWT strategy, session callback'te `role` alanını ekle
    - `src/app/api/auth/[...nextauth]/route.ts` handler'ı oluştur
    - Şifre hash için bcrypt entegrasyonu ekle
    - _Gereksinimler: 18.1, 18.5, 18.6_

  - [x] 3.2 RBAC Middleware
    - `src/middleware.ts` dosyasında Next.js middleware oluştur: token doğrulama, `MODULE_ACCESS` matrisine göre rol bazlı erişim kontrolü, yetkisiz erişimde 403 yanıtı
    - `src/lib/rbac.ts` dosyasında `hasAccess(role, path)` yardımcı fonksiyonunu yaz
    - _Gereksinimler: 1.3, 1.6, 18.5_

  - [ ]\* 3.3 Property testi: P4 — Rol Erişim İzolasyonu
    - **Property 4: Her rol yalnızca kendi modülüne erişebilir, diğerleri 403 döner**
    - **Validates: Gereksinim 1.3, 1.6**

  - [x] 3.4 Login sayfası
    - `src/app/(auth)/login/page.tsx` login formu oluştur: kullanıcı adı/şifre, hata mesajları, logo gösterimi
    - Oturum açık kullanıcıyı rolüne göre ilgili modüle yönlendir
    - _Gereksinimler: 1.3, 16.4_

- [x] 4. Checkpoint — Temel altyapı testi
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [~] 5. Sistem Yöneticisi Modülü — Kullanıcı Yönetimi
  - [x] 5.1 Users API
    - `src/app/api/users/route.ts` ve `src/app/api/users/[id]/route.ts` endpoint'lerini oluştur: GET (liste), POST (oluştur), PATCH (güncelle), DELETE (devre dışı bırak)
    - Zod şemasıyla input validasyonu ekle
    - AuditLog kaydı oluştur (her CREATE/UPDATE/DELETE için)
    - _Gereksinimler: 1.1, 1.2, 1.7, 18.2_

  - [x] 5.2 Kullanıcı Yönetimi UI
    - `src/app/(dashboard)/system-admin/users/page.tsx` sayfasını oluştur: kullanıcı listesi tablosu, yeni kullanıcı oluşturma formu (kullanıcı adı, e-posta, şifre, rol), düzenleme ve devre dışı bırakma işlemleri
    - _Gereksinimler: 1.1, 1.2, 1.7_

  - [ ]\* 5.3 Property testi: P6 — Audit Log Eksiksizliği
    - **Property 6: Her CREATE/UPDATE/DELETE işlemi audit log kaydı oluşturur**
    - **Validates: Gereksinim 18.2**

- [~] 6. Sistem Yöneticisi Modülü — Master Data Yönetimi
  - [x] 6.1 Kabana Sınıfları API ve UI
    - `src/app/api/classes/` altında CRUD endpoint'leri oluştur (GET, POST, PATCH, DELETE, attribute ekle/sil)
    - `src/app/(dashboard)/system-admin/classes/page.tsx` sayfasını oluştur: sınıf listesi, oluşturma/düzenleme formu, dinamik özellik yönetimi
    - Aktif kabanası olan sınıf silinmeye çalışıldığında uyarı göster
    - _Gereksinimler: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 6.2 Konsept Yönetimi API ve UI
    - `src/app/api/concepts/` altında CRUD endpoint'leri oluştur (ürün ekle/çıkar dahil)
    - `src/app/(dashboard)/system-admin/concepts/page.tsx` sayfasını oluştur: konsept listesi, oluşturma/düzenleme formu, ürün seçimi
    - Konsept düzenlendiğinde bağlı tüm kabanalara yansıtma mantığını ekle
    - _Gereksinimler: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.3 Ürün Yönetimi API ve UI
    - `src/app/api/products/` altında CRUD endpoint'leri oluştur
    - `src/app/(dashboard)/system-admin/products/page.tsx` sayfasını oluştur: ürün listesi, oluşturma/düzenleme formu (ad, alış fiyatı, satış fiyatı)
    - Alış > satış fiyatı durumunda onay mesajı göster; aktif konseptte kullanılan ürün silinmeye çalışıldığında uyarı göster
    - _Gereksinimler: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.4 Sistem Kontrolü API ve UI
    - `src/app/api/system/config/route.ts` ve `src/app/api/system/reservation-status/route.ts` endpoint'lerini oluştur
    - `src/app/(dashboard)/system-admin/system-control/page.tsx` sayfasını oluştur: sistem geneli rezervasyon açma/kapama toggle'ı, kabana bazında açma/kapama
    - _Gereksinimler: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [~] 7. Kabana Harita Yönetimi (2D — Leaflet)
  - [x] 7.1 Cabanas API
    - `src/app/api/cabanas/` altında CRUD endpoint'leri oluştur (konum güncelleme ve durum endpoint'leri dahil)
    - _Gereksinimler: 2.2, 2.3, 7.3_

  - [x] 7.2 Leaflet Harita Bileşeni
    - `src/components/map/CabanaMap.tsx` bileşenini oluştur: `CRS.Simple` ile piksel tabanlı koordinat sistemi, `gorsel/kroki.png` ImageOverlay, her kabana için `CircleMarker` veya custom icon, durum bazlı renk kodlaması (müsait=yeşil, rezerve=kırmızı, kapalı=gri)
    - `MapComponentProps` arayüzünü uygula: `editable` prop ile sürükle-bırak koordinat güncelleme (Sistem Yöneticisi için), tıklama ile kabana detay popup'ı
    - Kroki yüklenemezse "Kroki yüklenemedi" hata mesajı göster; ek kroki görünümleri için sekme/seçenek ekle
    - _Gereksinimler: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 7.3 Sistem Yöneticisi Harita Sayfası
    - `src/app/(dashboard)/system-admin/map/page.tsx` sayfasını oluştur: düzenlenebilir harita, kabana ekleme/silme, sınıf atama
    - _Gereksinimler: 2.1, 2.2, 3.4_

- [~] 8. Dinamik Fiyatlandırma Motoru
  - [x] 8.1 Fiyatlandırma servisi
    - `src/lib/pricing.ts` dosyasında `PricingEngine` sınıfını oluştur: `calculatePrice()` metodu, fiyat öncelik sırası (kabana özel > konsept özel > genel ürün fiyatı), `PriceBreakdown` döndür
    - _Gereksinimler: 6.4, 6.5, 6.6, 6.7_

  - [ ]\* 8.2 Property testi: P2 — Fiyat Öncelik Tutarlılığı
    - **Property 2: Fiyat öncelik sırası her zaman kabana özel > konsept özel > genel ürün fiyatı**
    - **Validates: Gereksinim 6.4, 6.5, 6.6**

  - [x] 8.3 Pricing API ve Admin UI
    - `src/app/api/pricing/` altında endpoint'leri oluştur (kabana fiyat takvimi, konsept fiyatları, fiyat hesaplama preview)
    - `src/app/(dashboard)/admin/pricing/page.tsx` sayfasını oluştur: kabana bazında günlük fiyat girişi, konsept bazında paket/kalem fiyatı, fiyat önizleme
    - _Gereksinimler: 6.1, 6.2, 6.3, 6.8_

- [~] 9. Admin Modülü
  - [x] 9.1 Admin Dashboard
    - `src/app/(dashboard)/admin/page.tsx` dashboard sayfasını oluştur: kabana doluluk oranları, bekleyen talep sayısı, gelir özeti widget'ları
    - TanStack Query ile veri çekme ve cache yönetimi
    - _Gereksinimler: 13.1, 13.2_

  - [x] 9.2 Talep Listesi ve Onay İş Akışı
    - `src/app/api/reservations/[id]/approve/route.ts` ve `reject/route.ts` endpoint'lerini oluştur: durum güncelleme, `ReservationStatusHistory` kaydı, bildirim tetikleme
    - `src/app/(dashboard)/admin/requests/page.tsx` sayfasını oluştur: bekleyen/onaylanan/reddedilen talepleri filtreli liste, talep detay paneli, fiyat belirleme formu, onay/red işlemleri (red için neden zorunlu)
    - Değişiklik, iptal ve ek konsept taleplerini aynı listede göster
    - _Gereksinimler: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [ ]\* 9.3 Property testi: P3 — Durum Geçiş Tutarlılığı
    - **Property 3: Yalnızca geçerli durum geçişleri kabul edilir, geçersizler hata döner**
    - **Validates: Gereksinim 12.3, 12.5**

  - [x] 9.4 Admin Kullanıcı Yönetimi
    - `src/app/(dashboard)/admin/users/page.tsx` sayfasını oluştur: CasinoUser ve FnBUser rollerinde kullanıcı oluşturma/düzenleme/devre dışı bırakma
    - _Gereksinimler: 1.4, 1.5, 1.8_

- [x] 10. Checkpoint — Admin ve fiyatlandırma testi
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [~] 11. Casino Rezervasyon Modülü — Harita ve 3D Görünüm
  - [x] 11.1 Casino 2D Harita Sayfası
    - `src/app/(dashboard)/casino/map/page.tsx` sayfasını oluştur: salt okunur harita (`editable: false`), müsaitlik renk kodlaması, kabana tıklama ile sınıf/konsept/fiyat detay paneli
    - Sistem rezervasyona kapalıyken yeni talep butonunu devre dışı bırak
    - _Gereksinimler: 8.1, 8.2, 8.3, 8.6, 8.7, 8.8_

  - [x] 11.2 React Three Fiber 3D Görünüm Bileşeni
    - `src/components/three/CabanaThreeView.tsx` bileşenini oluştur: `ThreeViewProps` arayüzünü uygula, her `CabanaClass` için farklı GLTF/GLB model veya geometri, `OrbitControls` kamera kontrolü, hover/click etkileşimleri
    - Kabana seçildiğinde detay paneli + fotoğraf galerisi göster (`gorsel/arka.jpg`, `gorsel/on.png`, `gorsel/sag.png`, `gorsel/sol.png`, `gorsel/ust.png`)
    - 3D model yüklenemezse 2D haritaya fallback
    - _Gereksinimler: 8.4, 8.5, 8.7_

  - [x] 11.3 2D/3D Görünüm Geçiş Sayfası
    - `src/app/(dashboard)/casino/view/page.tsx` sayfasını oluştur: 2D/3D toggle butonu, yükleniyor göstergesi
    - _Gereksinimler: 8.7, 8.8_

- [~] 12. Casino Rezervasyon Modülü — Takvim ve Talep Yönetimi
  - [x] 12.1 FullCalendar Resource Timeline Bileşeni
    - `src/components/calendar/ReservationCalendar.tsx` bileşenini oluştur: `@fullcalendar/resource-timeline` plugin, kabanalar kaynak (satır), tarihler sütun, durum bazlı renk kodlaması (bekliyor=sarı, onaylı=yeşil, red=kırmızı, iptal=gri)
    - `CalendarComponentProps` arayüzünü uygula: tarih tıklama ile yeni talep formu, etkinlik tıklama ile detay, sağ tık context menu (Değişiklik, İptal, Ek Konsept)
    - Günlük/haftalık/aylık görünüm seçenekleri, kabana ve sınıf bazında filtreleme
    - _Gereksinimler: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [x] 12.2 Rezervasyon Talebi Oluşturma
    - `src/app/api/reservations/route.ts` POST endpoint'ini oluştur: tarih çakışması kontrolü (P1), sistem açık/kapalı kontrolü, `PENDING` durumunda kayıt, bildirim tetikleme
    - Talep formu bileşenini oluştur: misafir adı, başlangıç/bitiş tarihi, özel notlar, validasyon hataları (tarih çakışması, geçmiş tarih, başlangıç > bitiş)
    - _Gereksinimler: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]\* 12.3 Property testi: P1 — Rezervasyon Çakışması Yok
    - **Property 1: Aynı kabanada onaylı iki rezervasyon asla tarih çakışması yaşayamaz**
    - **Validates: Gereksinim 10.4**

  - [x] 12.4 Değişiklik, İptal ve Ek Konsept Talepleri
    - `src/app/api/reservations/[id]/modifications/route.ts`, `cancellations/route.ts`, `extra-concepts/route.ts` endpoint'lerini oluştur
    - İlgili talep formlarını oluştur: Değişiklik (tarih/kabana/misafir), İptal (neden zorunlu), Ek Konsept (ürün listesinden seçim)
    - Talep durum geçmişini görüntüleme bileşenini oluştur
    - _Gereksinimler: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 12.5 Casino Takvim Sayfası
    - `src/app/(dashboard)/casino/calendar/page.tsx` sayfasını oluştur: `ReservationCalendar` bileşenini entegre et, TanStack Query ile rezervasyon verisi çek
    - _Gereksinimler: 9.1, 9.8, 9.9_

- [~] 13. F&B Rezervasyon Modülü
  - [x] 13.1 F&B Rezervasyon Listesi
    - `src/app/(dashboard)/fnb/page.tsx` sayfasını oluştur: tüm rezervasyonları listele (tarih/kabana/durum filtresi), her rezervasyonun güncel durumunu göster, onaylanan rezervasyonların konsept detaylarını ve ürün listelerini göster
    - Talep oluşturma/onaylama/reddetme butonlarını devre dışı bırak (salt görüntüleme)
    - Değişiklik/İptal/Ek Konsept taleplerini salt okunur göster
    - _Gereksinimler: 14.1, 14.2, 14.3, 14.6, 14.7, 14.8_

  - [x] 13.2 Konsept Dışı Ekstra Ekleme
    - `src/app/api/reservations/[id]/extras/route.ts` POST endpoint'ini oluştur: yalnızca `FnBUser` rolü, onaylanan rezervasyonlara ekstra ekleme, bildirim tetikleme
    - `src/app/(dashboard)/fnb/[id]/extras/page.tsx` sayfasını oluştur: kayıtlı ürünler listesinden seçim, miktar girişi, fiyat bilgisi gösterimi
    - _Gereksinimler: 14.4, 14.5_

- [~] 14. Bildirim Sistemi (Socket.io)
  - [x] 14.1 Socket.io Sunucusu
    - `socket-server/index.ts` dosyasında Socket.io sunucusunu oluştur: JWT doğrulama, kullanıcı bazında oda yönetimi (`userId` odası), bildirim emit fonksiyonları
    - `src/lib/socket.ts` client-side Socket.io bağlantısını oluştur: otomatik reconnect, polling fallback
    - _Gereksinimler: 17.1, 17.2, 17.3, 17.4_

  - [x] 14.2 Bildirim Servisi ve API
    - `src/services/notification.service.ts` dosyasında `NotificationService` sınıfını oluştur: `send()`, `markAsRead()`, `getUnread()` metodları, veritabanına persist
    - `src/app/api/notifications/route.ts` ve `[id]/read/route.ts` endpoint'lerini oluştur
    - Tüm talep oluşturma/onay/red/ekstra ekleme işlemlerine bildirim tetikleyicilerini entegre et
    - _Gereksinimler: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ]\* 14.3 Property testi: P5 — Bildirim Teslimat Garantisi
    - **Property 5: Her APPROVED/REJECTED/NEW_REQUEST/EXTRA_ADDED olayı için ilgili kullanıcıya bildirim oluşturulur**
    - **Validates: Gereksinim 17.1, 17.2, 17.3, 17.4**

  - [x] 14.4 Bildirim UI Bileşeni
    - `src/components/shared/NotificationPanel.tsx` bileşenini oluştur: bildirim zili ikonu, okunmamış sayısı badge, bildirim listesi dropdown, okundu işaretleme
    - Socket.io ile gerçek zamanlı bildirim güncellemesi
    - F&B modülünde rezervasyon durumu değişikliklerini gerçek zamanlı yansıt
    - _Gereksinimler: 14.9, 17.5_

- [~] 15. Checkpoint — Bildirim ve rezervasyon akışı testi
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [~] 16. Raporlama ve Sunum Modülü
  - [x] 16.1 Rapor Motoru
    - `src/services/report.service.ts` dosyasında `ReportEngine` sınıfını oluştur: `OCCUPANCY`, `REVENUE`, `COST_ANALYSIS`, `REQUEST_STATS` rapor tipleri, jsPDF ile PDF export, xlsx ile Excel export
    - Eksik veri durumunda "Eksik veri alanları: [alan listesi]" uyarısı döndür
    - _Gereksinimler: 15.1, 15.2, 15.5, 15.6, 15.7_

  - [x] 16.2 Sunum Motoru
    - `src/services/presentation.service.ts` dosyasında `PresentationEngine` sınıfını oluştur: pptxgenjs ile slide oluşturma, kabana yerleşimi/sınıf bilgileri/konseptler/fiyatlandırma/görsel materyaller içeren otomatik sunum
    - _Gereksinimler: 15.3, 15.4_

  - [x] 16.3 Reports API
    - `src/app/api/reports/generate/route.ts` ve `presentation/route.ts` endpoint'lerini oluştur (yalnızca `SystemAdmin` rolü)
    - _Gereksinimler: 15.1, 15.3_

  - [x] 16.4 Raporlama UI
    - `src/app/(dashboard)/reports/page.tsx` sayfasını oluştur: rapor tipi seçimi, tarih aralığı/kabana sınıfı/konsept filtreleri, PDF/Excel export butonları, sunum oluşturma butonu
    - _Gereksinimler: 15.1, 15.2, 15.5, 15.6_

- [~] 17. i18n ve Tema
  - [x] 17.1 next-intl yapılandırması
    - `src/i18n/` altında Türkçe (`tr.json`) ve İngilizce (`en.json`) çeviri dosyalarını oluştur: tüm UI metinleri, hata mesajları, bildirim metinleri
    - `next-intl` middleware ve provider yapılandırmasını ekle
    - _Gereksinimler: 16.1, 16.2_

  - [x] 17.2 Logo ve Tema Entegrasyonu
    - `public/logo.png` dosyasından renk paletini türet, Tailwind CSS config'e özel renkleri ekle
    - `src/components/shared/Navbar.tsx` bileşenini oluştur: tüm modüllerde logo gösterimi, logo yüklenemezse metin tabanlı fallback
    - Premium lüks tatil köyü estetiğine uygun global CSS değişkenlerini tanımla
    - _Gereksinimler: 16.1, 16.2, 16.3, 16.4, 16.5_

- [~] 18. Entegrasyon ve Bağlantı
  - [x] 18.1 Dashboard Layout ve Navigasyon
    - `src/app/(dashboard)/layout.tsx` dashboard layout'unu oluştur: rol bazlı navigasyon menüsü, `NotificationPanel`, kullanıcı bilgisi, oturum kapatma
    - Her rolün yalnızca kendi modülünü görmesini sağla
    - _Gereksinimler: 1.3, 16.4_

  - [x] 18.2 Zustand Store'ları
    - `src/stores/` altında store'ları oluştur: `useAuthStore` (oturum bilgisi), `useNotificationStore` (bildirimler), `useSystemStore` (sistem durumu), `useReservationStore` (aktif rezervasyon state'i)
    - _Gereksinimler: 7.2, 7.6_

  - [x] 18.3 Hata Yönetimi ve Global Error Boundary
    - `src/app/error.tsx` ve `src/app/not-found.tsx` sayfalarını oluştur
    - TanStack Query global error handler'ı yapılandır: network hataları için 3 kez retry (exponential backoff)
    - Toast bildirimleri için global provider ekle
    - _Gereksinimler: 18.3_

- [~] 19. Final Checkpoint — Tüm testler ve entegrasyon
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

## Notlar

- `*` ile işaretli görevler isteğe bağlıdır, MVP için atlanabilir
- Her görev ilgili gereksinimlere referans verir
- Property testleri `@fast-check/vitest` ile yazılır
- Checkpoint'ler artımlı doğrulama sağlar
- P1-P6 property testleri evrensel doğruluk özelliklerini doğrular
