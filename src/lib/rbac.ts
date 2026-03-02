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
  {
    key: "cabana.class.view",
    name: "Kabana sınıflarını görüntüle",
    module: "Kabana Sınıfları",
    action: "view",
  },
  {
    key: "cabana.class.create",
    name: "Kabana sınıfı oluştur",
    module: "Kabana Sınıfları",
    action: "create",
  },
  {
    key: "cabana.class.update",
    name: "Kabana sınıfı güncelle",
    module: "Kabana Sınıfları",
    action: "update",
  },
  {
    key: "cabana.class.delete",
    name: "Kabana sınıfı sil",
    module: "Kabana Sınıfları",
    action: "delete",
  },
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
  ],
  [Role.CASINO_USER]: [
    "cabana.class.view",
    "concept.view",
    "product.view",
    "task.definition.view",
  ],
  [Role.FNB_USER]: ["concept.view", "product.view", "task.definition.view"],
};

export const ROLE_DISPLAY_DEFAULTS: Record<Role, string> = {
  [Role.SYSTEM_ADMIN]: "Sistem Yöneticisi",
  [Role.ADMIN]: "Admin",
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
