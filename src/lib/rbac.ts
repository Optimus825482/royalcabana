import { Role, MODULE_ACCESS } from "@/types";

const ALL_PROTECTED_PATHS = Object.values(MODULE_ACCESS).flat();

export interface PermissionTemplate {
  key: string;
  name: string;
  module: string;
  action: "view" | "create" | "update" | "delete";
  description?: string;
}

export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  // ── Cabana Sınıfları ──
  {
    key: "cabana.class.view",
    name: "Cabana sınıflarını görüntüle",
    module: "Cabana Sınıfları",
    action: "view",
  },
  {
    key: "cabana.class.create",
    name: "Cabana sınıfı oluştur",
    module: "Cabana Sınıfları",
    action: "create",
  },
  {
    key: "cabana.class.update",
    name: "Cabana sınıfı güncelle",
    module: "Cabana Sınıfları",
    action: "update",
  },
  {
    key: "cabana.class.delete",
    name: "Cabana sınıfı sil",
    module: "Cabana Sınıfları",
    action: "delete",
  },
  // ── Konseptler ──
  {
    key: "concept.view",
    name: "Konseptleri görüntüle",
    module: "Konseptler",
    action: "view",
  },
  {
    key: "concept.create",
    name: "Konsept oluştur",
    module: "Konseptler",
    action: "create",
  },
  {
    key: "concept.update",
    name: "Konsept güncelle",
    module: "Konseptler",
    action: "update",
  },
  {
    key: "concept.delete",
    name: "Konsept sil",
    module: "Konseptler",
    action: "delete",
  },
  // ── Ürünler ──
  {
    key: "product.view",
    name: "Ürünleri görüntüle",
    module: "Ürünler",
    action: "view",
  },
  {
    key: "product.create",
    name: "Ürün oluştur",
    module: "Ürünler",
    action: "create",
  },
  {
    key: "product.update",
    name: "Ürün güncelle",
    module: "Ürünler",
    action: "update",
  },
  {
    key: "product.delete",
    name: "Ürün sil",
    module: "Ürünler",
    action: "delete",
  },
  // ── Görev Tanımları ──
  {
    key: "task.definition.view",
    name: "Görev tanımlarını görüntüle",
    module: "Görev Tanımları",
    action: "view",
  },
  {
    key: "task.definition.create",
    name: "Görev tanımı oluştur",
    module: "Görev Tanımları",
    action: "create",
  },
  {
    key: "task.definition.update",
    name: "Görev tanımı güncelle",
    module: "Görev Tanımları",
    action: "update",
  },
  {
    key: "task.definition.delete",
    name: "Görev tanımı sil",
    module: "Görev Tanımları",
    action: "delete",
  },
  // ── Kullanıcı Yönetimi ──
  {
    key: "user.view",
    name: "Kullanıcıları görüntüle",
    module: "Kullanıcı Yönetimi",
    action: "view",
  },
  {
    key: "user.create",
    name: "Kullanıcı oluştur",
    module: "Kullanıcı Yönetimi",
    action: "create",
  },
  {
    key: "user.update",
    name: "Kullanıcı güncelle",
    module: "Kullanıcı Yönetimi",
    action: "update",
  },
  {
    key: "user.delete",
    name: "Kullanıcıyı devre dışı bırak",
    module: "Kullanıcı Yönetimi",
    action: "delete",
  },
  // ── Rol Tanımları ──
  {
    key: "role.definition.view",
    name: "Rol tanımlarını görüntüle",
    module: "Rol Tanımları",
    action: "view",
  },
  {
    key: "role.definition.create",
    name: "Rol tanımı oluştur",
    module: "Rol Tanımları",
    action: "create",
  },
  {
    key: "role.definition.update",
    name: "Rol tanımı güncelle",
    module: "Rol Tanımları",
    action: "update",
  },
  {
    key: "role.definition.delete",
    name: "Rol tanımını sil",
    module: "Rol Tanımları",
    action: "delete",
  },
  // ── Rezervasyonlar ──
  {
    key: "reservation.view",
    name: "Rezervasyonları görüntüle",
    module: "Rezervasyonlar",
    action: "view",
  },
  {
    key: "reservation.create",
    name: "Rezervasyon oluştur",
    module: "Rezervasyonlar",
    action: "create",
  },
  {
    key: "reservation.update",
    name: "Rezervasyon güncelle",
    module: "Rezervasyonlar",
    action: "update",
  },
  {
    key: "reservation.approve",
    name: "Rezervasyon onayla/reddet, check-in/out",
    module: "Rezervasyonlar",
    action: "update",
  },
  {
    key: "reservation.delete",
    name: "Rezervasyon iptal et",
    module: "Rezervasyonlar",
    action: "delete",
  },
  // ── Fiyatlandırma ──
  {
    key: "pricing.view",
    name: "Fiyatları görüntüle",
    module: "Fiyatlandırma",
    action: "view",
  },
  {
    key: "pricing.create",
    name: "Fiyat tanımla",
    module: "Fiyatlandırma",
    action: "create",
  },
  {
    key: "pricing.update",
    name: "Fiyat güncelle",
    module: "Fiyatlandırma",
    action: "update",
  },
  {
    key: "pricing.delete",
    name: "Fiyat sil",
    module: "Fiyatlandırma",
    action: "delete",
  },
  // ── Harita ──
  {
    key: "map.view",
    name: "Haritayı görüntüle",
    module: "Harita",
    action: "view",
  },
  {
    key: "map.update",
    name: "Harita düzenle (Cabana konumları)",
    module: "Harita",
    action: "update",
  },
  // ── Raporlar ──
  {
    key: "report.view",
    name: "Raporları görüntüle",
    module: "Raporlar",
    action: "view",
  },
  // ── Misafirler ──
  {
    key: "guest.view",
    name: "Misafirleri görüntüle",
    module: "Misafirler",
    action: "view",
  },
  {
    key: "guest.create",
    name: "Misafir oluştur",
    module: "Misafirler",
    action: "create",
  },
  {
    key: "guest.update",
    name: "Misafir güncelle",
    module: "Misafirler",
    action: "update",
  },
  {
    key: "guest.delete",
    name: "Misafir sil",
    module: "Misafirler",
    action: "delete",
  },
  // ── Personel ──
  {
    key: "staff.view",
    name: "Personeli görüntüle",
    module: "Personel",
    action: "view",
  },
  {
    key: "staff.create",
    name: "Personel oluştur",
    module: "Personel",
    action: "create",
  },
  {
    key: "staff.update",
    name: "Personel güncelle",
    module: "Personel",
    action: "update",
  },
  {
    key: "staff.delete",
    name: "Personel sil",
    module: "Personel",
    action: "delete",
  },
  // ── F&B Siparişler ──
  {
    key: "fnb.order.view",
    name: "F&B siparişleri görüntüle",
    module: "F&B Siparişler",
    action: "view",
  },
  {
    key: "fnb.order.create",
    name: "F&B sipariş oluştur",
    module: "F&B Siparişler",
    action: "create",
  },
  {
    key: "fnb.order.update",
    name: "F&B sipariş güncelle",
    module: "F&B Siparişler",
    action: "update",
  },
  // ── Sistem Ayarları ──
  {
    key: "system.config.view",
    name: "Sistem ayarlarını görüntüle",
    module: "Sistem Ayarları",
    action: "view",
  },
  {
    key: "system.config.update",
    name: "Sistem ayarlarını güncelle",
    module: "Sistem Ayarları",
    action: "update",
  },
  // ── Audit Log ──
  {
    key: "audit.view",
    name: "Denetim kayıtlarını görüntüle",
    module: "Denetim Kaydı",
    action: "view",
  },
  // ── Kapalı Tarihler ──
  {
    key: "blackout.view",
    name: "Kapalı tarihleri görüntüle",
    module: "Kapalı Tarihler",
    action: "view",
  },
  {
    key: "blackout.create",
    name: "Kapalı tarih oluştur",
    module: "Kapalı Tarihler",
    action: "create",
  },
  {
    key: "blackout.delete",
    name: "Kapalı tarih sil",
    module: "Kapalı Tarihler",
    action: "delete",
  },
];

export const DEFAULT_ROLE_PERMISSION_KEYS: Record<Role, string[]> = {
  [Role.SYSTEM_ADMIN]: PERMISSION_TEMPLATES.map((permission) => permission.key),
  [Role.ADMIN]: [
    "cabana.class.view",
    "cabana.class.create",
    "cabana.class.update",
    "concept.view",
    "concept.create",
    "concept.update",
    "product.view",
    "product.create",
    "product.update",
    "task.definition.view",
    "task.definition.create",
    "task.definition.update",
    "user.view",
    "user.create",
    "user.update",
    "role.definition.view",
    "reservation.view",
    "reservation.create",
    "reservation.update",
    "reservation.approve",
    "pricing.view",
    "pricing.create",
    "pricing.update",
    "map.view",
    "report.view",
    "guest.view",
    "guest.create",
    "guest.update",
    "staff.view",
    "staff.create",
    "staff.update",
    "fnb.order.view",
    "blackout.view",
    "blackout.create",
  ],
  [Role.CASINO_ADMIN]: [
    "reservation.view",
    "reservation.create",
    "reservation.update",
    "reservation.delete",
    "map.view",
    "report.view",
    "guest.view",
    "user.view",
    "user.create",
    "user.update",
    "blackout.view",
  ],
  [Role.CASINO_USER]: [
    "cabana.class.view",
    "concept.view",
    "product.view",
    "task.definition.view",
    "reservation.view",
    "reservation.create",
    "pricing.view",
    "map.view",
    "report.view",
    "guest.view",
  ],
  [Role.FNB_USER]: [
    "concept.view",
    "product.view",
    "task.definition.view",
    "fnb.order.view",
    "fnb.order.create",
    "fnb.order.update",
    "reservation.view",
    "reservation.approve",
    "map.view",
  ],
};

export const ROLE_DISPLAY_DEFAULTS: Record<Role, string> = {
  [Role.SYSTEM_ADMIN]: "Sistem Yöneticisi",
  [Role.ADMIN]: "Admin",
  [Role.CASINO_ADMIN]: "Casino Admin",
  [Role.CASINO_USER]: "Casino Kullanıcısı",
  [Role.FNB_USER]: "F&B Kullanıcısı",
};

export function hasAccess(role: Role, path: string): boolean {
  const allowedPaths = MODULE_ACCESS[role] ?? [];

  // If the path starts with any of the role's allowed paths, grant access
  if (allowedPaths.some((allowed) => path.startsWith(allowed))) {
    return true;
  }

  // If the path is not under any protected module, it's a shared/public path — allow
  const isProtected = ALL_PROTECTED_PATHS.some((p) => path.startsWith(p));
  return !isProtected;
}
