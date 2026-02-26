# Tasarım Dokümanı — Royal Cabana

## Genel Bakış (Overview)

Royal Cabana, bir otel/casino tatil köyünün sahil bölgesindeki lüks kabana alanlarını yöneten, talep tabanlı rezervasyon iş akışına sahip premium bir web uygulamasıdır. Sistem 5 ana modülden oluşur ve her modül rol tabanlı erişim kontrolü (RBAC) ile korunur.

### Temel İş Akışı

```
Casino Kullanıcısı → Talep Oluşturur → Admin Değerlendirir → Onay/Red → F&B Hizmet Yürütür
```

### Modül Yapısı

| Modül              | Erişim Rolü | Temel Sorumluluk                                 |
| ------------------ | ----------- | ------------------------------------------------ |
| Sistem Yöneticisi  | SystemAdmin | Master data, konfigürasyon, raporlama            |
| Admin              | Admin       | Gözetim, onay/red, fiyatlandırma                 |
| Casino Rezervasyon | CasinoUser  | Talep oluşturma, 2D/3D görüntüleme, takvim       |
| F&B Rezervasyon    | FnBUser     | Talep görüntüleme, ekstra ekleme, hizmet yürütme |
| Raporlama & Sunum  | SystemAdmin | Raporlar, otomatik sunum oluşturma               |

### Teknoloji Kararları ve Gerekçeleri

| Teknoloji      | Seçim                            | Gerekçe                                                          |
| -------------- | -------------------------------- | ---------------------------------------------------------------- |
| Framework      | Next.js 14+ (App Router)         | SSR/SSG desteği, API Routes ile fullstack, TypeScript native     |
| UI             | Tailwind CSS + shadcn/ui         | Premium görünüm, tutarlı design system, hızlı geliştirme         |
| 2D Harita      | Leaflet + react-leaflet          | Custom image overlay desteği, kroki.png üzerine kabana yerleşimi |
| 3D             | React Three Fiber + drei         | Deklaratif Three.js, sınıf bazlı farklı 3D modeller              |
| Takvim         | FullCalendar (Resource Timeline) | Profesyonel resource timeline, kabana satır/tarih sütun formatı  |
| State          | Zustand + TanStack Query         | Zustand: client state, TanStack Query: server state/cache        |
| Veritabanı     | PostgreSQL + Prisma ORM          | İlişkisel veri modeli, type-safe ORM, migration desteği          |
| Auth           | NextAuth.js + JWT                | RBAC entegrasyonu, session yönetimi, güvenli token               |
| Gerçek Zamanlı | Socket.io                        | Bildirim sistemi, durum güncellemeleri, bidirectional            |
| Raporlama      | jsPDF + xlsx                     | PDF ve Excel export, client-side oluşturma                       |
| i18n           | next-intl                        | Türkçe/İngilizce, App Router uyumlu                              |
| Sunum          | reveal.js veya pptxgenjs         | Otomatik slide oluşturma, veri bazlı sunum                       |

---

## Mimari (Architecture)

### Sistem Mimarisi Diyagramı

```mermaid
graph TB
    subgraph Client["İstemci Katmanı"]
        SYM["Sistem Yöneticisi Modülü"]
        AM["Admin Modülü"]
        CRM["Casino Rezervasyon Modülü"]
        FBM["F&B Rezervasyon Modülü"]
        RSM["Raporlama & Sunum Modülü"]
    end

    subgraph NextJS["Next.js App Router"]
        MW["Middleware (Auth + RBAC)"]
        API["API Routes"]
        SSR["Server Components"]
    end

    subgraph Services["Servis Katmanı"]
        AuthService["Auth Service"]
        ReservationService["Reservation Service"]
        PricingEngine["Dynamic Pricing Engine"]
        NotificationService["Notification Service"]
        ReportEngine["Report Engine"]
        PresentationEngine["Presentation Engine"]
    end

    subgraph Data["Veri Katmanı"]
        Prisma["Prisma ORM"]
        PG["PostgreSQL"]
        SocketIO["Socket.io Server"]
    end

    Client --> MW --> API
    Client --> SSR
    API --> Services
    Services --> Prisma --> PG
    NotificationService --> SocketIO --> Client
```

### Modül Etkileşim Diyagramı

```mermaid
sequenceDiagram
    participant C as Casino Kullanıcısı
    participant CS as Casino Modülü
    participant NS as Bildirim Servisi
    participant A as Admin
    participant AM as Admin Modülü
    participant FB as F&B Kullanıcısı
    participant FBM as F&B Modülü

    C->>CS: Rezervasyon Talebi Oluştur
    CS->>NS: Yeni talep bildirimi
    NS->>AM: Anlık bildirim (WebSocket)
    A->>AM: Talebi değerlendir
    AM->>AM: Dinamik fiyatlandırma hesapla

    alt Onay
        A->>AM: Talebi onayla
        AM->>NS: Onay bildirimi
        NS->>CS: Casino'ya bildirim
        NS->>FBM: F&B'ye bildirim
        FB->>FBM: Rezervasyonu görüntüle
        FB->>FBM: Konsept dışı ekstra ekle
        FBM->>NS: Ekstra ekleme bildirimi
        NS->>AM: Admin'e bildirim
    else Red
        A->>AM: Talebi reddet (neden belirt)
        AM->>NS: Red bildirimi
        NS->>CS: Casino'ya red bildirimi
    end
```

### Klasör Yapısı

```
royal-cabana/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth layout group
│   │   │   └── login/
│   │   ├── (dashboard)/              # Dashboard layout group
│   │   │   ├── system-admin/         # Sistem Yöneticisi sayfaları
│   │   │   ├── admin/                # Admin sayfaları
│   │   │   ├── casino/               # Casino Rezervasyon sayfaları
│   │   │   ├── fnb/                  # F&B sayfaları
│   │   │   └── reports/              # Raporlama sayfaları
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── cabanas/
│   │   │   ├── classes/
│   │   │   ├── concepts/
│   │   │   ├── products/
│   │   │   ├── reservations/
│   │   │   ├── pricing/
│   │   │   ├── notifications/
│   │   │   └── reports/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn/ui bileşenleri
│   │   ├── map/                      # Leaflet 2D harita bileşenleri
│   │   ├── three/                    # React Three Fiber 3D bileşenleri
│   │   ├── calendar/                 # FullCalendar bileşenleri
│   │   └── shared/                   # Ortak bileşenler
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── socket.ts                 # Socket.io client
│   │   └── pricing.ts               # Fiyatlandırma motoru
│   ├── services/                     # İş mantığı servisleri
│   ├── stores/                       # Zustand stores
│   ├── hooks/                        # Custom React hooks
│   ├── types/                        # TypeScript tipleri
│   └── i18n/                         # Çeviri dosyaları
├── prisma/
│   └── schema.prisma                 # Veritabanı şeması
├── public/
│   ├── gorsel/                       # Kroki ve fotoğraflar
│   └── logo.png
└── socket-server/                    # Socket.io sunucusu
```

---

## Bileşenler ve Arayüzler (Components and Interfaces)

### 1. Auth & RBAC Bileşeni

```typescript
// Roller ve izinler
enum Role {
  SystemAdmin = "SYSTEM_ADMIN",
  Admin = "ADMIN",
  CasinoUser = "CASINO_USER",
  FnBUser = "FNB_USER",
}

// Modül erişim matrisi
const MODULE_ACCESS: Record<Role, string[]> = {
  SYSTEM_ADMIN: ["/system-admin", "/reports"],
  ADMIN: ["/admin"],
  CASINO_USER: ["/casino"],
  FNB_USER: ["/fnb"],
};

// Middleware: Her istek role göre kontrol edilir
// NextAuth.js session'dan role okunur, izin yoksa 403
```

### 2. Harita Bileşeni (2D - Leaflet)

```typescript
interface MapComponentProps {
  cabanas: CabanaWithStatus[];
  editable: boolean; // Sistem Yöneticisi: true, Casino: false
  onCabanaClick: (id: string) => void;
  onCabanaDrag?: (id: string, coords: LatLng) => void;
}

// Leaflet CRS.Simple kullanılır (coğrafi değil, piksel tabanlı)
// gorsel/kroki.png ImageOverlay olarak yüklenir
// Her kabana bir CircleMarker veya custom icon ile temsil edilir
// Renk kodlaması: müsait=yeşil, rezerve=kırmızı, kapalı=gri
```

### 3. 3D Görünüm Bileşeni (React Three Fiber)

```typescript
interface ThreeViewProps {
  cabanas: CabanaWithStatus[];
  onCabanaSelect: (id: string) => void;
}

// Her Kabana_Sınıfı için farklı GLTF/GLB 3D model
// OrbitControls ile kamera kontrolü
// Hover ve click etkileşimleri
// Seçilen kabana için detay paneli + fotoğraf galerisi
```

### 4. Takvim Bileşeni (FullCalendar)

```typescript
interface CalendarComponentProps {
  reservations: ReservationEvent[];
  cabanas: CabanaResource[];
  onDateClick: (date: Date, cabanaId?: string) => void;
  onEventClick: (reservationId: string) => void;
  onEventContextMenu: (reservationId: string, position: Point) => void;
}

// FullCalendar Resource Timeline plugin
// Kaynaklar: Kabanalar (satırlar), Zaman: Tarihler (sütunlar)
// Renk kodlaması: bekliyor=sarı, onaylı=yeşil, red=kırmızı, iptal=gri
// Sağ tık context menu: Değişiklik, İptal, Ek Konsept
```

### 5. Dinamik Fiyatlandırma Motoru

```typescript
interface PricingEngine {
  calculatePrice(params: {
    cabanaId: string;
    conceptId: string;
    startDate: Date;
    endDate: Date;
    extras?: ExtraItem[];
  }): PriceBreakdown;
}

interface PriceBreakdown {
  cabanaDaily: number; // Kabana günlük fiyat
  conceptTotal: number; // Konsept toplam fiyat
  extrasTotal: number; // Ekstralar toplamı
  grandTotal: number; // Genel toplam
  priceSource: PriceSource; // Fiyat kaynağı (kabana özel / konsept özel / genel)
  items: PriceLineItem[]; // Kalem bazlı detay
}

// Fiyat öncelik sırası:
// 1. Kabana özel fiyat (en yüksek öncelik)
// 2. Konsept özel fiyat
// 3. Genel ürün fiyatı (en düşük öncelik)
```

### 6. Bildirim Servisi

```typescript
interface NotificationService {
  send(notification: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  markAsRead(notificationId: string): Promise<void>;
  getUnread(userId: string): Promise<Notification[]>;
}

// Socket.io ile anlık push
// Veritabanında persist (okundu/okunmadı takibi)
// Bildirim tipleri: NEW_REQUEST, APPROVED, REJECTED, EXTRA_ADDED, STATUS_CHANGED
```

### 7. Rapor ve Sunum Motoru

```typescript
interface ReportEngine {
  generateReport(params: {
    type: ReportType;
    filters: ReportFilters;
    format: "pdf" | "excel";
  }): Promise<Blob>;
}

interface PresentationEngine {
  generatePresentation(params: {
    includeLayout: boolean;
    includeClasses: boolean;
    includePricing: boolean;
    includePhotos: boolean;
  }): Promise<Blob>;
}

// ReportType: OCCUPANCY, REVENUE, COST_ANALYSIS, REQUEST_STATS
// Sunum: pptxgenjs ile slide oluşturma, sistem verilerinden otomatik
```

### Sayfa Yapısı ve Navigasyon

```mermaid
graph LR
    subgraph SYM["Sistem Yöneticisi"]
        SY1["Kullanıcı Yönetimi"]
        SY2["Kabana Harita Yönetimi"]
        SY3["Sınıf Yönetimi"]
        SY4["Konsept Yönetimi"]
        SY5["Ürün Yönetimi"]
        SY6["Sistem Kontrolü"]
    end

    subgraph ADM["Admin"]
        A1["Dashboard"]
        A2["Talep Listesi"]
        A3["Fiyatlandırma"]
        A4["Kullanıcı Yönetimi"]
    end

    subgraph CAS["Casino"]
        C1["2D Harita Görünümü"]
        C2["3D Görünüm"]
        C3["Takvim"]
        C4["Taleplerim"]
    end

    subgraph FNB["F&B"]
        F1["Rezervasyon Listesi"]
        F2["Ekstra Ekleme"]
    end

    subgraph RPT["Raporlama"]
        R1["Rapor Oluştur"]
        R2["Sunum Oluştur"]
    end
```

---

## Veri Modelleri (Data Models)

### ER Diyagramı

```mermaid
erDiagram
    User ||--o{ Reservation : creates
    User ||--o{ Notification : receives
    User ||--o{ AuditLog : generates

    CabanaClass ||--o{ Cabana : categorizes
    CabanaClass ||--o{ Concept : "assigned to"
    CabanaClass ||--o{ ClassAttribute : has

    Concept ||--o{ ConceptProduct : contains
    Product ||--o{ ConceptProduct : "included in"
    Product ||--o{ ExtraItem : "added as"

    Cabana ||--o{ Reservation : "reserved for"
    Cabana ||--o{ CabanaPrice : "has pricing"

    Reservation ||--o{ ReservationStatusHistory : tracks
    Reservation ||--o{ ModificationRequest : "modified by"
    Reservation ||--o{ CancellationRequest : "cancelled by"
    Reservation ||--o{ ExtraConceptRequest : "extended by"
    Reservation ||--o{ ExtraItem : "has extras"

    ConceptPrice ||--|| Concept : "prices for"
    ConceptPrice ||--|| Product : "product price"
```

### Prisma Şeması

```prisma
// ===== KULLANICI VE YETKİLENDİRME =====

model User {
  id            String    @id @default(cuid())
  username      String    @unique
  email         String    @unique
  passwordHash  String
  role          Role
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdBy     String?

  reservations          Reservation[]
  notifications         Notification[]
  auditLogs             AuditLog[]
}

enum Role {
  SYSTEM_ADMIN
  ADMIN
  CASINO_USER
  FNB_USER
}

// ===== KABANA VE SINIFLANDIRMA =====

model CabanaClass {
  id            String    @id @default(cuid())
  name          String    @unique
  description   String
  defaults      String?   // JSON: varsayılan standartlar
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  cabanas       Cabana[]
  concepts      Concept[]
  attributes    ClassAttribute[]
}

model ClassAttribute {
  id            String      @id @default(cuid())
  classId       String
  key           String
  value         String
  createdAt     DateTime    @default(now())

  cabanaClass   CabanaClass @relation(fields: [classId], references: [id])

  @@unique([classId, key])
}

model Cabana {
  id            String      @id @default(cuid())
  name          String      @unique
  classId       String
  conceptId     String?
  coordX        Float       // Harita X koordinatı
  coordY        Float       // Harita Y koordinatı
  status        CabanaStatus @default(AVAILABLE)
  isOpenForReservation Boolean @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  cabanaClass   CabanaClass @relation(fields: [classId], references: [id])
  concept       Concept?    @relation(fields: [conceptId], references: [id])
  reservations  Reservation[]
  prices        CabanaPrice[]
}

enum CabanaStatus {
  AVAILABLE
  RESERVED
  CLOSED
}

// ===== KONSEPT VE ÜRÜN =====

model Concept {
  id            String      @id @default(cuid())
  name          String      @unique
  description   String
  classId       String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  cabanaClass   CabanaClass? @relation(fields: [classId], references: [id])
  cabanas       Cabana[]
  products      ConceptProduct[]
  conceptPrices ConceptPrice[]
}

model Product {
  id            String      @id @default(cuid())
  name          String
  purchasePrice Float       // Alış fiyatı
  salePrice     Float       // Satış fiyatı (genel)
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  conceptProducts ConceptProduct[]
  conceptPrices   ConceptPrice[]
  extraItems      ExtraItem[]
}

model ConceptProduct {
  id            String    @id @default(cuid())
  conceptId     String
  productId     String
  quantity      Int       @default(1)

  concept       Concept   @relation(fields: [conceptId], references: [id])
  product       Product   @relation(fields: [productId], references: [id])

  @@unique([conceptId, productId])
}

// ===== DİNAMİK FİYATLANDIRMA =====

model CabanaPrice {
  id            String    @id @default(cuid())
  cabanaId      String
  date          DateTime  @db.Date
  dailyPrice    Float
  createdAt     DateTime  @default(now())

  cabana        Cabana    @relation(fields: [cabanaId], references: [id])

  @@unique([cabanaId, date])
}

model ConceptPrice {
  id            String    @id @default(cuid())
  conceptId     String
  productId     String?   // null ise konsept toplam fiyatı
  price         Float
  createdAt     DateTime  @default(now())

  concept       Concept   @relation(fields: [conceptId], references: [id])
  product       Product?  @relation(fields: [productId], references: [id])

  @@unique([conceptId, productId])
}

// ===== REZERVASYON VE TALEPLER =====

model Reservation {
  id            String              @id @default(cuid())
  cabanaId      String
  userId        String              // Talebi oluşturan Casino kullanıcısı
  guestName     String
  startDate     DateTime            @db.Date
  endDate       DateTime            @db.Date
  notes         String?
  status        ReservationStatus   @default(PENDING)
  totalPrice    Float?
  rejectionReason String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  cabana        Cabana              @relation(fields: [cabanaId], references: [id])
  user          User                @relation(fields: [userId], references: [id])
  statusHistory ReservationStatusHistory[]
  modifications ModificationRequest[]
  cancellations CancellationRequest[]
  extraConcepts ExtraConceptRequest[]
  extraItems    ExtraItem[]
}

enum ReservationStatus {
  PENDING             // Onay bekliyor
  APPROVED            // Onaylandı
  REJECTED            // Reddedildi
  CANCELLED           // İptal edildi
  MODIFICATION_PENDING // Değişiklik onayı bekliyor
  EXTRA_PENDING       // Ek konsept onayı bekliyor
}

model ReservationStatusHistory {
  id              String            @id @default(cuid())
  reservationId   String
  fromStatus      ReservationStatus?
  toStatus        ReservationStatus
  changedBy       String
  reason          String?
  createdAt       DateTime          @default(now())

  reservation     Reservation       @relation(fields: [reservationId], references: [id])
}

model ModificationRequest {
  id              String    @id @default(cuid())
  reservationId   String
  requestedBy     String
  newCabanaId     String?
  newStartDate    DateTime? @db.Date
  newEndDate      DateTime? @db.Date
  newGuestName    String?
  status          RequestStatus @default(PENDING)
  rejectionReason String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  reservation     Reservation @relation(fields: [reservationId], references: [id])
}

model CancellationRequest {
  id              String    @id @default(cuid())
  reservationId   String
  requestedBy     String
  reason          String    // Zorunlu alan
  status          RequestStatus @default(PENDING)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  reservation     Reservation @relation(fields: [reservationId], references: [id])
}

model ExtraConceptRequest {
  id              String    @id @default(cuid())
  reservationId   String
  requestedBy     String
  items           Json      // Talep edilen ek ürün/hizmetler
  status          RequestStatus @default(PENDING)
  rejectionReason String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  reservation     Reservation @relation(fields: [reservationId], references: [id])
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}

// ===== KONSEPT DIŞI EKSTRALAR (F&B) =====

model ExtraItem {
  id              String    @id @default(cuid())
  reservationId   String
  productId       String
  quantity        Int       @default(1)
  unitPrice       Float
  addedBy         String    // F&B kullanıcısı
  createdAt       DateTime  @default(now())

  reservation     Reservation @relation(fields: [reservationId], references: [id])
  product         Product     @relation(fields: [productId], references: [id])
}

// ===== BİLDİRİM =====

model Notification {
  id            String            @id @default(cuid())
  userId        String
  type          NotificationType
  title         String
  message       String
  metadata      Json?
  isRead        Boolean           @default(false)
  createdAt     DateTime          @default(now())

  user          User              @relation(fields: [userId], references: [id])
}

enum NotificationType {
  NEW_REQUEST
  APPROVED
  REJECTED
  MODIFICATION_REQUEST
  CANCELLATION_REQUEST
  EXTRA_CONCEPT_REQUEST
  EXTRA_ADDED
  STATUS_CHANGED
}

// ===== DENETİM KAYDI =====

model AuditLog {
  id            String    @id @default(cuid())
  userId        String
  action        String    // CREATE, UPDATE, DELETE
  entity        String    // Tablo adı
  entityId      String
  oldValue      Json?
  newValue      Json?
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id])
}

// ===== SİSTEM KONFİGÜRASYON =====

model SystemConfig {
  id            String    @id @default(cuid())
  key           String    @unique
  value         String
  updatedAt     DateTime  @updatedAt
}
// Örnek: { key: "system_open_for_reservation", value: "true" }
```

### Veri İlişkileri Özeti

| İlişki                             | Tür | Açıklama                                                  |
| ---------------------------------- | --- | --------------------------------------------------------- |
| User → Reservation                 | 1:N | Kullanıcı birden fazla talep oluşturabilir                |
| CabanaClass → Cabana               | 1:N | Bir sınıfta birden fazla kabana olabilir                  |
| CabanaClass → Concept              | 1:N | Bir sınıfa birden fazla konsept atanabilir                |
| Concept → ConceptProduct → Product | N:M | Konseptler birden fazla ürün içerebilir                   |
| Cabana → Reservation               | 1:N | Bir kabana birden fazla rezervasyona sahip olabilir       |
| Reservation → ModificationRequest  | 1:N | Bir rezervasyonda birden fazla değişiklik talebi olabilir |
| Reservation → ExtraItem            | 1:N | Bir rezervasyona birden fazla ekstra eklenebilir          |
| Cabana → CabanaPrice               | 1:N | Kabana bazında günlük fiyatlar                            |
| Concept → ConceptPrice             | 1:N | Konsept bazında özel fiyatlar                             |

---

## API Endpoint Tanımları

### Auth API

| Method | Endpoint            | Açıklama                  | Rol       |
| ------ | ------------------- | ------------------------- | --------- |
| POST   | `/api/auth/login`   | Kullanıcı girişi, JWT ver | Herkese   |
| POST   | `/api/auth/logout`  | Oturumu sonlandır         | Giriş yap |
| GET    | `/api/auth/me`      | Mevcut kullanıcı bilgisi  | Giriş yap |
| POST   | `/api/auth/refresh` | Token yenile              | Giriş yap |

### Users API

| Method | Endpoint         | Açıklama                   | Rol                |
| ------ | ---------------- | -------------------------- | ------------------ |
| GET    | `/api/users`     | Kullanıcı listesi          | SystemAdmin, Admin |
| POST   | `/api/users`     | Yeni kullanıcı oluştur     | SystemAdmin, Admin |
| GET    | `/api/users/:id` | Kullanıcı detayı           | SystemAdmin, Admin |
| PATCH  | `/api/users/:id` | Kullanıcı güncelle         | SystemAdmin, Admin |
| DELETE | `/api/users/:id` | Kullanıcı devre dışı bırak | SystemAdmin        |

### Cabanas API

| Method | Endpoint                    | Açıklama                       | Rol         |
| ------ | --------------------------- | ------------------------------ | ----------- |
| GET    | `/api/cabanas`              | Tüm kabanalar (durum dahil)    | Tüm roller  |
| POST   | `/api/cabanas`              | Yeni kabana ekle               | SystemAdmin |
| GET    | `/api/cabanas/:id`          | Kabana detayı                  | Tüm roller  |
| PATCH  | `/api/cabanas/:id`          | Kabana güncelle (konum, durum) | SystemAdmin |
| DELETE | `/api/cabanas/:id`          | Kabana sil                     | SystemAdmin |
| PATCH  | `/api/cabanas/:id/position` | Harita koordinatı güncelle     | SystemAdmin |
| PATCH  | `/api/cabanas/:id/status`   | Rezervasyon açık/kapalı        | SystemAdmin |

### Classes API

| Method | Endpoint                              | Açıklama            | Rol         |
| ------ | ------------------------------------- | ------------------- | ----------- |
| GET    | `/api/classes`                        | Tüm sınıflar        | Tüm roller  |
| POST   | `/api/classes`                        | Yeni sınıf oluştur  | SystemAdmin |
| GET    | `/api/classes/:id`                    | Sınıf detayı        | Tüm roller  |
| PATCH  | `/api/classes/:id`                    | Sınıf güncelle      | SystemAdmin |
| DELETE | `/api/classes/:id`                    | Sınıf sil           | SystemAdmin |
| POST   | `/api/classes/:id/attributes`         | Sınıfa özellik ekle | SystemAdmin |
| DELETE | `/api/classes/:id/attributes/:attrId` | Özellik sil         | SystemAdmin |

### Concepts API

| Method | Endpoint                                | Açıklama               | Rol         |
| ------ | --------------------------------------- | ---------------------- | ----------- |
| GET    | `/api/concepts`                         | Tüm konseptler         | Tüm roller  |
| POST   | `/api/concepts`                         | Yeni konsept oluştur   | SystemAdmin |
| GET    | `/api/concepts/:id`                     | Konsept detayı         | Tüm roller  |
| PATCH  | `/api/concepts/:id`                     | Konsept güncelle       | SystemAdmin |
| DELETE | `/api/concepts/:id`                     | Konsept sil            | SystemAdmin |
| POST   | `/api/concepts/:id/products`            | Konsepte ürün ekle     | SystemAdmin |
| DELETE | `/api/concepts/:id/products/:productId` | Ürünü konseptten çıkar | SystemAdmin |

### Products API

| Method | Endpoint            | Açıklama          | Rol         |
| ------ | ------------------- | ----------------- | ----------- |
| GET    | `/api/products`     | Tüm ürünler       | Tüm roller  |
| POST   | `/api/products`     | Yeni ürün oluştur | SystemAdmin |
| GET    | `/api/products/:id` | Ürün detayı       | Tüm roller  |
| PATCH  | `/api/products/:id` | Ürün güncelle     | SystemAdmin |
| DELETE | `/api/products/:id` | Ürün sil          | SystemAdmin |

### Pricing API

| Method | Endpoint                   | Açıklama                          | Rol   |
| ------ | -------------------------- | --------------------------------- | ----- |
| GET    | `/api/pricing/cabana/:id`  | Kabana fiyat takvimi              | Admin |
| POST   | `/api/pricing/cabana/:id`  | Kabana günlük fiyat ekle/güncelle | Admin |
| GET    | `/api/pricing/concept/:id` | Konsept fiyatları                 | Admin |
| POST   | `/api/pricing/concept/:id` | Konsept fiyatı ekle/güncelle      | Admin |
| POST   | `/api/pricing/calculate`   | Fiyat hesapla (preview)           | Admin |

### Reservations API

| Method | Endpoint                                            | Açıklama                        | Rol        |
| ------ | --------------------------------------------------- | ------------------------------- | ---------- |
| GET    | `/api/reservations`                                 | Rezervasyon listesi (role göre) | Tüm roller |
| POST   | `/api/reservations`                                 | Yeni rezervasyon talebi         | CasinoUser |
| GET    | `/api/reservations/:id`                             | Rezervasyon detayı              | Tüm roller |
| PATCH  | `/api/reservations/:id/approve`                     | Talebi onayla                   | Admin      |
| PATCH  | `/api/reservations/:id/reject`                      | Talebi reddet                   | Admin      |
| POST   | `/api/reservations/:id/modifications`               | Değişiklik talebi oluştur       | CasinoUser |
| PATCH  | `/api/reservations/:id/modifications/:mId/approve`  | Değişikliği onayla              | Admin      |
| PATCH  | `/api/reservations/:id/modifications/:mId/reject`   | Değişikliği reddet              | Admin      |
| POST   | `/api/reservations/:id/cancellations`               | İptal talebi oluştur            | CasinoUser |
| PATCH  | `/api/reservations/:id/cancellations/:cId/approve`  | İptali onayla                   | Admin      |
| POST   | `/api/reservations/:id/extra-concepts`              | Ek konsept talebi oluştur       | CasinoUser |
| PATCH  | `/api/reservations/:id/extra-concepts/:eId/approve` | Ek konsepti onayla              | Admin      |
| POST   | `/api/reservations/:id/extras`                      | Konsept dışı ekstra ekle        | FnBUser    |

### Notifications API

| Method | Endpoint                      | Açıklama                  | Rol       |
| ------ | ----------------------------- | ------------------------- | --------- |
| GET    | `/api/notifications`          | Kullanıcının bildirimleri | Giriş yap |
| PATCH  | `/api/notifications/:id/read` | Bildirimi okundu işaretle | Giriş yap |
| PATCH  | `/api/notifications/read-all` | Tümünü okundu işaretle    | Giriş yap |

### Reports API

| Method | Endpoint                    | Açıklama                  | Rol         |
| ------ | --------------------------- | ------------------------- | ----------- |
| POST   | `/api/reports/generate`     | Rapor oluştur (PDF/Excel) | SystemAdmin |
| POST   | `/api/reports/presentation` | Sunum oluştur             | SystemAdmin |

### System Config API

| Method | Endpoint                         | Açıklama                      | Rol         |
| ------ | -------------------------------- | ----------------------------- | ----------- |
| GET    | `/api/system/config`             | Sistem konfigürasyonu         | SystemAdmin |
| PATCH  | `/api/system/config`             | Konfigürasyon güncelle        | SystemAdmin |
| PATCH  | `/api/system/reservation-status` | Sistemi rezervasyona aç/kapat | SystemAdmin |

---

## Hata Yönetimi Stratejisi

### Standart API Hata Yanıt Formatı

```typescript
interface ApiError {
  code: string; // Makine okunabilir hata kodu
  message: string; // İnsan okunabilir mesaj (i18n key)
  details?: unknown; // Ek bağlam (validation hataları vb.)
  requestId: string; // İzleme için
}

// Örnek:
// { code: "CABANA_NOT_AVAILABLE", message: "Seçilen tarihte kabana müsait değil", requestId: "req_abc123" }
```

### HTTP Durum Kodu Eşlemesi

| Durum | Kod           | Kullanım                                 |
| ----- | ------------- | ---------------------------------------- |
| 200   | OK            | Başarılı GET, PATCH                      |
| 201   | Created       | Başarılı POST                            |
| 400   | Bad Request   | Validation hatası, geçersiz input        |
| 401   | Unauthorized  | Token yok veya geçersiz                  |
| 403   | Forbidden     | Rol yetkisi yok                          |
| 404   | Not Found     | Kaynak bulunamadı                        |
| 409   | Conflict      | Çakışma (tarih çakışması, duplicate vb.) |
| 422   | Unprocessable | İş kuralı ihlali                         |
| 500   | Server Error  | Beklenmeyen sunucu hatası                |

### Client-Side Hata Sınıflandırması

```typescript
// Kullanıcıya gösterilecek hata tipleri
type ErrorSeverity = "error" | "warning" | "info";

// Toast bildirimleri: geçici, kısa mesajlar
// Modal dialog: kritik hatalar, onay gerektiren durumlar
// Inline validation: form alanı hataları
// Full-page error: 404, 403, 500 sayfaları
```

### Retry ve Fallback Stratejisi

- Network hataları: 3 kez otomatik retry (exponential backoff)
- Socket.io bağlantı kopması: otomatik reconnect, polling fallback
- Harita yüklenemezse: statik liste görünümüne fallback
- 3D model yüklenemezse: 2D harita görünümüne fallback

---

## Güvenlik Tasarımı

### Middleware Akışı

```
İstek → Rate Limiter → CORS → Auth Middleware → RBAC Middleware → Route Handler
```

### Auth Middleware Detayı

```typescript
// middleware.ts (Next.js)
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("next-auth.session-token");

  // 1. Token yoksa login'e yönlendir
  if (!token) return NextResponse.redirect("/login");

  // 2. Token geçerliliğini doğrula
  const session = await getToken({ req: request });
  if (!session) return NextResponse.redirect("/login");

  // 3. Rol bazlı erişim kontrolü
  const { role } = session;
  const path = request.nextUrl.pathname;

  if (!hasAccess(role, path)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(dashboard)/:path*", "/api/:path*"],
};
```

### Rate Limiting

- Login endpoint: 5 istek / dakika / IP
- API genel: 100 istek / dakika / kullanıcı
- Rapor oluşturma: 10 istek / saat / kullanıcı

### Input Validation

- Tüm API girdileri Zod şemasıyla doğrulanır
- SQL injection: Prisma parametreli sorgular
- XSS: React'ın varsayılan escape mekanizması + DOMPurify (HTML içerik için)
- CSRF: NextAuth.js CSRF token koruması

---

## Doğruluk Özellikleri (Correctness Properties)

Bu özellikler property-based testing ile doğrulanacaktır.

### P1: Rezervasyon Çakışması Yok

```
∀ r1, r2 ∈ Reservations:
  r1.cabanaId = r2.cabanaId ∧ r1.id ≠ r2.id ∧
  r1.status ∈ {APPROVED} ∧ r2.status ∈ {APPROVED}
  → r1.dateRange ∩ r2.dateRange = ∅
```

Aynı kabanada onaylı iki rezervasyon asla tarih çakışması yaşayamaz.

### P2: Fiyat Öncelik Tutarlılığı

```
∀ reservation ∈ Reservations:
  cabanaPrice(reservation.cabanaId, date) ≠ null
  → appliedPrice = cabanaPrice

  cabanaPrice = null ∧ conceptPrice(reservation.conceptId) ≠ null
  → appliedPrice = conceptPrice

  cabanaPrice = null ∧ conceptPrice = null
  → appliedPrice = product.salePrice
```

Fiyat öncelik sırası her zaman: kabana özel > konsept özel > genel ürün fiyatı.

### P3: Durum Geçiş Tutarlılığı

```
Geçerli durum geçişleri:
PENDING → APPROVED | REJECTED
APPROVED → MODIFICATION_PENDING | EXTRA_PENDING | CANCELLED
MODIFICATION_PENDING → APPROVED | REJECTED
EXTRA_PENDING → APPROVED | REJECTED
REJECTED → (terminal)
CANCELLED → (terminal)
```

Geçersiz durum geçişleri reddedilir ve hata döner.

### P4: Rol Erişim İzolasyonu

```
∀ user ∈ Users, ∀ module ∈ Modules:
  user.role ∉ module.allowedRoles
  → access(user, module) = FORBIDDEN (403)
```

Hiçbir kullanıcı kendi rolü dışındaki modüle erişemez.

### P5: Bildirim Teslimat Garantisi

```
∀ event ∈ [APPROVED, REJECTED, NEW_REQUEST, EXTRA_ADDED]:
  event.occurs → notification.created ∧ notification.delivered
```

Her durum değişikliği için ilgili kullanıcıya bildirim oluşturulur.

### P6: Audit Log Eksiksizliği

```
∀ mutation ∈ [CREATE, UPDATE, DELETE]:
  mutation.occurs → auditLog.created(
    userId, action, entity, entityId, oldValue, newValue, timestamp
  )
```

Her veri değişikliği audit log'a kaydedilir.

### Property-Based Test Stratejisi

```typescript
// Örnek: P1 - Rezervasyon çakışması testi
import { fc } from "@fast-check/vitest";

test("onaylı rezervasyonlar aynı kabanada çakışamaz", () => {
  fc.assert(
    fc.property(
      fc.record({
        cabanaId: fc.string(),
        start1: fc.date(),
        end1: fc.date(),
        start2: fc.date(),
        end2: fc.date(),
      }),
      async ({ cabanaId, start1, end1, start2, end2 }) => {
        // İki rezervasyon oluştur, ikisini de onayla
        // Çakışma varsa ikinci onay 409 dönmeli
        const r1 = await createAndApprove(cabanaId, start1, end1);
        const r2 = await tryApprove(cabanaId, start2, end2);

        if (datesOverlap(start1, end1, start2, end2)) {
          expect(r2.status).toBe(409);
        } else {
          expect(r2.status).toBe(200);
        }
      },
    ),
  );
});
```

---

## Deployment ve Environment Konfigürasyonu

### Environment Değişkenleri

```env
# Veritabanı
DATABASE_URL="postgresql://user:password@localhost:5432/royal_cabana"

# Auth
NEXTAUTH_SECRET="<random-secret>"
NEXTAUTH_URL="http://localhost:3000"

# Socket.io
SOCKET_SERVER_URL="http://localhost:3001"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development" | "production"
```

### Geliştirme Ortamı Kurulumu

```bash
# Bağımlılıkları yükle
npm install

# Veritabanı migration
npx prisma migrate dev

# Seed data
npx prisma db seed

# Geliştirme sunucusu
npm run dev

# Socket.io sunucusu (ayrı terminal)
npm run socket
```

### Üretim Build

```bash
npm run build
npm run start
```

### Paket Bağımlılıkları

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@prisma/client": "^5.0.0",
    "next-auth": "^4.24.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "socket.io": "^4.6.0",
    "socket.io-client": "^4.6.0",
    "leaflet": "^1.9.0",
    "react-leaflet": "^4.2.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "@fullcalendar/react": "^6.1.0",
    "@fullcalendar/resource-timeline": "^6.1.0",
    "jspdf": "^2.5.0",
    "xlsx": "^0.18.0",
    "pptxgenjs": "^3.12.0",
    "next-intl": "^3.0.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.3.0",
    "@radix-ui/react-*": "latest"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "@fast-check/vitest": "^0.1.0",
    "@testing-library/react": "^14.0.0"
  }
}
```
