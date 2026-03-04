# Prisma Schema & Migration Analiz Raporu

**Tarih:** 4 Mart 2026  
**Kapsam:** `prisma/` klasörü (schema.prisma, migrations/, seed.ts)  
**Toplam Satır:** schema.prisma → 849 satır | seed.ts → 1320 satır  
**Toplam Model:** 30 | **Toplam Enum:** 9 | **Toplam Migration:** 29 + 1 SQL dosyası

---

## 1. Model Analiz Tablosu

### Soft Delete Durumu

AGENTS.md kuralı: **`isDeleted` + `deletedAt` ZORUNLU, hard delete YASAK.**

| #   | Model                    | `isDeleted` | `deletedAt` | Durum                                  |
| --- | ------------------------ | :---------: | :---------: | -------------------------------------- |
| 1   | User                     |     ❌      |     ✅      | ⚠️ **EKSİK** — `isDeleted` yok         |
| 2   | RoleDefinition           |     ✅      |     ✅      | ✅ Doğru                               |
| 3   | Permission               |     ✅      |     ✅      | ✅ Doğru                               |
| 4   | RolePermission           |     ✅      |     ✅      | ✅ Doğru                               |
| 5   | CabanaClass              |     ❌      |     ❌      | ⚠️ **Soft delete yok**                 |
| 6   | ClassAttribute           |     ❌      |     ❌      | — Junction/alt veri (kabul edilebilir) |
| 7   | Cabana                   |     ❌      |     ✅      | ⚠️ **EKSİK** — `isDeleted` yok         |
| 8   | ProductGroup             |     ❌      |     ❌      | ⚠️ **Soft delete yok**                 |
| 9   | Concept                  |     ❌      |     ❌      | ⚠️ **Soft delete yok**                 |
| 10  | Product                  |     ❌      |     ✅      | ⚠️ **EKSİK** — `isDeleted` yok         |
| 11  | ConceptProduct           |     ❌      |     ❌      | — Junction tablo (kabul edilebilir)    |
| 12  | ConceptExtraService      |     ❌      |     ❌      | — Junction tablo (kabul edilebilir)    |
| 13  | Reservation              |     ❌      |     ✅      | ⚠️ **EKSİK** — `isDeleted` yok         |
| 14  | ReservationStatusHistory |     ❌      |     ❌      | — Tarihçe tablosu (gerekli değil)      |
| 15  | ModificationRequest      |     ❌      |     ❌      | — İstek tablosu (tartışılır)           |
| 16  | CancellationRequest      |     ❌      |     ❌      | — İstek tablosu (tartışılır)           |
| 17  | ExtraConceptRequest      |     ❌      |     ❌      | — İstek tablosu (tartışılır)           |
| 18  | ExtraItem                |     ❌      |     ❌      | — Sipariş kalemi (gerekli değil)       |
| 19  | Notification             |     ❌      |     ❌      | — Bildirim (gerekli değil)             |
| 20  | AuditLog                 |     ❌      |     ❌      | — Audit log (silinmemeli)              |
| 21  | LoginSession             |     ❌      |     ❌      | — Oturum kaydı (gerekli değil)         |
| 22  | Guest                    |     ❌      |     ✅      | ⚠️ **EKSİK** — `isDeleted` yok         |
| 23  | FnbOrder                 |     ❌      |     ❌      | ⚠️ **Soft delete yok** — sipariş kaydı |
| 24  | FnbOrderItem             |     ❌      |     ❌      | — Sipariş kalemi (gerekli değil)       |
| 25  | SystemConfig             |     ❌      |     ❌      | — Konfigürasyon (gerekli değil)        |
| 26  | BlackoutDate             |     ❌      |     ❌      | — Tarih bloklama (tartışılır)          |
| 27  | WaitlistEntry            |     ❌      |     ❌      | — Bekleme listesi (tartışılır)         |
| 28  | RecurringBooking         |     ❌      |     ❌      | ⚠️ **Soft delete yok**                 |
| 29  | TaskDefinition           |     ❌      |     ✅      | ⚠️ **EKSİK** — `isDeleted` yok         |
| 30  | Staff                    |     ❌      |     ✅      | ⚠️ **EKSİK** — `isDeleted` yok         |
| 31  | StaffAssignment          |     ❌      |     ❌      | — Atama tablosu (gerekli değil)        |
| 32  | StaffTask                |     ❌      |     ❌      | — Görev kaydı (tartışılır)             |
| 33  | Review                   |     ❌      |     ❌      | ⚠️ **Soft delete yok**                 |
| 34  | PushSubscription         |     ❌      |     ❌      | — Teknik kayıt (gerekli değil)         |
| 35  | ServicePoint             |     ✅      |     ✅      | ✅ Doğru                               |
| 36  | ServicePointStaff        |     ❌      |     ❌      | — Atama tablosu (gerekli değil)        |
| 37  | ExtraService             |     ✅      |     ✅      | ✅ Doğru                               |
| 38  | ExtraServicePrice        |     ❌      |     ❌      | — Fiyat geçmişi (gerekli değil)        |

**Özet:**

- ✅ Doğru (isDeleted + deletedAt): **5** model (RoleDefinition, Permission, RolePermission, ServicePoint, ExtraService)
- ⚠️ Sadece deletedAt var (isDeleted eksik): **7** model (User, Cabana, Product, Reservation, Guest, TaskDefinition, Staff)
- ⚠️ Hiç soft delete yok (olması gerekebilir): **5** model (CabanaClass, ProductGroup, Concept, RecurringBooking, Review)

---

### Index Durumu

| #   | Model                    | Index Sayısı | Index Açıklaması                                                          | Yeterli?                                          |
| --- | ------------------------ | :----------: | ------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | User                     |      1       | `deletedAt`                                                               | ⚠️ `role` indexi yok                              |
| 2   | RoleDefinition           |      2       | `isDeleted`, `isActive`                                                   | ✅                                                |
| 3   | Permission               |      4       | `module`, `action`, `isDeleted`, `isActive`                               | ✅                                                |
| 4   | RolePermission           |  2 + unique  | composite indexes                                                         | ✅                                                |
| 5   | CabanaClass              |    **0**     | —                                                                         | ⚠️ **Index yok**                                  |
| 6   | ClassAttribute           |  0 + unique  | unique constraint                                                         | ✅                                                |
| 7   | Cabana                   |      3       | `classId`, `status`, `deletedAt`                                          | ✅                                                |
| 8   | ProductGroup             |    **0**     | —                                                                         | ⚠️ **Index yok** (küçük tablo — kabul edilebilir) |
| 9   | Concept                  |    **0**     | —                                                                         | ⚠️ **Index yok** — `classId` indexi olmalı        |
| 10  | Product                  |      2       | `groupId`, `deletedAt`                                                    | ✅                                                |
| 11  | ConceptProduct           |  1 + unique  | `conceptId`                                                               | ✅                                                |
| 12  | ConceptExtraService      |  1 + unique  | `conceptId`                                                               | ✅                                                |
| 13  | Reservation              |    **8**     | Kapsamlı composite index'ler                                              | ✅ Çok iyi                                        |
| 14  | ReservationStatusHistory |      1       | `reservationId`                                                           | ✅                                                |
| 15  | ModificationRequest      |      1       | `reservationId`                                                           | ✅                                                |
| 16  | CancellationRequest      |      1       | `reservationId`                                                           | ✅                                                |
| 17  | ExtraConceptRequest      |      1       | `reservationId`                                                           | ✅                                                |
| 18  | ExtraItem                |      1       | `reservationId`                                                           | ✅                                                |
| 19  | Notification             |      3       | Composite: `userId+isRead`, `userId+createdAt`, `userId+isRead+createdAt` | ✅ Çok iyi                                        |
| 20  | AuditLog                 |      2       | `entity+entityId`, `userId`                                               | ✅                                                |
| 21  | LoginSession             |      3       | `userId`, `isActive`, `loginAt`                                           | ✅                                                |
| 22  | Guest                    |      4       | `name`, `phone`, `isBlacklisted`, `deletedAt`                             | ✅                                                |
| 23  | FnbOrder                 |      4       | `reservationId`, `cabanaId`, `status`, `createdAt`                        | ✅                                                |
| 24  | FnbOrderItem             |      1       | `orderId`                                                                 | ✅                                                |
| 25  | SystemConfig             |  0 + unique  | unique `key`                                                              | ✅                                                |
| 26  | BlackoutDate             |      2       | `startDate+endDate`, `cabanaId`                                           | ✅                                                |
| 27  | WaitlistEntry            |      2       | `cabanaId+desiredStart`, `userId`                                         | ✅                                                |
| 28  | RecurringBooking         |      2       | `cabanaId`, `isActive`                                                    | ✅                                                |
| 29  | TaskDefinition           |      3       | `isActive`, `category`, `deletedAt`                                       | ✅                                                |
| 30  | Staff                    |      2       | `isActive`, `deletedAt`                                                   | ✅                                                |
| 31  | StaffAssignment          |  1 + unique  | `date`                                                                    | ✅                                                |
| 32  | StaffTask                |      2       | `staffId+date`, `taskDefinitionId`                                        | ✅                                                |
| 33  | Review                   |  2 + unique  | `userId`, `rating`                                                        | ✅                                                |
| 34  | PushSubscription         |  1 + unique  | `userId`                                                                  | ✅                                                |
| 35  | ServicePoint             |      3       | `type`, `isActive`, `isDeleted`                                           | ✅                                                |
| 36  | ServicePointStaff        |  3 + unique  | `servicePointId`, `staffId`, `date`                                       | ✅                                                |
| 37  | ExtraService             |      3       | `category`, `isActive`, `isDeleted`                                       | ✅                                                |
| 38  | ExtraServicePrice        |      1       | `extraServiceId+effectiveFrom`                                            | ✅                                                |

---

### Decimal vs Float Kontrolü

**AGENTS.md kuralı:** Fiyat/tutar alanları `Decimal` olmalı, `Float` YASAK.

| Model             | Alan                 | Tip             | Durum |
| ----------------- | -------------------- | --------------- | ----- |
| Concept           | `serviceFee`         | `Decimal(10,2)` | ✅    |
| Product           | `purchasePrice`      | `Decimal(10,2)` | ✅    |
| Product           | `salePrice`          | `Decimal(10,2)` | ✅    |
| Reservation       | `totalPrice`         | `Decimal(10,2)` | ✅    |
| Reservation       | `customRequestPrice` | `Decimal(10,2)` | ✅    |
| ExtraItem         | `unitPrice`          | `Decimal(10,2)` | ✅    |
| FnbOrderItem      | `unitPrice`          | `Decimal(10,2)` | ✅    |
| ExtraServicePrice | `price`              | `Decimal(10,2)` | ✅    |

**Float kullanımı (fiyat olmayan, meşru alanlar):**

| Model        | Alan                                               | Tip   | Durum             |
| ------------ | -------------------------------------------------- | ----- | ----------------- |
| Cabana       | `coordX`, `coordY`, `rotation`, `scaleX`, `scaleY` | Float | ✅ Geometrik veri |
| LoginSession | `latitude`, `longitude`                            | Float | ✅ Coğrafi veri   |
| ServicePoint | `coordX`, `coordY`, `rotation`, `scale`            | Float | ✅ Geometrik veri |

**Sonuç: ✅ Tüm fiyat alanları Decimal. Float sadece geometrik/coğrafi alanlarda. KURAL SAĞLANIYOR.**

---

### createdAt / updatedAt Durumu

| Model                    |   `createdAt`    | `updatedAt` | Not                                              |
| ------------------------ | :--------------: | :---------: | ------------------------------------------------ |
| User                     |        ✅        |     ✅      |                                                  |
| RoleDefinition           |        ✅        |     ✅      |                                                  |
| Permission               |        ✅        |     ✅      |                                                  |
| RolePermission           |        ✅        |     ✅      |                                                  |
| CabanaClass              |        ✅        |     ✅      |                                                  |
| ClassAttribute           |        ✅        |     ❌      | ⚠️ `updatedAt` yok                               |
| Cabana                   |        ✅        |     ✅      |                                                  |
| ProductGroup             |        ✅        |     ✅      |                                                  |
| Concept                  |        ✅        |     ✅      |                                                  |
| Product                  |        ✅        |     ✅      |                                                  |
| ConceptProduct           |        ❌        |     ❌      | ⚠️ Hiçbiri yok — junction tablo                  |
| ConceptExtraService      |        ❌        |     ❌      | ⚠️ Hiçbiri yok — junction tablo                  |
| Reservation              |        ✅        |     ✅      |                                                  |
| ReservationStatusHistory |        ✅        |     ❌      | — Tarihçe — immutable                            |
| ModificationRequest      |        ✅        |     ✅      |                                                  |
| CancellationRequest      |        ✅        |     ✅      |                                                  |
| ExtraConceptRequest      |        ✅        |     ✅      |                                                  |
| ExtraItem                |        ✅        |     ❌      | — Sipariş kalemi — immutable                     |
| Notification             |        ✅        |     ❌      | ⚠️ isRead güncelleniyor ama updatedAt yok        |
| AuditLog                 |        ✅        |     ❌      | — Audit — immutable                              |
| LoginSession             | ❌ (loginAt var) |     ❌      | ⚠️ `lastSeenAt` güncelleniyor ama updatedAt yok  |
| Guest                    |        ✅        |     ✅      |                                                  |
| FnbOrder                 |        ✅        |     ✅      |                                                  |
| FnbOrderItem             |        ❌        |     ❌      | ⚠️ Hiçbiri yok                                   |
| SystemConfig             |        ❌        |     ✅      | ⚠️ `createdAt` yok                               |
| BlackoutDate             |        ✅        |     ❌      | — Immutable tarih bloklama                       |
| WaitlistEntry            |        ✅        |     ❌      | ⚠️ `isNotified` güncelleniyor ama updatedAt yok  |
| RecurringBooking         |        ✅        |     ✅      |                                                  |
| TaskDefinition           |        ✅        |     ✅      |                                                  |
| Staff                    |        ✅        |     ✅      |                                                  |
| StaffAssignment          |        ✅        |     ❌      | — Immutable atama                                |
| StaffTask                |        ✅        |     ❌      | ⚠️ `isCompleted` güncelleniyor ama updatedAt yok |
| Review                   |        ✅        |     ❌      | ⚠️ Yorum düzenlenebilirse updatedAt gerekir      |
| PushSubscription         |        ✅        |     ✅      |                                                  |
| ServicePoint             |        ✅        |     ✅      |                                                  |
| ServicePointStaff        |        ✅        |     ❌      | — Immutable atama                                |
| ExtraService             |        ✅        |     ✅      |                                                  |
| ExtraServicePrice        |        ✅        |     ❌      | — Fiyat geçmişi — immutable                      |

---

### İlişki (Relation) Doğruluğu

| Model               | İlişkiler                                                                                                                                | Durum                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| User                | → Reservation[], Notification[], AuditLog[], LoginSession[], WaitlistEntry[], RecurringBooking[], Review[], PushSubscription[]           | ✅                                     |
| RoleDefinition      | → RolePermission[]                                                                                                                       | ✅                                     |
| Permission          | → RolePermission[]                                                                                                                       | ✅                                     |
| RolePermission      | → RoleDefinition, Permission                                                                                                             | ✅ (`onDelete` tanımlı değil — dikkat) |
| CabanaClass         | → Cabana[], Concept[], ClassAttribute[]                                                                                                  | ✅                                     |
| ClassAttribute      | → CabanaClass (onDelete: Cascade)                                                                                                        | ✅                                     |
| Cabana              | → CabanaClass, Concept?, Reservation[], FnbOrder[], BlackoutDate[], WaitlistEntry[], RecurringBooking[], StaffAssignment[]               | ✅                                     |
| Concept             | → CabanaClass?, Cabana[], ConceptProduct[], ConceptExtraService[], Reservation[]                                                         | ✅                                     |
| Product             | → ProductGroup?, ConceptProduct[], ExtraItem[], FnbOrderItem[]                                                                           | ✅                                     |
| ConceptProduct      | → Concept (Cascade), Product                                                                                                             | ✅                                     |
| ConceptExtraService | → Concept (Cascade), ExtraService                                                                                                        | ✅                                     |
| Reservation         | → Cabana, User, Guest?, Concept?, StatusHistory[], Modifications[], Cancellations[], ExtraConcepts[], ExtraItems[], FnbOrders[], Review? | ✅ Kapsamlı                            |
| FnbOrder            | → Reservation (Cascade), Cabana, FnbOrderItem[]                                                                                          | ✅                                     |
| ServicePoint        | → ServicePointStaff[]                                                                                                                    | ✅                                     |
| ExtraService        | → ExtraServicePrice[], ConceptExtraService[]                                                                                             | ✅                                     |

**Sonuç: İlişkiler genel olarak doğru ve tutarlı.** Cascade delete'ler alt tablolarda tanımlı.

---

## 2. Enum Listesi

| #   | Enum                | Değerler                                                                                                                                                        | Kullanan Model(ler)                                                                |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `Role`              | SYSTEM_ADMIN, ADMIN, CASINO_USER, FNB_USER                                                                                                                      | User.role, RoleDefinition.role                                                     |
| 2   | `CabanaStatus`      | AVAILABLE, RESERVED, CLOSED                                                                                                                                     | Cabana.status                                                                      |
| 3   | `ReservationStatus` | PENDING, APPROVED, REJECTED, CANCELLED, CHECKED_IN, CHECKED_OUT, MODIFICATION_PENDING, EXTRA_PENDING                                                            | Reservation.status, ReservationStatusHistory.fromStatus/toStatus                   |
| 4   | `RequestStatus`     | PENDING, APPROVED, REJECTED                                                                                                                                     | ModificationRequest.status, CancellationRequest.status, ExtraConceptRequest.status |
| 5   | `NotificationType`  | NEW_REQUEST, APPROVED, REJECTED, MODIFICATION_REQUEST, CANCELLATION_REQUEST, EXTRA_CONCEPT_REQUEST, EXTRA_ADDED, STATUS_CHANGED, CHECK_IN, CHECK_OUT, FNB_ORDER | Notification.type                                                                  |
| 6   | `DeviceType`        | DESKTOP, MOBILE, TABLET, UNKNOWN                                                                                                                                | LoginSession.deviceType                                                            |
| 7   | `VipLevel`          | STANDARD, SILVER, GOLD, PLATINUM                                                                                                                                | Guest.vipLevel                                                                     |
| 8   | `FnbOrderStatus`    | PREPARING, READY, DELIVERED, CANCELLED                                                                                                                          | FnbOrder.status                                                                    |
| 9   | `RecurringPattern`  | WEEKLY, BIWEEKLY, MONTHLY                                                                                                                                       | RecurringBooking.pattern                                                           |

**Not:** Tüm enum'lar en az bir modelde aktif olarak kullanılıyor. Kullanılmayan (orphan) enum yok.

---

## 3. Migration Geçmişi Özeti

| #   | Tarih            | Migration Adı                                     | Açıklama                             |
| --- | ---------------- | ------------------------------------------------- | ------------------------------------ |
| 1   | 26.02.2026 12:13 | `init`                                            | İlk schema oluşturma                 |
| 2   | 26.02.2026 12:33 | `add_product_groups`                              | Ürün grupları ekleme                 |
| 3   | 26.02.2026 15:47 | `add_soft_delete`                                 | Soft delete alanları                 |
| 4   | 26.02.2026 16:41 | `add_price_ranges_and_indexes`                    | Fiyat aralıkları & index'ler         |
| 5   | 26.02.2026 17:54 | `float_to_decimal`                                | Float → Decimal dönüşümü             |
| 6   | 26.02.2026 19:17 | `add_missing_indexes`                             | Eksik index'ler (1/2)                |
| 7   | 26.02.2026 19:17 | `add_missing_indexes`                             | ⚠️ **DUPLICATE İSİM** (14 dk arayla) |
| 8   | 26.02.2026 21:34 | `add_cabana_rotation`                             | Cabana rotasyon alanı                |
| 9   | 27.02.2026 00:31 | `add_login_sessions`                              | Oturum takibi tablosu                |
| 10  | 27.02.2026 01:01 | `add_product_price_history`                       | Ürün fiyat geçmişi                   |
| 11  | 27.02.2026 02:20 | `phase2_guest_checkin_fnb`                        | Misafir, check-in, F&B               |
| 12  | 27.02.2026 02:51 | `phase3_phase4_complete`                          | Phase 3 & 4 tamamlama                |
| 13  | 27.02.2026 04:44 | `remove_loyalty_system`                           | Sadakat sistemi kaldırma (1/2)       |
| 14  | 27.02.2026 04:44 | `remove_loyalty_system`                           | ⚠️ **DUPLICATE İSİM** (14 dk arayla) |
| 15  | 27.02.2026 04:55 | `add_concept_service_fee`                         | Konsept servis ücreti                |
| 16  | 27.02.2026 05:18 | `add_task_definitions`                            | Görev tanımları                      |
| 17  | 02.03.2026 00:14 | `add_cabana_scale`                                | Cabana ölçek alanı                   |
| 18  | 02.03.2026 03:28 | `add_cabana_dimensions_lock_color`                | Cabana boyut/kilit/renk              |
| 19  | 02.03.2026 11:28 | `add_guest_privacy`                               | Misafir gizlilik                     |
| 20  | 02.03.2026 16:47 | `add_role_definitions_permissions`                | Rol tanımları & yetkiler             |
| 21  | 02.03.2026 22:44 | `add_reservation_concept_id`                      | Rezervasyona konsept ID              |
| 22  | 03.03.2026 01:51 | `add_custom_requests_and_extra_items_json`        | Serbest talepler & JSON              |
| 23  | 03.03.2026 19:12 | `add_composite_indexes`                           | Composite index'ler                  |
| 24  | 03.03.2026 19:35 | `add_push_subscriptions`                          | Push bildirim abonelikleri           |
| 25  | 03.03.2026 21:42 | `add_service_points_extra_services_price_history` | Hizmet noktaları & ekstra hizmetler  |
| 26  | 03.03.2026 21:59 | `add_concept_extra_services`                      | Konsept-ekstra hizmet bağlantısı     |
| 27  | 03.03.2026 23:20 | `add_service_point_staff_and_fields`              | Hizmet noktası personel & alanlar    |
| 28  | 04.03.2026 03:18 | `add_cabana_daily_price`                          | Cabana günlük fiyat                  |
| 29  | 04.03.2026 04:06 | `simplify_pricing_remove_overrides_and_history`   | Fiyatlandırma basitleştirme          |

**Ek dosya:** `phase4_models.sql` — migration dışı ham SQL dosyası

**Migration Değerlendirmesi:**

- ⚠️ 2 adet **duplicate isimli** migration çifti (aynı ad, farklı timestamp)
- ⚠️ Kaldırılan modeller var ama schema'da yorum olarak bırakılmış (iyi pratik)
- ⚠️ 7 günde 29 migration — yoğun iterasyon dönemine işaret ediyor
- ✅ Migration'lar kronolojik ve tutarlı sırada
- ✅ İsimlendirme genel olarak açıklayıcı

---

## 4. Seed Dosyası Özeti

`seed.ts` (1320 satır) şunları oluşturuyor:

| Veri Tipi            | Detay                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Kullanıcılar**     | 4 kullanıcı: sysadmin (SYSTEM_ADMIN), admin (ADMIN), casino1 (CASINO_USER), fnb1 (FNB_USER)                      |
| **Yetkiler**         | 28 permission tanımı (CRUD × modül bazlı)                                                                        |
| **Rol Tanımları**    | 4 rol tanımı + her role varsayılan yetki ataması                                                                 |
| **Cabana Sınıfları** | 4: Standart, Premium, VIP, Aile                                                                                  |
| **Ürün Grupları**    | 5: İçecekler, Yiyecekler, Hizmetler, Eğlence & Aktivite, Spa & Wellness                                          |
| **Ürünler**          | 18 ürün (tüm gruplara dağılmış)                                                                                  |
| **Konseptler**       | 2: Temel Paket, Premium Paket (ürün ilişkileriyle)                                                               |
| **Cabanalar**        | 27 Cabana (25 standart + 2 VIP), koordinat & rotasyonlarla                                                       |
| **System Config**    | 7 kayıt: system_open_for_reservation, app_name, currency, default_concept_id, 2 bar transform, parasol transform |

**Seed Sorunları:**

- ⚠️ ExtraService seed verileri **yok** — schema'da model var ama seed'de yok
- ⚠️ ServicePoint seed verileri **yok**
- ⚠️ Staff seed verileri **yok**
- ⚠️ Guest seed verileri **yok** — test için en az 1 misafir gerekli
- ⚠️ Ürün fiyatları `number` olarak geçirilmiş (Prisma otomatik Decimal'e çevirir ama açık `new Decimal()` kullanımı daha güvenli)

---

## 5. Sorunlar ve Eksiklikler (Öncelik Sırasına Göre)

### 🔴 KRİTİK

| #   | Sorun                                                                                                             | Etkilenen Modeller                                               | Aksiyon                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | **`isDeleted` alanı eksik** — AGENTS.md kuralı `isDeleted + deletedAt` diyor, 7 model sadece `deletedAt` içeriyor | User, Cabana, Product, Reservation, Guest, TaskDefinition, Staff | Her birine `isDeleted Boolean @default(false)` ekle + migration  |
| 2   | **Soft delete tamamen eksik** — Ana varlık modelleri                                                              | CabanaClass, Concept, ProductGroup                               | `isDeleted + deletedAt` ekle — bu modeller silinebilir nitelikte |

### 🟡 ORTA

| #   | Sorun                                      | Etkilenen Modeller                                       | Aksiyon                                             |
| --- | ------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------- |
| 3   | **Duplicate migration isimleri**           | `add_missing_indexes` (×2), `remove_loyalty_system` (×2) | Squash veya temizlik önerilir                       |
| 4   | **Concept modeline index yok**             | Concept                                                  | `@@index([classId])` ekle                           |
| 5   | **User modeline `role` index'i yok**       | User                                                     | `@@index([role])` ekle — role bazlı sorgular yaygın |
| 6   | **updatedAt eksik (güncellenen modeller)** | Notification, LoginSession, WaitlistEntry, StaffTask     | Güncellenen alanlara sahip ama `updatedAt` yok      |
| 7   | **SystemConfig'te `createdAt` yok**        | SystemConfig                                             | `createdAt DateTime @default(now())` ekle           |
| 8   | **FnbOrderItem'da timestamp yok**          | FnbOrderItem                                             | En az `createdAt` eklenmeli                         |
| 9   | **Seed'de eksik test verileri**            | ExtraService, ServicePoint, Staff, Guest                 | Seed'e örnek veri ekle                              |

### 🟢 DÜŞÜK / İYİLEŞTİRME

| #   | Sorun                                               | Detay                                                                               |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 10  | `phase4_models.sql` migration dışı                  | migrations/ içinde raw SQL dosyası — migration chain'de yok                         |
| 11  | RolePermission onDelete tanımsız                    | RoleDefinition veya Permission silinirse ne olacağı belirsiz                        |
| 12  | RecurringBooking'de soft delete yok                 | Aktif olmayan booking'ler `isActive: false` ile yönetiliyor ama silme senaryosu yok |
| 13  | Review modeline soft delete yok                     | Yorum silinmek istenirse hard delete gerekir — kurala aykırı                        |
| 14  | Cabana `conceptId` opsiyonel ama FK constraint sıkı | Nullable FK doğru ama cascade eksik                                                 |

---

## 6. Genel Değerlendirme

| Kriter                          |    Puan    | Not                                                       |
| ------------------------------- | :--------: | --------------------------------------------------------- |
| Decimal/Float kuralına uyum     | **10/10**  | Tüm fiyatlar Decimal                                      |
| İlişki tasarımı                 |  **9/10**  | İlişkiler doğru, cascade'ler mantıklı                     |
| Index kapsamı                   |  **8/10**  | Çoğu modelde iyi, birkaç eksik                            |
| Soft delete tutarlılığı         |  **4/10**  | 7 modelde isDeleted eksik, 3 ana modelde tamamen yok      |
| createdAt/updatedAt tutarlılığı |  **7/10**  | Birçok güncellenebilir modelde updatedAt eksik            |
| Migration düzeni                |  **7/10**  | Kronolojik ama duplicate isimler var                      |
| Seed veri kapsamı               |  **6/10**  | Ana modeller var ama birçok yeni model eksik              |
| **GENEL**                       | **7.3/10** | Temel yapı sağlam, soft delete tutarlılığı en büyük sorun |
