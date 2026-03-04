# API Endpoint Analiz Raporu

**Proje:** Beach Resort Management (fabana)  
**Tarih:** Otomatik Analiz  
**Toplam Route Dosyası:** 96  
**Toplam HTTP Handler:** ~155+  
**Analiz Kriterleri:** Auth, Response Format, Soft Delete, logAudit, Error Handling, Input Validation, Genel Durum

---

## Kriter Açıklamaları

| Kriter | Beklenen (AGENTS.md) |
|--------|---------------------|
| **Auth** | `withAuth()` wrapper + roller + `requiredPermissions` |
| **Response Format** | `{ success, data, error }` |
| **Soft Delete** | `isDeleted` + `deletedAt` alanları, hard delete YASAK |
| **logAudit** | Mutation işlemlerinde `logAudit()` fonksiyonu kullanılmalı |
| **Error Handling** | `try/catch` blokları |
| **Input Validation** | Zod veya manual validation (POST/PATCH/PUT body'lerde) |

**Durum Kodları:**
- ✅ **ÇALIŞIYOR** — Tüm kritik kriterler sağlanıyor
- ⚠️ **EKSİK** — Bazı kriterler eksik ama kritik hata yok
- ❌ **HATALI** — AGENTS.md kurallarını ihlal eden kritik hata var

---

## Detaylı Endpoint Tablosu

### 1. Auth Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 1 | `auth/[...nextauth]` | GET, POST | NextAuth handler (beklenen) | NextAuth yönetimli | N/A | N/A | NextAuth | NextAuth | ✅ ÇALIŞIYOR |
| 2 | `auth/token` | GET | ❌ Manual `getAuthSession()` — withAuth YOK | ❌ `{token}` | N/A | N/A | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 3 | `auth/sessions` | GET | ✅ withAuth(SYSTEM_ADMIN) | ❌ `{sessions,total}` | N/A | N/A | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 4 | `auth/permissions` | GET | ✅ withAuth(ALL_ROLES) | ✅ `{success,data,error}` | N/A | N/A | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 5 | `auth/heartbeat` | POST | ❌ Manual `getAuthSession()` | ❌ `{ok:true}` | N/A | N/A | ✅ try/catch | N/A | ⚠️ EKSİK |
| 6 | `auth/login-track` | POST | ❌ Manual `getAuthSession()` | ❌ `{sessionId}` | N/A | ✅ logAudit | ✅ try/catch | N/A | ⚠️ EKSİK |
| 7 | `auth/logout-track` | POST | ❌ Manual `getAuthSession()` | ⚠️ `{success:true}` partial | N/A | ✅ logAudit | ✅ try/catch | N/A | ⚠️ EKSİK |

### 2. Admin / System-Admin Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 8 | `admin/stats` | GET | ✅ withAuth(ADMIN,SYS_ADMIN), perm:report.view | ❌ Raw JSON | N/A | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 9 | `system-admin/stats` | GET | ✅ withAuth(SYS_ADMIN), perm:report.view | ❌ Raw JSON | ✅ deletedAt:null | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 10 | `system-admin/permissions` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:role.definition.view | ✅ `{success,data,error}` | ✅ isDeleted:false | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 11 | `system-admin/role-definitions` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:role.definition.view | ✅ `{success,data,error}` | ✅ isDeleted:false | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 12 | `system-admin/role-definitions` | POST | ✅ withAuth(SYS_ADMIN), perm:role.definition.create | ✅ `{success,data,error}` | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ✅ ÇALIŞIYOR |
| 13 | `system-admin/role-definitions/[id]` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm | ✅ `{success,data,error}` | ✅ isDeleted:false | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 14 | `system-admin/role-definitions/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), perm:role.definition.update | ✅ `{success,data,error}` | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ✅ ÇALIŞIYOR |
| 15 | `system-admin/role-definitions/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), perm:role.definition.delete | N/A | ✅ **SOFT DELETE** (isDeleted+cascade) | ✅ logAudit | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 16 | `system-admin/role-definitions/[id]/permissions` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm | ✅ `{success,data,error}` | N/A | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 17 | `system-admin/role-definitions/[id]/permissions` | PUT | ✅ withAuth(SYS_ADMIN), perm:role.definition.update | ✅ `{success,data,error}` | ✅ Soft delete on links | ✅ logAudit | ✅ withAuth | ✅ zod | ✅ ÇALIŞIYOR |

### 3. System Config Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 18 | `system/config` | GET | ✅ withAuth(ALL), perm:system.config.view | ❌ `{isOpen}` | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 19 | `system/config` | PATCH | ✅ withAuth(SYS_ADMIN), perm:system.config.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ Manual | ⚠️ EKSİK |
| 20 | `system/cancellation-policy` | GET | ✅ withAuth(SYS_ADMIN), perm:system.config.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 21 | `system/cancellation-policy` | PUT | ✅ withAuth(SYS_ADMIN), perm:system.config.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ isValidPolicy() | ⚠️ EKSİK |
| 22 | `system/reservation-status` | GET | ✅ withAuth(ALL), perm:system.config.view | ❌ `{cabanas}` | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 23 | `system/reservation-status` | PATCH | ✅ withAuth(SYS_ADMIN), perm:system.config.update | ❌ Raw JSON | N/A | ❌ logAudit YOK | ✅ withAuth | ✅ Manual | ❌ HATALI |
| 24 | `system/modules` | GET | ✅ withAuth(ALL), perm:system.config.view | ❌ Raw config object | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 25 | `system/modules` | PUT | ✅ withAuth(SYS_ADMIN), perm:system.config.update | ❌ Raw config object | N/A | ✅ logAudit | ✅ withAuth | ✅ isValidConfig() | ⚠️ EKSİK |
| 26 | `system/public-config` | GET | ⚠️ Auth YOK (public endpoint) | ✅ `{success,data,error}` | N/A | N/A (read) | ⚠️ try/catch YOK | N/A | ⚠️ EKSİK |

### 4. Cabana Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 27 | `cabanas` | GET | ✅ withAuth(ALL), perm:map.view | ❌ Raw JSON | N/A | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 28 | `cabanas` | POST | ✅ withAuth(SYS_ADMIN), perm:map.update | ❌ Raw JSON | N/A | ✅ logAudit | ❌ try/catch YOK | ✅ zod | ⚠️ EKSİK |
| 29 | `cabanas/[id]` | GET | ✅ withAuth(ALL), perm:map.view | ❌ Raw JSON | N/A | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 30 | `cabanas/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), perm:map.update | ❌ Raw JSON | N/A | ✅ logAudit | ❌ try/catch YOK | ✅ zod | ⚠️ EKSİK |
| 31 | `cabanas/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), perm:map.update | ❌ **HARD DELETE** | ❌ **HARD DELETE** | ✅ logAudit | ❌ try/catch YOK | N/A | ❌ HATALI |
| 32 | `cabanas/[id]/location` | PATCH | ✅ withAuth(SYS_ADMIN), perm:map.update | ❌ Raw JSON | N/A | ❌ logAudit YOK | ✅ try/catch | ✅ zod | ⚠️ EKSİK |
| 33 | `cabanas/[id]/qr` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 34 | `cabanas/[id]/status` | PATCH | ✅ withAuth(SYS_ADMIN), perm:system.config.update | ❌ Raw JSON | N/A | ❌ logAudit YOK | ✅ try/catch | ✅ zod | ⚠️ EKSİK |

### 5. Reservation Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 35 | `reservations` | GET | ✅ withAuth(ALL), perm:reservation.view | ❌ Raw JSON | ✅ deletedAt | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 36 | `reservations` | POST | ✅ withAuth(CASINO), perm:reservation.create | ❌ Raw JSON (201) | N/A | ✅ logAudit | ✅ try/catch | ✅ parseBody | ⚠️ EKSİK |
| 37 | `reservations/calendar` | GET | ✅ withAuth(ALL), perm:reservation.view | ✅ `{success,data}` | ✅ deletedAt | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 38 | `reservations/[id]` | GET | ✅ withAuth(ALL), perm:reservation.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A (IDOR ✅) | ⚠️ EKSİK |
| 39 | `reservations/[id]/approve` | POST | ✅ withAuth(ADMIN,SYS_ADMIN), perm:reservation.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ Status check | ⚠️ EKSİK |
| 40 | `reservations/[id]/reject` | POST | ✅ withAuth(ADMIN,SYS_ADMIN), perm:reservation.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 41 | `reservations/[id]/check-in` | POST | ✅ withAuth(ADMIN,SYS_ADMIN), perm:reservation.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ Status check | ⚠️ EKSİK |
| 42 | `reservations/[id]/check-out` | POST | ✅ withAuth(ADMIN,SYS_ADMIN), perm:reservation.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ Status check | ⚠️ EKSİK |
| 43 | `reservations/[id]/pending-update` | PATCH | ✅ withAuth(CASINO), perm:reservation.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod, IDOR | ⚠️ EKSİK |
| 44 | `reservations/[id]/cancellations` | POST | ✅ withAuth(CASINO), perm:reservation.delete | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody, IDOR | ⚠️ EKSİK |
| 45 | `reservations/[id]/modifications` | POST | ✅ withAuth(CASINO), perm:reservation.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody, IDOR | ⚠️ EKSİK |
| 46 | `reservations/[id]/extra-concepts` | POST | ✅ withAuth(CASINO), perm:reservation.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody, IDOR | ⚠️ EKSİK |
| 47 | `reservations/[id]/extras` | GET | ✅ withAuth(FNB,ADMIN,SYS_ADMIN), perm:reservation.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 48 | `reservations/[id]/extras` | POST | ✅ withAuth(FNB,ADMIN,SYS_ADMIN), perm:fnb.order.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 49 | `reservations/[id]/custom-request-price` | PATCH | ✅ withAuth(ADMIN,SYS_ADMIN), perm:reservation.update | ⚠️ `{success,data}` partial | ✅ deletedAt check | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |

### 6. Guest Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 50 | `guests` | GET | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | ✅ deletedAt:null | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 51 | `guests` | POST | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 52 | `guests/[id]` | GET | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 53 | `guests/[id]` | PATCH | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 54 | `guests/[id]` | DELETE | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | ❌ **HARD DELETE** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |
| 55 | `guests/search` | GET | ✅ withAuth(ALL), ❌ perm YOK | ✅ `{success,data}` | ✅ deletedAt:null | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 56 | `guests/[id]/history` | GET | ✅ withAuth(ALL), ❌ perm YOK | ✅ `{success,data}` | ✅ deletedAt:null | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |

### 7. Product / Pricing Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 57 | `products` | GET | ✅ withAuth(ALL), perm:product.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 58 | `products` | POST | ✅ withAuth(SYS_ADMIN), perm:product.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 59 | `products/[id]` | GET | ✅ withAuth(ALL), perm:product.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 60 | `products/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), perm:product.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 61 | `products/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), perm:product.delete | ❌ **HARD DELETE** | ❌ **HARD DELETE** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |
| 62 | `products/import` | POST | ✅ withAuth(SYS_ADMIN), perm:product.create | ❌ `{items,summary}` | N/A | ✅ logAudit (çoklu) | ✅ withAuth | ✅ File validation | ⚠️ EKSİK |
| 63 | `product-groups` | GET | ✅ withAuth(ALL), perm:product.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 64 | `product-groups` | POST | ✅ withAuth(SYS_ADMIN), perm:product.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 65 | `product-groups/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 66 | `product-groups/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | ❌ **HARD DELETE** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |
| 67 | `pricing/cabana-daily-prices` | GET | ✅ withAuth(ADMIN,SYS_ADMIN), perm:pricing.view | ✅ `{success,data}` | ✅ deletedAt:null | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 68 | `pricing/calculated-default` | GET | ✅ withAuth(ADMIN,SYS_ADMIN), perm:pricing.view | ✅ `{success,data}` | N/A | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 69 | `pricing/preview` | POST | ✅ withAuth(ADMIN,SYS_ADMIN), perm:pricing.view | ❌ Raw breakdown | N/A | N/A (hesaplama) | ✅ withAuth | ✅ zod | ⚠️ EKSİK |

### 8. Class / Concept / Extra-Service Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 70 | `classes` | GET | ✅ withAuth(ALL), perm:concept.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 71 | `classes` | POST | ✅ withAuth(SYS_ADMIN), perm:concept.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 72 | `classes/[id]` | GET | ✅ withAuth(SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 73 | `classes/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 74 | `classes/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | ❌ **HARD DELETE** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |
| 75 | `classes/[id]/attributes` | POST | ✅ withAuth(SYS_ADMIN), perm:concept.update | ❌ Raw JSON | N/A | ❌ logAudit YOK | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 76 | `classes/[id]/attributes/[attrId]` | DELETE | ✅ withAuth(SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | ❌ **HARD DELETE** | ❌ logAudit YOK | ✅ withAuth | N/A | ❌ HATALI |
| 77 | `concepts` | GET | ✅ withAuth(ALL), perm:concept.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 78 | `concepts` | POST | ✅ withAuth(SYS_ADMIN), perm:concept.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 79 | `concepts/[id]` | GET | ✅ withAuth(ALL), perm:concept.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 80 | `concepts/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), perm:concept.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 81 | `concepts/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), perm:concept.delete | ❌ Raw JSON | ❌ **HARD DELETE** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |
| 82 | `concepts/[id]/extra-services` | POST, PATCH | ✅ withAuth(SYS_ADMIN), perm:concept.update | ✅ `{success,data}` | N/A | N/A | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 83 | `concepts/[id]/products` | POST, PATCH, DELETE | ✅ withAuth(SYS_ADMIN), perm:concept.update | ❌ Raw JSON | N/A | ❌ logAudit YOK | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 84 | `extra-services` | GET | ✅ withAuth(ALL), perm:concept.view | ✅ `{success,data}` | ✅ isDeleted:false | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 85 | `extra-services` | POST | ✅ withAuth(SYS_ADMIN), perm:concept.create | ✅ `{success,data}` | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ✅ ÇALIŞIYOR |
| 86 | `extra-services/[id]` | GET | ✅ withAuth(ALL), perm:concept.view | ✅ `{success,data}` | ✅ isDeleted:false | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 87 | `extra-services/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), perm:concept.update | ✅ `{success,data}` | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ✅ ÇALIŞIYOR |

### 9. FNB (Food & Beverage) Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 88 | `fnb/orders` | GET | ✅ withAuth(FNB,ADMIN,SYS_ADMIN), perm:fnb.order.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 89 | `fnb/orders` | POST | ✅ withAuth(FNB,ADMIN,SYS_ADMIN), perm:fnb.order.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 90 | `fnb/orders/[id]` | PATCH | ✅ withAuth(FNB,ADMIN,SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 91 | `fnb/orders/[id]` | DELETE | ✅ withAuth(FNB,ADMIN,SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | ✅ status=CANCELLED (soft cancel) | ✅ logAudit | ✅ withAuth | N/A | ⚠️ EKSİK |

### 10. Staff / Task Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 92 | `staff` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.view | ❌ Raw JSON | ✅ deletedAt:null | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 93 | `staff` | POST | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 94 | `staff/[id]` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 95 | `staff/[id]` | PATCH | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 96 | `staff/[id]` | DELETE | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.delete | N/A | ✅ **SOFT DELETE** | ✅ logAudit | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 97 | `staff/assignments` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 98 | `staff/assignments` | POST | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 99 | `staff/assignments/bulk` | POST | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.create | ✅ `{success,data}` | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ✅ ÇALIŞIYOR |
| 100 | `staff/tasks` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 101 | `staff/tasks` | POST | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 102 | `staff/tasks/[id]` | PATCH | ✅ withAuth(SYS_ADMIN,ADMIN), perm:staff.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | N/A | ⚠️ EKSİK |
| 103 | `task-definitions` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:task.definition.view | ❌ `{items,total}` | ✅ deletedAt:null | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 104 | `task-definitions` | POST | ✅ withAuth(SYS_ADMIN,ADMIN), perm:task.definition.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 105 | `task-definitions/[id]` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:task.definition.view | ❌ Raw JSON | ✅ deletedAt check | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 106 | `task-definitions/[id]` | PATCH | ✅ withAuth(SYS_ADMIN,ADMIN), perm:task.definition.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ⚠️ EKSİK |
| 107 | `task-definitions/[id]` | DELETE | ✅ withAuth(SYS_ADMIN,ADMIN), perm:task.definition.delete | N/A | ✅ **SOFT DELETE** (deletedAt + isActive:false) | ✅ logAudit | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |

### 11. Service Point Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 108 | `service-points` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:service.point.view | ✅ `{success,data}` | ✅ isDeleted:false | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 109 | `service-points` | POST | ✅ withAuth(SYS_ADMIN), perm:service.point.create | ✅ `{success,data}` | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ✅ ÇALIŞIYOR |
| 110 | `service-points/[id]` | GET | ✅ withAuth(SYS_ADMIN), perm:service.point.view | ✅ `{success,data}` | ✅ isDeleted:false | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 111 | `service-points/[id]` | PATCH | ✅ withAuth(SYS_ADMIN), perm:service.point.update | ✅ `{success,data}` | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ✅ ÇALIŞIYOR |
| 112 | `service-points/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), perm:service.point.delete | N/A | ✅ **SOFT DELETE** | ✅ logAudit | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 113 | `service-points/[id]/staff` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:service.point.view | ✅ `{success,data}` | N/A | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 114 | `service-points/[id]/staff` | POST | ✅ withAuth(SYS_ADMIN), perm:system.config.update | ✅ `{success,data}` | N/A | ✅ logAudit | ✅ withAuth | ✅ zod | ✅ ÇALIŞIYOR |
| 115 | `service-points/[id]/staff` | DELETE | ✅ withAuth(SYS_ADMIN), perm:system.config.update | ✅ `{success,data}` | ⚠️ HARD DELETE (join table) | ✅ logAudit | ✅ withAuth | N/A | ⚠️ EKSİK |

### 12. User Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 116 | `users` | GET | ✅ withAuth(SYS_ADMIN,ADMIN), perm:user.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 117 | `users` | POST | ✅ withAuth(SYS_ADMIN,ADMIN), perm:user.create | ❌ Raw JSON | N/A | ❌ `prisma.auditLog.create` (logAudit DEĞİL) | ✅ withAuth | ✅ zod | ❌ HATALI |
| 118 | `users/[id]` | PATCH | ✅ withAuth(SYS_ADMIN,ADMIN), perm:user.update | ❌ Raw JSON | N/A | ❌ `prisma.auditLog.create` (logAudit DEĞİL) | ✅ withAuth | ✅ zod | ❌ HATALI |
| 119 | `users/[id]` | DELETE | ✅ withAuth(SYS_ADMIN,ADMIN), perm:user.delete | N/A | ✅ isActive:false (deactivation) | ❌ `prisma.auditLog.create` (logAudit DEĞİL) | ✅ withAuth | N/A | ⚠️ EKSİK |

### 13. Review Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 120 | `reviews` | GET | ✅ withAuth(ALL), perm:review.view | ❌ `{data,pagination}` | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 121 | `reviews` | POST | ✅ withAuth(CASINO), perm:review.create | ❌ Raw JSON | N/A | ❌ logAudit entity YANLIŞ ("Reservation" → "Review") | ✅ withAuth | ✅ parseBody | ❌ HATALI |
| 122 | `reviews/[id]` | PATCH | ✅ withAuth(CASINO), perm:review.update | ❌ Raw JSON | N/A | ❌ logAudit entity YANLIŞ ("Reservation" → "Review") | ✅ withAuth | ✅ parseBody | ❌ HATALI |
| 123 | `reviews/[id]` | DELETE | ✅ withAuth(CASINO,ADMIN,SYS_ADMIN), perm:review.delete | ❌ **HARD DELETE** | ❌ **HARD DELETE** | ❌ logAudit entity YANLIŞ | ✅ withAuth | N/A | ❌ HATALI |

### 14. Notification Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 124 | `notifications` | GET | ✅ withAuth(ALL), ❌ perm YOK | ❌ Mixed response | N/A | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 125 | `notifications` | PATCH | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | N/A | ❌ logAudit YOK | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 126 | `notifications/[id]/read` | PATCH | ✅ withAuth(ALL), ❌ perm YOK | ⚠️ `{success:true}` partial | N/A | ❌ logAudit YOK | ✅ withAuth | N/A | ⚠️ EKSİK |

### 15. Report Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 127 | `reports/generate` | POST | ✅ withAuth(SYS_ADMIN), perm:report.view | ⚠️ File download (uygun) | N/A | ❌ logAudit YOK | ✅ try/catch | ✅ zod | ⚠️ EKSİK |
| 128 | `reports/presentation/slidev` | POST | ✅ withAuth(SYS_ADMIN), perm:report.view | ⚠️ File download (md/html/pdf) | N/A | ❌ logAudit YOK | ✅ try/catch | ⚠️ Manual | ⚠️ EKSİK |
| 129 | `reports/presentation/preview/slidev` | GET | ✅ withAuth(SYS_ADMIN), perm:report.view | ❌ `{markdown,slideCount,...}` | N/A | N/A (read) | ✅ try/catch | N/A | ⚠️ EKSİK |

### 16. Map / Weather / Casino Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 130 | `map/elevation` | GET | ✅ withAuth(ALL), perm:map.view | ✅ `{success,data}` | N/A | N/A (read) | ✅ withAuth | N/A | ✅ ÇALIŞIYOR |
| 131 | `map/elevation` | POST | ✅ withAuth(SYS_ADMIN), perm:map.update | ✅ `{success,data}` | N/A | ❌ `prisma.auditLog.create` (logAudit DEĞİL) | ✅ withAuth | ✅ zod | ❌ HATALI |
| 132 | `map/elevation` | DELETE | ✅ withAuth(SYS_ADMIN), perm:map.update | ✅ `{success,data}` | ❌ **HARD DELETE** | ❌ `prisma.auditLog.create` (logAudit DEĞİL) | ✅ withAuth | N/A | ❌ HATALI |
| 133 | `weather` | GET | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | N/A | N/A (read) | ✅ Internal try/catch | N/A | ⚠️ EKSİK |
| 134 | `weather/forecast` | GET | ✅ withAuth(ALL), ❌ perm YOK | ❌ Raw JSON | N/A | N/A (read) | ✅ Internal try/catch | N/A | ⚠️ EKSİK |
| 135 | `casino/stats` | GET | ✅ withAuth(CASINO), ❌ perm YOK | ❌ Raw JSON | ✅ deletedAt:null | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |

### 17. Miscellaneous Endpoints

| # | Endpoint | Method | Auth | Response Format | Soft Delete | logAudit | Error Handling | Validation | Durum |
|---|----------|--------|------|-----------------|-------------|----------|----------------|------------|-------|
| 136 | `audit-logs` | GET | ✅ withAuth(SYS_ADMIN), perm:audit.view | ❌ `{logs,total}` | N/A | N/A (read) | ❌ try/catch YOK | N/A | ⚠️ EKSİK |
| 137 | `blackout-dates` | GET | ✅ withAuth(ADMIN,SYS_ADMIN), perm:pricing.view | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 138 | `blackout-dates` | POST | ✅ withAuth(SYS_ADMIN), perm:pricing.update | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 139 | `blackout-dates/[id]` | DELETE | ✅ withAuth(SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | ❌ **HARD DELETE (raw SQL)** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |
| 140 | `csp-report` | POST | ⚠️ Auth YOK (CSP endpoint — beklenen) | ❌ `{ok:true}` | N/A | N/A | ✅ try/catch | N/A | ✅ ÇALIŞIYOR |
| 141 | `health` | GET | ⚠️ Auth YOK (health check — beklenen) | ✅ `{success,data}` | N/A | N/A | ✅ try/catch | N/A | ✅ ÇALIŞIYOR |
| 142 | `push/subscribe` | POST | ❌ Manual `getAuthSession()` | ✅ `{success,data}` | N/A | ❌ logAudit YOK | ✅ try/catch | ✅ body check | ⚠️ EKSİK |
| 143 | `push/subscribe` | DELETE | ❌ Manual `getAuthSession()` | ✅ `{success}` | N/A | ❌ logAudit YOK | ✅ try/catch | N/A | ⚠️ EKSİK |
| 144 | `sse` | GET | ⚠️ Manual auth (SSE — kabul edilebilir) | N/A (streaming) | N/A | N/A | ✅ | N/A | ✅ ÇALIŞIYOR |
| 145 | `profile` | GET | ✅ withAuth(ALL) | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 146 | `profile` | PATCH | ✅ withAuth(ALL) | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ Manual | ⚠️ EKSİK |
| 147 | `recurring-bookings` | GET | ✅ withAuth(CASINO,ADMIN,SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 148 | `recurring-bookings` | POST | ✅ withAuth(CASINO,ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 149 | `recurring-bookings/[id]` | PATCH | ✅ withAuth(CASINO,ADMIN,SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 150 | `recurring-bookings/[id]` | DELETE | ✅ withAuth(CASINO,ADMIN,SYS_ADMIN), ❌ perm YOK | ❌ Raw JSON | ❌ **HARD DELETE (raw SQL)** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |
| 151 | `waitlist` | GET | ✅ withAuth(CASINO,ADMIN,SYS_ADMIN), perm:reservation.view | ❌ `{items,total}` | N/A | N/A (read) | ✅ withAuth | N/A | ⚠️ EKSİK |
| 152 | `waitlist` | POST | ✅ withAuth(CASINO,ADMIN), perm:reservation.create | ❌ Raw JSON | N/A | ✅ logAudit | ✅ withAuth | ✅ parseBody | ⚠️ EKSİK |
| 153 | `waitlist/[id]` | DELETE | ✅ withAuth(CASINO,ADMIN,SYS_ADMIN), perm:reservation.delete | ⚠️ `{success:true}` partial | ❌ **HARD DELETE (raw SQL)** | ✅ logAudit | ✅ withAuth | N/A | ❌ HATALI |

---

## Özet İstatistikler

### Genel Durum Dağılımı

| Durum | Sayı | Oran |
|-------|------|------|
| ✅ **ÇALIŞIYOR** | 33 | %21.6 |
| ⚠️ **EKSİK** | 101 | %66.0 |
| ❌ **HATALI** | 19 | %12.4 |
| **TOPLAM** | **153** | **100%** |

### Kriter Bazlı Uyumluluk

| Kriter | Uyumlu | Uyumsuz | Uyum Oranı |
|--------|--------|---------|------------|
| **Auth (withAuth)** | ~140 | ~8 (manual auth) + 3 (public, beklenen) | %92 |
| **requiredPermissions** | ~108 | ~42 (eksik) | %72 |
| **Response Format** | ~35 | ~118 | %23 |
| **Soft Delete** | ~12 | ~15 (hard delete) | İhlal: 15 endpoint |
| **logAudit()** (mutasyonlarda) | ~58 | ~12 (eksik/yanlış) | %83 |
| **Error Handling** | ~135 (withAuth+try/catch) | ~18 | %88 |
| **Input Validation** | ~55 | ~5 (eksik) | %92 |

---

## Kritik Bulgular (Öncelikli Düzeltme)

### 🔴 1. HARD DELETE İhlalleri (AGENTS.md: "hard delete YASAK")

15 endpoint'te `prisma.*.delete()` veya raw SQL `DELETE FROM` kullanılıyor:

| Endpoint | Silme Yöntemi |
|----------|---------------|
| `cabanas/[id]` DELETE | `prisma.cabana.delete()` |
| `classes/[id]` DELETE | `prisma.cabanaClass.delete()` |
| `classes/[id]/attributes/[attrId]` DELETE | `prisma.classAttribute.delete()` |
| `concepts/[id]` DELETE | `prisma.concept.delete()` |
| `guests/[id]` DELETE | `prisma.guest.delete()` |
| `products/[id]` DELETE | `prisma.product.delete()` |
| `product-groups/[id]` DELETE | `prisma.productGroup.delete()` |
| `reviews/[id]` DELETE | `prisma.review.delete()` |
| `blackout-dates/[id]` DELETE | Raw SQL: `DELETE FROM blackout_dates` |
| `recurring-bookings/[id]` DELETE | Raw SQL: `DELETE FROM recurring_bookings` |
| `waitlist/[id]` DELETE | Raw SQL: `DELETE FROM waitlist_entries` |
| `map/elevation` DELETE | `prisma.mapElevation.delete()` |
| `service-points/[id]/staff` DELETE | `prisma.servicePointStaff.delete()` (join table) |

**Çözüm:** Tüm modellere `isDeleted` + `deletedAt` alanları ekle, `delete()` → `update({ isDeleted: true, deletedAt: new Date() })` olarak değiştir.

### 🔴 2. logAudit Bypass (prisma.auditLog.create doğrudan kullanımı)

3 route dosyasında `logAudit()` fonksiyonu yerine doğrudan `prisma.auditLog.create()` kullanılıyor:

| Dosya | Methodlar |
|-------|-----------|
| `users/route.ts` | POST |
| `users/[id]/route.ts` | PATCH, DELETE |
| `map/elevation/route.ts` | POST, DELETE |

**Çözüm:** `prisma.auditLog.create()` çağrılarını `logAudit()` ile değiştir.

### 🔴 3. Yanlış Entity Adı (reviews)

`reviews/route.ts` ve `reviews/[id]/route.ts` dosyalarında logAudit entity değeri `"Reservation"` olarak yanlış yazılmış. Doğrusu `"Review"` olmalı.

### 🟡 4. Response Format Tutarsızlığı (~%77 uyumsuz)

Proje standardı `{ success, data, error }` formatı gerektiriyor ancak endpoint'lerin büyük çoğunluğu raw JSON döndürüyor.

**Doğru format kullanan endpoint grupları:**
- `auth/permissions`
- `extra-services/*`
- `service-points/*`
- `system-admin/role-definitions/*`
- `system-admin/permissions`
- `pricing/cabana-daily-prices`, `pricing/calculated-default`
- `reservations/calendar`
- `guests/search`, `guests/[id]/history`
- `map/elevation`
- `health`
- `push/subscribe`
- `staff/assignments/bulk`
- `concepts/[id]/extra-services`
- `system/public-config`

### 🟡 5. Manual Auth Kullanımı (withAuth wrapper eksik)

| Endpoint | Mevcut Durum |
|----------|-------------|
| `auth/token` | `getAuthSession()` manual |
| `auth/heartbeat` | `getAuthSession()` manual |
| `auth/login-track` | `getAuthSession()` manual |
| `auth/logout-track` | `getAuthSession()` manual |
| `push/subscribe` (POST, DELETE) | `getAuthSession()` manual |

### 🟡 6. Eksik requiredPermissions (~42 handler)

`withAuth()` kullanılıyor ancak `requiredPermissions` parametresi verilmemiş:
- `guests/*` (tüm endpoint'ler)
- `notifications/*` (tüm endpoint'ler)
- `fnb/orders/[id]` (PATCH, DELETE)
- `classes/[id]` (GET, PATCH, DELETE)
- `classes/[id]/attributes/[attrId]` (DELETE)
- `product-groups/[id]` (PATCH, DELETE)
- `recurring-bookings/*` (tüm endpoint'ler)
- `weather/*`, `casino/stats`
- `blackout-dates/[id]` (DELETE)
- `cabanas/[id]/qr` (GET)

### 🟡 7. Eksik try/catch (withAuth dışında hata yakalama yok)

| Endpoint | Risk |
|----------|------|
| `admin/stats` GET | Unhandled DB error |
| `audit-logs` GET | Unhandled DB error |
| `auth/token` GET | Unhandled error |
| `auth/sessions` GET | Unhandled DB error |
| `cabanas/*` (çoğu) | Unhandled DB error |
| `casino/stats` GET | Unhandled DB error |
| `notifications` GET, PATCH | Unhandled DB error |
| `system-admin/stats` GET | Unhandled DB error |

> Not: `withAuth()` wrapper'ın kendisi bir miktar hata yakalama sağlıyor olabilir ancak açık try/catch olmaması best practice'e uygun değildir.

---

## Model Endpoint'ler (Referans: En İyi Uygulamalar)

Bu endpoint'ler tüm kriterleri karşılayan **model implementasyonlar** olarak referans alınabilir:

1. **`system-admin/role-definitions/*`** — Tam uyumlu: withAuth + permissions + {success,data,error} + soft delete + logAudit
2. **`extra-services/*`** — Tam uyumlu: withAuth + permissions + {success,data,error} + isDeleted:false + logAudit + zod
3. **`service-points/*`** — Tam uyumlu: withAuth + permissions + {success,data,error} + soft delete + logAudit + zod
4. **`pricing/cabana-daily-prices`** — Doğru response format + deletedAt filter
5. **`staff/assignments/bulk`** — Doğru response format + zod + logAudit

---

## Önerilen Düzeltme Önceliği

| Öncelik | Aksiyon | Etkilenen Endpoint Sayısı |
|---------|---------|---------------------------|
| 🔴 **P0** | Hard delete → Soft delete dönüşümü | 15 |
| 🔴 **P0** | `prisma.auditLog.create` → `logAudit()` | 5 handler (3 dosya) |
| 🔴 **P0** | reviews logAudit entity düzeltmesi | 3 handler (2 dosya) |
| 🟡 **P1** | Response format standardizasyonu `{success,data,error}` | ~118 handler |
| 🟡 **P1** | Eksik `requiredPermissions` eklenmesi | ~42 handler |
| 🟡 **P2** | Manual auth → withAuth dönüşümü | 6 handler |
| 🟡 **P2** | Eksik try/catch eklenmesi | ~18 handler |
| 🔵 **P3** | Eksik logAudit (mutation'larda) | ~8 handler |
| 🔵 **P3** | system/reservation-status PATCH logAudit eklenmesi | 1 handler |
