# Royal Cabana — Fonksiyonellik, İşlevsellik ve Performans Optimizasyon Planı

**Tarih:** 4 Mart 2026  
**Kapsam:** Fonksiyonellik analizi, işlevsellik (UX) değerlendirmesi, performans analizi ve optimizasyon aksiyonları

---

## Kritik Bileşenler: Rezervasyon ve Takvim

**Rezervasyon** ve **Takvim** sistemleri uygulama için **kritik bileşenlerdir** ve **gerçek zamanlı (real-time)** çalışmalıdır. Tüm optimizasyon ve mimari kararlar bu gereksinimi korumalı veya güçlendirmelidir.

| Bileşen | Neden kritik | Real-time beklentisi |
|---------|----------------|----------------------|
| **Rezervasyon** | Talep/onay/iptal/check-in-out akışı operasyonun kalbi | Yeni talep, onay, red, iptal, durum değişikliği anında tüm ilgili ekranlarda yansımalı |
| **Takvim** | Cabana doluluk, müsaitlik, rezervasyon görünümü | Takvim ve timeline; rezervasyon/cabana değişikliklerinde anında güncellenmeli, gecikme kabul edilemez |

Bu dokümanda real-time ile ilgili tüm aksiyonlar bu iki bileşeni öncelikli hedef alır.

---

## 1. Fonksiyonellik Analizi

### 1.1 Mevcut Özellikler (Özet)

| Alan | Özellik | Durum |
|------|---------|--------|
| **Rezervasyon** | Oluşturma, onay/red, değişiklik talebi, iptal talebi, ek konsept talebi, check-in/out | ✅ Çalışıyor |
| **Çakışma kontrolü** | Aynı Cabana + tarih için race condition önleme | ✅ `$transaction` + `FOR UPDATE` ile atomik |
| **Fiyatlandırma** | Günlük fiyat, konsept, ekstralar, özel talep fiyatı | ✅ PricingEngine + paralel sorgular |
| **F&B** | Sipariş oluşturma, ekstra ürünler, durum (PREPARING → DELIVERED) | ✅ Var |
| **Personel** | Atama, görevler, hizmet noktası ataması | ✅ Var |
| **Bildirim** | SSE + Socket.IO, Web Push aboneliği | ✅ Var |
| **Rapor** | PDF/Excel export, sunum (Slidev) | ✅ Sunucu tarafında |
| **Harita / 3D** | Leaflet harita, Three.js 3D görünüm | ✅ Dynamic import ile |

### 1.2 Fonksiyonellik Eksikleri / Riskler

| Öncelik | Konu | Açıklama |
|---------|------|----------|
| Orta | **Cache kullanımı** | `src/lib/cache.ts` tanımlı ancak hiçbir API route'da `cached()` kullanılmıyor. **Rezervasyon ve takvim real-time kritik** olduğu için bu endpoint’ler cache’lenmemeli veya yalnızca çok kısa TTL + olay sonrası anında invalidation. Diğer listeler (classes, concepts) cache’lenebilir. |
| Orta | **Reservation totalPrice güncelleme** | ExtraItem eklendiğinde veya konsept değiştiğinde `Reservation.totalPrice` otomatik güncellenmiyor; admin manuel girebiliyor — tutarsızlık riski. |
| Düşük | **IDOR doğrulaması** | `GET /api/reservations/[id]` gibi detay endpoint'lerinde CASINO_USER'ın sadece kendi rezervasyonuna eriştiği açıkça doğrulanmalı (mevcut liste filtresi var, detay için kontrol gözden geçirilmeli). |

---

## 2. İşlevsellik (UX) Analizi

### 2.1 Güçlü Yönler

- **Loading state:** Dashboard için `loading.tsx` (skeleton), harita/3D/takvim için dynamic import içinde loading bileşenleri mevcut.
- **Rol bazlı menü:** Sidebar/Navbar rol ve izinlere göre sayfa erişimi kısıtlı.
- **Bildirim:** Real-time (Socket/SSE) + in-app panel; kullanıcı bilgilendirmesi iyi.
- **i18n:** next-intl ile Türkçe arayüz; tutarlı dil desteği.
- **Form validasyonu:** Zod + parseBody ile API girişleri validate ediliyor.

### 2.2 İyileştirme Alanları

| Öncelik | Konu | Öneri |
|---------|------|--------|
| Yüksek | **Optimistic update** | Rezervasyon onay/red, F&B sipariş durumu güncellemesinde UI anında güncellenmeli; sunucu cevabı sonrası rollback/onay (TanStack Query mutation + optimistic update). |
| Orta | **Hata mesajları** | API hata mesajları kullanıcıya anlamlı ve Türkçe dönmeli; genel "Bad Request" yerine alan bazlı (örn. "Bu tarih aralığı dolu"). |
| Orta | **Boş state (empty state)** | Liste sayfalarında veri yokken net mesaj ve aksiyon (örn. "Henüz rezervasyon yok", "İlk rezervasyonu oluştur"). |
| Düşük | **Klavye / erişilebilirlik** | Kritik formlarda focus yönetimi ve ARIA etiketleri; modal kapatma ESC ile. |

---

## 3. Performans Analizi

### 3.1 Mevcut İyileştirmeler

| Konu | Uygulama |
|------|----------|
| **Ağır bileşenler** | `next/dynamic` ile SSR kapalı + loading: CabanaMapInner, CabanaThreeViewInner, ReservationCalendarInner, ReservationTimelineInner, ServicePointMapPlacer. |
| **Paket import** | `next.config.ts` → `optimizePackageImports`: lucide-react, radix-ui, @react-three/drei, @fullcalendar/*. |
| **Görsel** | `images.formats: ["image/avif", "image/webp"]` ile modern format. |
| **Statik varlıklar** | `Cache-Control: public, max-age=31536000, immutable` (_next/static). |
| **Fiyat hesaplama** | PricingEngine içinde `Promise.all` ile paralel Concept + ExtraProducts sorguları. |
| **Rate limiting** | Redis sliding window + bellek yedekli; API istekleri sınırlı. |
| **Rapor** | PDF/Excel sunucu tarafında üretiliyor; istemci bloklanmıyor. |

### 3.2 Performans Riskleri ve Ölçüm Noktaları

| Öncelik | Konu | Açıklama |
|---------|------|----------|
| Yüksek | **Reservation listesi include** | FNB_USER/ADMIN için modifications, cancellations, extraConcepts, extraItems, statusHistory tek sorguda; sayfa büyüdükçe yanıt süresi artar. Pagination var (limit 20–100) ancak include ağır. |
| Yüksek | **Cache kullanılmıyor** | `/api/reservations`, `/api/cabanas`, takvim/availability gibi sık okunan endpoint'lerde Redis/memory cache yok; her istek DB’ye gidiyor. |
| Orta | **İlk yükleme bundle** | FullCalendar, Leaflet, Three.js ayrı sayfalarda olsa da route bazlı code-splitting tam değerlendirilmeli; ana dashboard’da sadece gerekli chunk’lar yüklenmeli. |
| Orta | **N+1 potansiyeli** | Bazı liste API’lerinde include derinliği fazla; gerekmedikçe alt ilişkiler `select` ile sınırlandırılmalı (zaten birçok yerde select var, tutarlı uygulama önerilir). |
| Düşük | **Prisma connection pool** | Yoğun eşzamanlılıkta `DATABASE_URL` üzerinde `?connection_limit=` değeri gözden geçirilmeli. |

---

## 3.3 Real-time: Rezervasyon ve Takvim (Kritik)

Rezervasyon ve takvim **real-time** olmalıdır; gecikme kabul edilemez.

### Mevcut altyapı

| Bileşen | Durum | Açıklama |
|---------|--------|----------|
| **SSE (EventSource)** | ✅ Var | `/api/sse`, `sseManager` — rezervasyon create/approve/reject/cancel/check-in/check-out, modification, extra-concept, F&B order olayları broadcast ediliyor. |
| **useReservationCalendar** | ✅ Var | `useSSE` ile dinliyor; `CALENDAR_SSE_EVENTS` gelince query invalidate + refetch. SSE bağlı değilse 30 sn polling fallback. |
| **Admin / Casino takvim** | ✅ SSE | Takvim sayfaları `useReservationCalendar` kullanıyorsa real-time güncelleniyor. |
| **Talep listesi (admin/requests)** | ✅ SSE | `RESERVATION_UPDATED` ile refetch. |
| **NotificationProvider** | ✅ SSE | SSE event’leri toast/panel bildirime dönüştürüyor. |
| **Socket.IO** | ✅ Var | Bildirimler için ayrı sunucu; NotificationPanel’de kullanılıyor. |

### Real-time gereksinimleri (korunacak / güçlendirilecek)

1. **Rezervasyon:** Her create/update/approve/reject/cancel/check-in/check-out ve modification/extra-concept onayında ilgili SSE event’i tetiklenmeli; liste ve takvim anında güncellenmeli.
2. **Takvim:** Rezervasyon ve cabana durumu değişiminde takvim verisi (availability, timeline) anında yenilenmeli; SSE bağlantısı koparsa kısa aralıklı polling (mevcut 30 sn) yeterli.
3. **Cache:** Rezervasyon ve takvim verisi için **uzun TTL’li cache kullanılmamalı**. Cache kullanılırsa yalnızca çok kısa TTL (≤15–30 sn) ve her rezervasyon/takvim olayında **anında invalidation** (SSE tetiklemesi sonrası ilgili key’lerin silinmesi) kabul edilir.
4. **Görünürlük:** Takvim/timeline UI’da SSE bağlantı durumu (CANLI / KOPUK) kullanıcıya gösterılmalı; kopukken polling fallback bilgisi verilmeli (mevcut `ReservationTimelineInner` örneği korunmalı).

---

## 4. Optimizasyon Planı (Aksiyonlar)

### Faz 0 — Kritik: Real-time (Rezervasyon + Takvim)

| # | Aksiyon | Hedef | Detay |
|---|---------|--------|--------|
| 0.1 | **Real-time önceliğini koru** | Kritik | Rezervasyon ve takvim verisi için **uzun TTL’li cache uygulanmamalı**. SSE/Socket event’leri tüm ilgili API’lerde (create/approve/reject/cancel/check-in/out/modification/extra-concept) tetiklenmeye devam etmeli. |
| 0.2 | **SSE bağlantı ve fallback** | Kritik | Takvim/timeline sayfalarında `useReservationCalendar` ve SSE connection state (CANLI/KOPUK) kullanılsın; SSE kopunca polling (örn. 30 sn) fallback aktif kalsın. Yeni takvim sayfaları eklenirken bu hook kullanılmalı. |
| 0.3 | **Cache kullanımında real-time kuralı** | Kritik | Rezervasyon/takvim ile ilgili endpoint’ler cache’lenirse: TTL ≤15–30 sn ve **her rezervasyon/cabana olayında** ilgili cache key’leri anında invalidate edilmeli (SSE broadcast ile birlikte). Tercihen bu endpoint’ler cache’siz bırakılabilir. |

### Faz 1 — Hızlı Kazanımlar (1–2 hafta)

| # | Aksiyon | Hedef | Detay |
|---|---------|--------|--------|
| 1.1 | **Read cache (real-time dışı)** | Performans | Sadece **real-time kritik olmayan** endpoint’lerde cache: `/api/classes`, `/api/concepts`, `/api/product-groups`. **Rezervasyon listesi ve takvim/availability cache’lenmemeli** veya yalnızca çok kısa TTL + olay sonrası anında invalidation (Faz 0.3). |
| 1.2 | **Cache invalidation** | Tutarlılık | Rezervasyon/Cabana create/update/delete sonrası ilgili cache key’leri sil. Rezervasyon ve takvim için cache kullanılıyorsa **SSE broadcast ile aynı anda** invalidation yapılmalı. |
| 1.3 | **Reservation totalPrice otomasyonu** | Fonksiyonellik | ExtraItem ekleme/çıkarma veya konsept değişikliğinde `PricingEngine.calculatePrice` çağırıp `totalPrice`’ı güncelle (opsiyonel: admin override alanı ile). |
| 1.4 | **Detay endpoint IDOR** | Güvenlik | `GET /api/reservations/[id]` ve benzeri detay route’larda CASINO_USER için `reservation.userId === session.user.id` kontrolü ekle; yoksa 404. |

### Faz 2 — UX ve İşlevsellik (2–3 hafta)

| # | Aksiyon | Hedef | Detay |
|---|---------|--------|--------|
| 2.1 | **Optimistic update** | UX | Onay/red, iptal, F&B durum güncellemesi için TanStack Query `useMutation` + `onMutate` ile optimistic update; hata durumunda `onError` + `queryClient.setQueryData` ile rollback. |
| 2.2 | **Hata mesajları** | UX | API validasyon ve iş hatalarında Türkçe, alan bazlı mesaj dön (Zod `error.format()` veya custom error code); frontend’de toast/alert ile göster. |
| 2.3 | **Boş state bileşenleri** | UX | Liste sayfalarına empty state: ikon + kısa metin + aksiyon butonu (örn. rezervasyon listesi, cabana listesi, F&B siparişleri). |

### Faz 3 — Performans Derinlemesine (3–4 hafta)

| # | Aksiyon | Hedef | Detay |
|---|---------|--------|--------|
| 3.1 | **Reservation listesi include sadeleştirme** | Performans | FNB/Admin için modifications/cancellations/extraConcepts/extraItems’ı ilk sayfada sadece sayı veya özet alanla getir; detay sayfasında veya “genişlet” ile tam include. Alternatif: ayrı endpoint’ler (örn. `/api/reservations/[id]/sub-requests`). |
| 3.2 | **Takvim/availability cache** | Performans | Takvim **kritik ve real-time** olduğu için bu endpoint’ler **tercihen cache’siz**. Cache gerekirse TTL ≤15–30 sn ve her rezervasyon/cabana olayında **anında invalidation** (Faz 0.3 ile uyumlu). |
| 3.3 | **Bundle analizi** | Performans | `@next/bundle-analyzer` veya build çıktısı ile sayfa bazlı chunk boyutlarını incele; FullCalendar/Leaflet/Three’nin sadece kullanıldıkları route’larda yüklendiğini doğrula. |
| 3.4 | **DB connection_limit** | Performans | Production ortamında eşzamanlı yük tahminine göre `connection_limit` (örn. 10–20) ayarla; Prisma dokümantasyonu ile uyumlu kalsın. |

### Faz 4 — İzleme ve Sürekli İyileştirme

| # | Aksiyon | Hedef | Detay |
|---|---------|--------|--------|
| 4.1 | **Core Web Vitals** | Ölçüm | LCP, FID/INP, CLS için gerçek kullanıcı verisi (RUM) veya Lighthouse ile periyodik ölçüm; hedef: LCP &lt; 2.5s, CLS &lt; 0.1. |
| 4.2 | **API yanıt süreleri** | Ölçüm | Kritik endpoint’lerde (reservations, cabanas, pricing) basit süre loglama veya APM; p95 &lt; 500 ms hedefi. |
| 4.3 | **Hata oranı** | Ölçüm | 4xx/5xx oranı ve istemci tarafı hata (toast/console) takibi; hedef: %1 altı. |

---

## 5. Özet Tablo

| Kategori | Mevcut durum | Öncelikli hedef |
|----------|--------------|------------------|
| **Kritik: Real-time** | Rezervasyon ve takvim SSE + polling fallback ile güncelleniyor | Real-time önceliği korunmalı; cache bu alanlarda uzun TTL kullanmamalı, invalidation anında yapılmalı |
| **Fonksiyonellik** | Rezervasyon akışı, fiyat, F&B, personel, rapor çalışıyor; çakışma atomik | Cache yalnızca real-time kritik olmayan yerlerde; totalPrice otomasyonu, IDOR netleştirme |
| **İşlevsellik (UX)** | Loading, rol bazlı erişim, bildirim, i18n iyi | Optimistic update, anlamlı hata mesajları, boş state |
| **Performans** | Dynamic import, optimizePackageImports, rate limit, sunucu raporu | Read cache (real-time dışı), reservation include sadeleştirme, bundle/DB ayarları |

---

## 6. Bağımlılık Sırası (Önerilen Uygulama Sırası)

```
0. Real-time kuralları (Faz 0)                   → KRİTİK: Rezervasyon + takvim her zaman real-time
   0.1 SSE/event tetikleme korunsun
   0.2 Takvim sayfalarında useReservationCalendar + SSE state
   0.3 Rezervasyon/takvim için cache yok veya çok kısa TTL + anında invalidation
1. Cache (1.1–1.2) yalnızca real-time dışı       → classes/concepts; rezervasyon/takvim cache’siz veya Faz 0.3
2. IDOR doğrulaması (1.4)                        → Güvenlik
3. totalPrice otomasyonu (1.3)                   → Veri tutarlılığı
4. Optimistic update (2.1)                      → UX
5. Hata mesajları (2.2) + boş state (2.3)        → UX
6. Reservation include sadeleştirme (3.1)        → Ölçeklenebilirlik
7. Takvim cache (3.2) yalnızca Faz 0.3 ile       → Real-time ihlal etmeden
8. Bundle analizi (3.3) + connection_limit (3.4) → İnce ayar
9. Faz 4 ölçümleri                               → Sürekli iyileştirme
```

---

**Rapor bilgisi**

| Alan | Değer |
|------|--------|
| **Oluşturan** | Cursor Auto (agent router) |
| **Model** | Auto (Cursor agent router) |
| **Oluşturulma tarihi** | 4 Mart 2026 |
