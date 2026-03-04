import {
  PrismaClient,
  Role,
  ReservationStatus,
  FnbOrderStatus,
  NotificationType,
  VipLevel,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type PermissionTemplate = {
  key: string;
  name: string;
  module: string;
  action: "view" | "create" | "update" | "delete";
};

const PERMISSION_TEMPLATES: PermissionTemplate[] = [
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
  {
    key: "report.view",
    name: "Raporları görüntüle",
    module: "Raporlar",
    action: "view",
  },
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
    key: "reservation.delete",
    name: "Rezervasyon iptal et",
    module: "Rezervasyonlar",
    action: "delete",
  },
  {
    key: "staff.view",
    name: "Personeli görüntüle",
    module: "Personel Yönetimi",
    action: "view",
  },
  {
    key: "staff.create",
    name: "Personel oluştur",
    module: "Personel Yönetimi",
    action: "create",
  },
  {
    key: "staff.update",
    name: "Personel güncelle",
    module: "Personel Yönetimi",
    action: "update",
  },
  {
    key: "staff.delete",
    name: "Personeli devre dışı bırak",
    module: "Personel Yönetimi",
    action: "delete",
  },
  {
    key: "fnb.view",
    name: "F&B sipariş yönetimini görüntüle",
    module: "F&B Yönetimi",
    action: "view",
  },
];

const DEFAULT_ROLE_PERMISSION_KEYS: Record<Role, string[]> = {
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
    "report.view",
    "system.config.view",
    "reservation.view",
    "reservation.create",
    "reservation.update",
    "reservation.delete",
    "staff.view",
    "staff.create",
    "staff.update",
    "staff.delete",
  ],
  [Role.CASINO_USER]: [
    "cabana.class.view",
    "concept.view",
    "product.view",
    "task.definition.view",
    "reservation.view",
    "reservation.create",
    "reservation.update",
    "report.view",
    "system.config.view",
    "staff.view",
  ],
  [Role.FNB_USER]: [
    "fnb.view",
    "concept.view",
    "product.view",
    "task.definition.view",
    "reservation.view",
  ],
};

const ROLE_DISPLAY_DEFAULTS: Record<Role, string> = {
  [Role.SYSTEM_ADMIN]: "Sistem Yöneticisi",
  [Role.ADMIN]: "Admin",
  [Role.CASINO_USER]: "Casino Kullanıcısı",
  [Role.FNB_USER]: "F&B Kullanıcısı",
};

async function main() {
  console.log("Seeding database...");

  // SystemAdmin kullanıcısı
  const defaultHashedPassword = await bcrypt.hash("admin123", 12);
  const adminHashedPassword = await bcrypt.hash("123456", 12);

  const systemAdmin = await prisma.user.upsert({
    where: { username: "sysadmin" },
    update: {},
    create: {
      username: "sysadmin",
      email: "sysadmin@royalcabana.com",
      passwordHash: defaultHashedPassword,
      role: Role.SYSTEM_ADMIN,
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: adminHashedPassword },
    create: {
      username: "admin",
      email: "admin@royalcabana.com",
      passwordHash: adminHashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const casinoUser = await prisma.user.upsert({
    where: { username: "casino1" },
    update: {},
    create: {
      username: "casino1",
      email: "casino1@royalcabana.com",
      passwordHash: defaultHashedPassword,
      role: Role.CASINO_USER,
      isActive: true,
    },
  });

  const fnbUser = await prisma.user.upsert({
    where: { username: "fnb1" },
    update: {},
    create: {
      username: "fnb1",
      email: "fnb1@royalcabana.com",
      passwordHash: defaultHashedPassword,
      role: Role.FNB_USER,
      isActive: true,
    },
  });

  // ===== ROL TANIMLARI ve YETKİLER =====
  for (const permission of PERMISSION_TEMPLATES) {
    await (prisma as any).permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        module: permission.module,
        action: permission.action,
        isSystem: true,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        key: permission.key,
        name: permission.name,
        module: permission.module,
        action: permission.action,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const permissions = await (prisma as any).permission.findMany({
    where: { isDeleted: false },
    select: { id: true, key: true },
  });
  const permissionMap = new Map<string, string>(
    permissions.map((permission: { id: string; key: string }) => [
      permission.key,
      permission.id,
    ]),
  );

  for (const role of Object.values(Role)) {
    const roleDefinition = await (prisma as any).roleDefinition.upsert({
      where: { role },
      update: {
        displayName: ROLE_DISPLAY_DEFAULTS[role],
        isSystem: true,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        role,
        displayName: ROLE_DISPLAY_DEFAULTS[role],
        description: `${ROLE_DISPLAY_DEFAULTS[role]} için varsayılan rol tanımı`,
        isSystem: true,
        isActive: true,
      },
      select: { id: true },
    });

    const defaults = DEFAULT_ROLE_PERMISSION_KEYS[role] ?? [];
    for (const key of defaults) {
      const permissionId = permissionMap.get(key);
      if (!permissionId) continue;

      const existing = await (prisma as any).rolePermission.findFirst({
        where: {
          roleDefinitionId: roleDefinition.id,
          permissionId,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        if (existing.isDeleted) {
          await (prisma as any).rolePermission.update({
            where: { id: existing.id },
            data: { isDeleted: false, deletedAt: null },
          });
        }
        continue;
      }

      await (prisma as any).rolePermission.create({
        data: {
          roleDefinitionId: roleDefinition.id,
          permissionId,
        },
      });
    }
  }

  // Örnek Cabana Sınıfları
  const standardClass = await prisma.cabanaClass.upsert({
    where: { name: "Standart Cabana" },
    update: {},
    create: {
      name: "Standart Cabana",
      description: "Temel konfor ve hizmetler sunan standart cabana sınıfı",
      defaults: JSON.stringify({ capacity: 2, view: "sea" }),
    },
  });

  const premiumClass = await prisma.cabanaClass.upsert({
    where: { name: "Premium Cabana" },
    update: {},
    create: {
      name: "Premium Cabana",
      description:
        "Üst düzey konfor ve özel hizmetler sunan premium cabana sınıfı",
      defaults: JSON.stringify({ capacity: 4, view: "sea", privatePool: true }),
    },
  });

  const vipClass = await prisma.cabanaClass.upsert({
    where: { name: "VIP Cabana" },
    update: {},
    create: {
      name: "VIP Cabana",
      description:
        "En üst düzey lüks ve kişiselleştirilmiş hizmet sunan VIP cabana",
      defaults: JSON.stringify({
        capacity: 6,
        view: "panoramic",
        privatePool: true,
        butler: true,
      }),
    },
  });

  const familyClass = await prisma.cabanaClass.upsert({
    where: { name: "Aile Cabana" },
    update: {},
    create: {
      name: "Aile Cabana",
      description:
        "Aileler için geniş alan ve çocuk dostu hizmetler sunan cabana",
      defaults: JSON.stringify({ capacity: 8, view: "garden", kidsArea: true }),
    },
  });

  // ===== ÜRÜN GRUPLARI =====
  const groupIcecek = await prisma.productGroup.upsert({
    where: { name: "İçecekler" },
    update: { sortOrder: 1 },
    create: { name: "İçecekler", sortOrder: 1 },
  });

  const groupYiyecek = await prisma.productGroup.upsert({
    where: { name: "Yiyecekler" },
    update: { sortOrder: 2 },
    create: { name: "Yiyecekler", sortOrder: 2 },
  });

  const groupHizmet = await prisma.productGroup.upsert({
    where: { name: "Hizmetler" },
    update: { sortOrder: 3 },
    create: { name: "Hizmetler", sortOrder: 3 },
  });

  const groupEglence = await prisma.productGroup.upsert({
    where: { name: "Eğlence & Aktivite" },
    update: { sortOrder: 4 },
    create: { name: "Eğlence & Aktivite", sortOrder: 4 },
  });

  const groupSpa = await prisma.productGroup.upsert({
    where: { name: "Spa & Wellness" },
    update: { sortOrder: 5 },
    create: { name: "Spa & Wellness", sortOrder: 5 },
  });

  // ===== ÜRÜNLER =====

  // İçecekler
  const welcomeDrink = await prisma.product.upsert({
    where: { id: "product-welcome-drink" },
    update: { groupId: groupIcecek.id },
    create: {
      id: "product-welcome-drink",
      name: "Karşılama İçeceği",
      purchasePrice: 50,
      salePrice: 150,
      isActive: true,
      groupId: groupIcecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-champagne" },
    update: { groupId: groupIcecek.id },
    create: {
      id: "product-champagne",
      name: "Şampanya (Şişe)",
      purchasePrice: 300,
      salePrice: 850,
      isActive: true,
      groupId: groupIcecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-water-package" },
    update: { groupId: groupIcecek.id },
    create: {
      id: "product-water-package",
      name: "Su Paketi (6'lı)",
      purchasePrice: 30,
      salePrice: 90,
      isActive: true,
      groupId: groupIcecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-soft-drink" },
    update: { groupId: groupIcecek.id },
    create: {
      id: "product-soft-drink",
      name: "Meşrubat",
      purchasePrice: 15,
      salePrice: 50,
      isActive: true,
      groupId: groupIcecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-fresh-juice" },
    update: { groupId: groupIcecek.id },
    create: {
      id: "product-fresh-juice",
      name: "Taze Sıkılmış Meyve Suyu",
      purchasePrice: 40,
      salePrice: 120,
      isActive: true,
      groupId: groupIcecek.id,
    },
  });

  // Yiyecekler
  const fruitPlatter = await prisma.product.upsert({
    where: { id: "product-fruit-platter" },
    update: { groupId: groupYiyecek.id },
    create: {
      id: "product-fruit-platter",
      name: "Meyve Tabağı",
      purchasePrice: 80,
      salePrice: 250,
      isActive: true,
      groupId: groupYiyecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-cheese-platter" },
    update: { groupId: groupYiyecek.id },
    create: {
      id: "product-cheese-platter",
      name: "Peynir Tabağı",
      purchasePrice: 120,
      salePrice: 380,
      isActive: true,
      groupId: groupYiyecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-sandwich" },
    update: { groupId: groupYiyecek.id },
    create: {
      id: "product-sandwich",
      name: "Club Sandviç",
      purchasePrice: 60,
      salePrice: 180,
      isActive: true,
      groupId: groupYiyecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-cake-slice" },
    update: { groupId: groupYiyecek.id },
    create: {
      id: "product-cake-slice",
      name: "Pasta Dilimi",
      purchasePrice: 45,
      salePrice: 140,
      isActive: true,
      groupId: groupYiyecek.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-snack-basket" },
    update: { groupId: groupYiyecek.id },
    create: {
      id: "product-snack-basket",
      name: "Atıştırmalık Sepeti",
      purchasePrice: 70,
      salePrice: 200,
      isActive: true,
      groupId: groupYiyecek.id,
    },
  });

  // Hizmetler
  const towelService = await prisma.product.upsert({
    where: { id: "product-towel" },
    update: { groupId: groupHizmet.id },
    create: {
      id: "product-towel",
      name: "Havlu Servisi",
      purchasePrice: 20,
      salePrice: 75,
      isActive: true,
      groupId: groupHizmet.id,
    },
  });

  const sunbedService = await prisma.product.upsert({
    where: { id: "product-sunbed" },
    update: { groupId: groupHizmet.id },
    create: {
      id: "product-sunbed",
      name: "Şezlong Servisi",
      purchasePrice: 30,
      salePrice: 100,
      isActive: true,
      groupId: groupHizmet.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-umbrella" },
    update: { groupId: groupHizmet.id },
    create: {
      id: "product-umbrella",
      name: "Şemsiye Kiralama",
      purchasePrice: 25,
      salePrice: 80,
      isActive: true,
      groupId: groupHizmet.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-butler" },
    update: { groupId: groupHizmet.id },
    create: {
      id: "product-butler",
      name: "Özel Butler Hizmeti (Günlük)",
      purchasePrice: 500,
      salePrice: 1500,
      isActive: true,
      groupId: groupHizmet.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-transfer" },
    update: { groupId: groupHizmet.id },
    create: {
      id: "product-transfer",
      name: "VIP Transfer",
      purchasePrice: 200,
      salePrice: 600,
      isActive: true,
      groupId: groupHizmet.id,
    },
  });

  // Eğlence & Aktivite
  await prisma.product.upsert({
    where: { id: "product-dj" },
    update: { groupId: groupEglence.id },
    create: {
      id: "product-dj",
      name: "Özel DJ Saati",
      purchasePrice: 800,
      salePrice: 2500,
      isActive: true,
      groupId: groupEglence.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-photo" },
    update: { groupId: groupEglence.id },
    create: {
      id: "product-photo",
      name: "Profesyonel Fotoğraf Çekimi",
      purchasePrice: 400,
      salePrice: 1200,
      isActive: true,
      groupId: groupEglence.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-decoration" },
    update: { groupId: groupEglence.id },
    create: {
      id: "product-decoration",
      name: "Özel Dekorasyon",
      purchasePrice: 300,
      salePrice: 900,
      isActive: true,
      groupId: groupEglence.id,
    },
  });

  // Spa & Wellness
  await prisma.product.upsert({
    where: { id: "product-massage" },
    update: { groupId: groupSpa.id },
    create: {
      id: "product-massage",
      name: "Masaj (60 dk)",
      purchasePrice: 350,
      salePrice: 1000,
      isActive: true,
      groupId: groupSpa.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-aromatherapy" },
    update: { groupId: groupSpa.id },
    create: {
      id: "product-aromatherapy",
      name: "Aromaterapi Seti",
      purchasePrice: 150,
      salePrice: 450,
      isActive: true,
      groupId: groupSpa.id,
    },
  });

  await prisma.product.upsert({
    where: { id: "product-facial" },
    update: { groupId: groupSpa.id },
    create: {
      id: "product-facial",
      name: "Yüz Bakımı",
      purchasePrice: 250,
      salePrice: 750,
      isActive: true,
      groupId: groupSpa.id,
    },
  });

  // Örnek Konseptler
  const basicConcept = await prisma.concept.upsert({
    where: { name: "Temel Paket" },
    update: {},
    create: {
      name: "Temel Paket",
      description: "Temel hizmetleri içeren standart paket",
      classId: standardClass.id,
    },
  });

  const premiumConcept = await prisma.concept.upsert({
    where: { name: "Premium Paket" },
    update: {},
    create: {
      name: "Premium Paket",
      description: "Premium hizmetleri içeren üst düzey paket",
      classId: premiumClass.id,
    },
  });

  // Konsept-Ürün ilişkileri
  await prisma.conceptProduct.upsert({
    where: {
      conceptId_productId: {
        conceptId: basicConcept.id,
        productId: welcomeDrink.id,
      },
    },
    update: {},
    create: {
      conceptId: basicConcept.id,
      productId: welcomeDrink.id,
      quantity: 1,
    },
  });

  await prisma.conceptProduct.upsert({
    where: {
      conceptId_productId: {
        conceptId: basicConcept.id,
        productId: towelService.id,
      },
    },
    update: {},
    create: {
      conceptId: basicConcept.id,
      productId: towelService.id,
      quantity: 2,
    },
  });

  await prisma.conceptProduct.upsert({
    where: {
      conceptId_productId: {
        conceptId: premiumConcept.id,
        productId: welcomeDrink.id,
      },
    },
    update: {},
    create: {
      conceptId: premiumConcept.id,
      productId: welcomeDrink.id,
      quantity: 2,
    },
  });

  await prisma.conceptProduct.upsert({
    where: {
      conceptId_productId: {
        conceptId: premiumConcept.id,
        productId: fruitPlatter.id,
      },
    },
    update: {},
    create: {
      conceptId: premiumConcept.id,
      productId: fruitPlatter.id,
      quantity: 1,
    },
  });

  await prisma.conceptProduct.upsert({
    where: {
      conceptId_productId: {
        conceptId: premiumConcept.id,
        productId: sunbedService.id,
      },
    },
    update: {},
    create: {
      conceptId: premiumConcept.id,
      productId: sunbedService.id,
      quantity: 2,
    },
  });

  // ===== CABANALAR — Görseldeki yerleşim planına göre =====
  // Harita boyutu: 1040×678 piksel (sonnn.png)
  // Koordinatlar (coordX, coordY) = piksel cinsinden (0,0 sol-üst köşe)
  // Hava fotoğrafı + kroki eşleşmesine göre düzenlenmiştir.

  const cabanas = [
    // ─── SOL DENİZ PLATFORMU — L-şekil, 8 cabana (2×2 üst + 2×2 alt) ──
    // Üst sol çift
    {
      name: "Cabana-01",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 454.05,
      coordY: 282.76,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-02",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 412.69,
      coordY: 263.75,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    // Üst sağ çift
    {
      name: "Cabana-07",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 376.98,
      coordY: 442.07,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-08",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 359.14,
      coordY: 473.1,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    // Alt sol çift (platformun alt kolu)
    {
      name: "Cabana-03",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 372.5,
      coordY: 242.27,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-04",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 470.66,
      coordY: 371.33,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    // Alt sağ çift (platformun alt kolu)
    {
      name: "Cabana-05",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 455.83,
      coordY: 400.83,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-06",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 438.52,
      coordY: 430.5,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },

    // ─── KIYI BOYUNCA — 4 standart cabana, kıyı hattında sıralı ───────
    {
      name: "Cabana-09",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 343.4,
      coordY: 502.22,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-10",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 510.31,
      coordY: 582.25,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-11",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 525.7,
      coordY: 551.66,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-12",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 541.24,
      coordY: 520.28,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },

    // ─── ORTA KISIM — 13, 14, 15 ──────────────────────────────────────
    {
      name: "Cabana-13",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 538.98,
      coordY: 403.17,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-14",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 523.16,
      coordY: 433.39,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-15",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 505.28,
      coordY: 463.61,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },

    // ─── ANA DENİZ PLATFORMU (artı/+ şekli) — 10 cabana ──────────────
    // Sol kol (yukarıdan aşağı): 16 → 17 → 18
    {
      name: "Cabana-16",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 846.99,
      coordY: 432.73,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-17",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 845.93,
      coordY: 468.42,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-18",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 846.08,
      coordY: 501.7,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.3,
    },
    // Sağ kol (yukarıdan aşağı): 25 → 24 → 23
    {
      name: "Cabana-25",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 933.57,
      coordY: 432.06,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Cabana-24",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 935.03,
      coordY: 466.71,
      rotation: 0,
      scaleX: 1.8,
      scaleY: 1.5,
    },
    {
      name: "Cabana-23",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 935.36,
      coordY: 502.03,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    // Alt sol köşe: 19 (üst), 20 (alt)
    {
      name: "Cabana-19",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 787.79,
      coordY: 546.09,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 2.4,
    },
    {
      name: "Cabana-20",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 787.72,
      coordY: 597.08,
      rotation: 0,
      scaleX: 1.8,
      scaleY: 2.3,
    },
    // Alt sağ köşe: 22 (üst), 21 (alt)
    {
      name: "Cabana-22",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 991.57,
      coordY: 600.5,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 2.3,
    },
    {
      name: "Cabana-21",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 992.26,
      coordY: 548.04,
      rotation: 0,
      scaleX: 1.9,
      scaleY: 2.2,
    },

    // ─── VIP CABANALAR — Kıyıda, merkez iskele yakını, büyük ─────────
    {
      name: "VIP Cabana-26",
      classId: vipClass.id,
      conceptId: premiumConcept.id,
      coordX: 539.08,
      coordY: 202.39,
      rotation: 0,
      scaleX: 1.3,
      scaleY: 1.5,
    },
    {
      name: "VIP Cabana-27",
      classId: vipClass.id,
      conceptId: premiumConcept.id,
      coordX: 578.53,
      coordY: 204.1,
      rotation: 0,
      scaleX: 1.4,
      scaleY: 1.5,
    },
  ];

  for (const cabana of cabanas) {
    await prisma.cabana.upsert({
      where: { name: cabana.name },
      update: {
        coordX: cabana.coordX,
        coordY: cabana.coordY,
        rotation: cabana.rotation ?? 0,
        scaleX: cabana.scaleX ?? 1,
        scaleY: cabana.scaleY ?? 1,
        classId: cabana.classId,
        conceptId: cabana.conceptId,
      },
      create: cabana,
    });
  }

  // SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: "system_open_for_reservation" },
    update: {},
    create: { key: "system_open_for_reservation", value: "true" },
  });

  await prisma.systemConfig.upsert({
    where: { key: "app_name" },
    update: {},
    create: { key: "app_name", value: "Royal Cabana" },
  });

  // Currency preference
  await prisma.systemConfig.upsert({
    where: { key: "system_currency" },
    update: {},
    create: { key: "system_currency", value: "TRY" },
  });

  // Default (Standart) Konsept — konsept seçilmezse otomatik atanır
  await prisma.systemConfig.upsert({
    where: { key: "default_concept_id" },
    update: { value: basicConcept.id },
    create: { key: "default_concept_id", value: basicConcept.id },
  });

  // Bar positions (map buildings)
  await prisma.systemConfig.upsert({
    where: { key: "sunset_bar_transform" },
    update: {
      value: JSON.stringify({
        x: 873.24,
        y: 326.52,
        scale: 1,
        rotation: 0,
        isLocked: true,
      }),
    },
    create: {
      key: "sunset_bar_transform",
      value: JSON.stringify({
        x: 873.24,
        y: 326.52,
        scale: 1,
        rotation: 0,
        isLocked: true,
      }),
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: "blue_sea_bar_transform" },
    update: {
      value: JSON.stringify({
        x: 320.35,
        y: 191.05,
        scale: 1,
        rotation: 10,
        isLocked: true,
      }),
    },
    create: {
      key: "blue_sea_bar_transform",
      value: JSON.stringify({
        x: 320.35,
        y: 191.05,
        scale: 1,
        rotation: 10,
        isLocked: true,
      }),
    },
  });

  // Common parasol position (draggable building)
  await prisma.systemConfig.upsert({
    where: { key: "common_parasol_transform" },
    update: {
      value: JSON.stringify({
        x: 620,
        y: 420,
        scale: 1,
        rotation: 0,
        isLocked: false,
      }),
    },
    create: {
      key: "common_parasol_transform",
      value: JSON.stringify({
        x: 620,
        y: 420,
        scale: 1,
        rotation: 0,
        isLocked: false,
      }),
    },
  });

  // Fiyatlandırma basitleştirildi — CabanaPrice ve CabanaPriceRange kaldırıldı
  // Fiyatlandırma basitleştirildi — ConceptPrice kaldırıldı
  // Yeni model: conceptPrice = Σ(product.salePrice × qty) + serviceFee

  // ===== TEST VERİLERİ =====

  // ── Guests (10 adet) ──
  const guestData = [
    {
      name: "Ahmet Yılmaz",
      phone: "+905321234567",
      email: "ahmet.yilmaz@email.com",
      vipLevel: VipLevel.STANDARD,
    },
    {
      name: "Elif Kaya",
      phone: "+905339876543",
      email: "elif.kaya@email.com",
      vipLevel: VipLevel.SILVER,
    },
    {
      name: "Mehmet Demir",
      phone: "+905441112233",
      email: "mehmet.demir@email.com",
      vipLevel: VipLevel.GOLD,
    },
    {
      name: "Zeynep Çelik",
      phone: "+905552223344",
      email: "zeynep.celik@email.com",
      vipLevel: VipLevel.PLATINUM,
    },
    {
      name: "Burak Şahin",
      phone: "+905363334455",
      email: "burak.sahin@email.com",
      vipLevel: VipLevel.STANDARD,
    },
    {
      name: "Ayşe Öztürk",
      phone: "+905424445566",
      email: "ayse.ozturk@email.com",
      vipLevel: VipLevel.SILVER,
    },
    {
      name: "Emre Arslan",
      phone: "+905515556677",
      email: "emre.arslan@email.com",
      vipLevel: VipLevel.GOLD,
    },
    {
      name: "Fatma Doğan",
      phone: "+905376667788",
      email: "fatma.dogan@email.com",
      vipLevel: VipLevel.STANDARD,
    },
    {
      name: "Can Yıldırım",
      phone: "+905487778899",
      email: "can.yildirim@email.com",
      vipLevel: VipLevel.PLATINUM,
    },
    {
      name: "Selin Koç",
      phone: "+905398889900",
      email: "selin.koc@email.com",
      vipLevel: VipLevel.SILVER,
    },
  ];

  const guests = [];
  for (const g of guestData) {
    const guest = await prisma.guest.upsert({
      where: { id: `guest-seed-${g.email}` },
      update: { vipLevel: g.vipLevel },
      create: {
        id: `guest-seed-${g.email}`,
        name: g.name,
        phone: g.phone,
        email: g.email,
        vipLevel: g.vipLevel,
      },
    });
    guests.push(guest);
  }

  // ── Fetch cabana IDs for reservations ──
  const allCabanas = await prisma.cabana.findMany({
    select: { id: true, name: true },
    take: 15,
  });

  // ── Reservations (15 adet) ──
  const today = new Date();
  const dayMs = 86400000;

  const reservationConfigs = [
    // 3 PENDING
    {
      guestIdx: 0,
      cabIdx: 0,
      status: ReservationStatus.PENDING,
      daysFromNow: 5,
      duration: 2,
      price: null,
    },
    {
      guestIdx: 1,
      cabIdx: 1,
      status: ReservationStatus.PENDING,
      daysFromNow: 7,
      duration: 3,
      price: null,
    },
    {
      guestIdx: 4,
      cabIdx: 4,
      status: ReservationStatus.PENDING,
      daysFromNow: 10,
      duration: 1,
      price: null,
    },
    // 4 APPROVED
    {
      guestIdx: 2,
      cabIdx: 2,
      status: ReservationStatus.APPROVED,
      daysFromNow: 1,
      duration: 2,
      price: 2500,
    },
    {
      guestIdx: 3,
      cabIdx: 3,
      status: ReservationStatus.APPROVED,
      daysFromNow: 2,
      duration: 3,
      price: 4500,
    },
    {
      guestIdx: 5,
      cabIdx: 5,
      status: ReservationStatus.APPROVED,
      daysFromNow: 3,
      duration: 1,
      price: 1800,
    },
    {
      guestIdx: 6,
      cabIdx: 6,
      status: ReservationStatus.APPROVED,
      daysFromNow: 4,
      duration: 2,
      price: 3200,
    },
    // 2 CHECKED_IN
    {
      guestIdx: 7,
      cabIdx: 7,
      status: ReservationStatus.CHECKED_IN,
      daysFromNow: 0,
      duration: 2,
      price: 2200,
    },
    {
      guestIdx: 8,
      cabIdx: 8,
      status: ReservationStatus.CHECKED_IN,
      daysFromNow: -1,
      duration: 3,
      price: 5000,
    },
    // 3 CHECKED_OUT
    {
      guestIdx: 9,
      cabIdx: 9,
      status: ReservationStatus.CHECKED_OUT,
      daysFromNow: -5,
      duration: 2,
      price: 1900,
    },
    {
      guestIdx: 0,
      cabIdx: 10,
      status: ReservationStatus.CHECKED_OUT,
      daysFromNow: -7,
      duration: 1,
      price: 1200,
    },
    {
      guestIdx: 1,
      cabIdx: 11,
      status: ReservationStatus.CHECKED_OUT,
      daysFromNow: -10,
      duration: 3,
      price: 4000,
    },
    // 2 CANCELLED
    {
      guestIdx: 2,
      cabIdx: 12,
      status: ReservationStatus.CANCELLED,
      daysFromNow: 8,
      duration: 2,
      price: null,
    },
    {
      guestIdx: 3,
      cabIdx: 13,
      status: ReservationStatus.CANCELLED,
      daysFromNow: 12,
      duration: 1,
      price: null,
    },
    // 1 REJECTED
    {
      guestIdx: 4,
      cabIdx: 14 % allCabanas.length,
      status: ReservationStatus.REJECTED,
      daysFromNow: 6,
      duration: 2,
      price: null,
    },
  ];

  const reservations = [];
  for (let i = 0; i < reservationConfigs.length; i++) {
    const cfg = reservationConfigs[i];
    const guest = guests[cfg.guestIdx];
    const cabana = allCabanas[cfg.cabIdx % allCabanas.length];
    const startDate = new Date(today.getTime() + cfg.daysFromNow * dayMs);
    const endDate = new Date(startDate.getTime() + cfg.duration * dayMs);
    const resId = `res-seed-${i.toString().padStart(2, "0")}`;

    const reservation = await prisma.reservation.upsert({
      where: { id: resId },
      update: {
        status: cfg.status,
        totalPrice: cfg.price,
      },
      create: {
        id: resId,
        cabanaId: cabana.id,
        userId: casinoUser.id,
        guestId: guest.id,
        guestName: guest.name,
        startDate,
        endDate,
        status: cfg.status,
        totalPrice: cfg.price,
        notes: i % 3 === 0 ? "VIP misafir, özel ilgi gösterilmeli" : null,
        rejectionReason:
          cfg.status === ReservationStatus.REJECTED
            ? "Cabana bakımda, alternatif önerildi"
            : null,
        checkInAt:
          cfg.status === ReservationStatus.CHECKED_IN ||
          cfg.status === ReservationStatus.CHECKED_OUT
            ? new Date(startDate.getTime() + 10 * 3600000)
            : null,
        checkOutAt:
          cfg.status === ReservationStatus.CHECKED_OUT
            ? new Date(endDate.getTime() + 16 * 3600000)
            : null,
        conceptId: basicConcept.id,
      },
    });
    reservations.push(reservation);

    // Add status history
    const historyId = `rsh-seed-${i.toString().padStart(2, "0")}`;
    const existing = await prisma.reservationStatusHistory.findFirst({
      where: { id: historyId },
    });
    if (!existing) {
      await prisma.reservationStatusHistory.create({
        data: {
          id: historyId,
          reservationId: reservation.id,
          fromStatus: null,
          toStatus: ReservationStatus.PENDING,
          changedBy: casinoUser.id,
        },
      });
    }
  }

  // ── FnbOrders (8 adet — APPROVED veya CHECKED_IN rezlere bağlı) ──
  const activeReservations = reservations.filter(
    (r) =>
      r.status === ReservationStatus.APPROVED ||
      r.status === ReservationStatus.CHECKED_IN,
  );

  const fnbStatuses: FnbOrderStatus[] = [
    FnbOrderStatus.PREPARING,
    FnbOrderStatus.PREPARING,
    FnbOrderStatus.DELIVERED,
    FnbOrderStatus.DELIVERED,
    FnbOrderStatus.DELIVERED,
    FnbOrderStatus.PREPARING,
    FnbOrderStatus.DELIVERED,
    FnbOrderStatus.PREPARING,
  ];

  const fnbProductIds = [
    "product-welcome-drink",
    "product-soft-drink",
    "product-fresh-juice",
    "product-fruit-platter",
    "product-cheese-platter",
    "product-sandwich",
    "product-cake-slice",
    "product-snack-basket",
    "product-champagne",
    "product-water-package",
  ];

  // Tüm fnb ürünlerini tek sorguda çek
  const fnbProducts = await prisma.product.findMany({
    where: { id: { in: fnbProductIds } },
    select: { id: true, salePrice: true },
  });
  const fnbProductMap = new Map(fnbProducts.map((p) => [p.id, p.salePrice]));

  for (let i = 0; i < 8; i++) {
    const rez = activeReservations[i % activeReservations.length];
    const orderId = `fnb-seed-${i.toString().padStart(2, "0")}`;

    const existingOrder = await prisma.fnbOrder.findFirst({
      where: { id: orderId },
    });
    if (existingOrder) continue;

    const itemCount = 2 + (i % 3);
    const orderItems = [];
    for (let j = 0; j < itemCount; j++) {
      const prodId = fnbProductIds[(i * 3 + j) % fnbProductIds.length];
      const salePrice = fnbProductMap.get(prodId);
      if (salePrice) {
        orderItems.push({
          productId: prodId,
          quantity: 1 + (j % 3),
          unitPrice: salePrice,
        });
      }
    }

    await prisma.fnbOrder.create({
      data: {
        id: orderId,
        reservationId: rez.id,
        cabanaId: rez.cabanaId,
        status: fnbStatuses[i],
        notes: i % 2 === 0 ? "Lütfen soğuk servis yapın" : null,
        createdBy: fnbUser.id,
        items: { create: orderItems },
      },
    });
  }

  // ── Notifications (5 adet) ──
  const notificationData = [
    {
      type: NotificationType.NEW_REQUEST,
      title: "Yeni Rezervasyon Talebi",
      message: `${guests[0].name} adına yeni rezervasyon talebi oluşturuldu.`,
    },
    {
      type: NotificationType.APPROVED,
      title: "Rezervasyon Onaylandı",
      message: `${guests[2].name} rezervasyonu onaylandı.`,
    },
    {
      type: NotificationType.CHECK_IN,
      title: "Check-in Yapıldı",
      message: `${guests[7].name} check-in yaptı.`,
    },
    {
      type: NotificationType.FNB_ORDER,
      title: "Yeni F&B Siparişi",
      message: "Cabana-08 için yeni sipariş oluşturuldu.",
    },
    {
      type: NotificationType.STATUS_CHANGED,
      title: "Durum Değişikliği",
      message: `${guests[9].name} rezervasyonu check-out olarak güncellendi.`,
    },
  ];

  for (let i = 0; i < notificationData.length; i++) {
    const notifId = `notif-seed-${i.toString().padStart(2, "0")}`;
    const existing = await prisma.notification.findFirst({
      where: { id: notifId },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          id: notifId,
          userId: admin.id,
          ...notificationData[i],
        },
      });
    }
  }

  // ── ExtraServices (5 adet) + ExtraServicePrice ──
  const extraServiceData = [
    { name: "Masaj (60 dk)", category: "MASSAGE", price: 1000 },
    { name: "Havlu Seti", category: "TOWEL", price: 150 },
    { name: "Şezlong Kiralama", category: "SUNBED", price: 200 },
    { name: "Şnorkeling Ekipmanı", category: "SNORKELING", price: 350 },
    { name: "Profesyonel Fotoğrafçı", category: "PHOTOGRAPHER", price: 1500 },
  ];

  for (let i = 0; i < extraServiceData.length; i++) {
    const svc = extraServiceData[i];
    const esId = `extra-svc-seed-${i.toString().padStart(2, "0")}`;

    const extraService = await (prisma as any).extraService.upsert({
      where: { name: svc.name },
      update: { category: svc.category },
      create: {
        id: esId,
        name: svc.name,
        description: `${svc.name} hizmeti`,
        category: svc.category,
        isActive: true,
      },
    });

    const espId = `esp-seed-${i.toString().padStart(2, "0")}`;
    const existingPrice = await (prisma as any).extraServicePrice.findFirst({
      where: { id: espId },
    });
    if (!existingPrice) {
      await (prisma as any).extraServicePrice.create({
        data: {
          id: espId,
          extraServiceId: extraService.id,
          price: svc.price,
          changedBy: systemAdmin.id,
        },
      });
    }
  }

  // ── Staff (10 personel) ──
  const staffData = [
    {
      name: "Kemal Aydın",
      phone: "+905321110001",
      email: "kemal.aydin@royalcabana.com",
      position: "Barmen",
    },
    {
      name: "Leyla Şimşek",
      phone: "+905321110002",
      email: "leyla.simsek@royalcabana.com",
      position: "Garson",
    },
    {
      name: "Tarık Güneş",
      phone: "+905321110003",
      email: "tarik.gunes@royalcabana.com",
      position: "Kasiyer",
    },
    {
      name: "Neslihan Yurt",
      phone: "+905321110004",
      email: "neslihan.yurt@royalcabana.com",
      position: "Garson",
    },
    {
      name: "Oğuz Karahan",
      phone: "+905321110005",
      email: "oguz.karahan@royalcabana.com",
      position: "Barmen",
    },
    {
      name: "Pınar Erdoğan",
      phone: "+905321110006",
      email: "pinar.erdogan@royalcabana.com",
      position: "Masör",
    },
    {
      name: "Serkan Bulut",
      phone: "+905321110007",
      email: "serkan.bulut@royalcabana.com",
      position: "Güvenlik",
    },
    {
      name: "Tuba Çakır",
      phone: "+905321110008",
      email: "tuba.cakir@royalcabana.com",
      position: "Resepsiyonist",
    },
    {
      name: "Uğur Polat",
      phone: "+905321110009",
      email: "ugur.polat@royalcabana.com",
      position: "Şef",
    },
    {
      name: "Vildan Kılıç",
      phone: "+905321110010",
      email: "vildan.kilic@royalcabana.com",
      position: "Garson",
    },
  ];

  const staffMembers = [];
  for (let i = 0; i < staffData.length; i++) {
    const s = staffData[i];
    const staffId = `staff-seed-${i.toString().padStart(2, "0")}`;
    const member = await prisma.staff.upsert({
      where: { id: staffId },
      update: { position: s.position, isActive: true },
      create: {
        id: staffId,
        name: s.name,
        phone: s.phone,
        email: s.email,
        position: s.position,
        isActive: true,
      },
    });
    staffMembers.push(member);
  }

  // ── TaskDefinitions (8 adet) ──
  const taskDefData = [
    {
      title: "Cabana Temizliği",
      description: "Günlük cabana temizlik ve düzenleme",
      category: "CLEANING",
      priority: "HIGH",
    },
    {
      title: "Havlu Değişimi",
      description: "Misafir havlularının değiştirilmesi",
      category: "HOUSEKEEPING",
      priority: "NORMAL",
    },
    {
      title: "Minibar Kontrolü",
      description: "Minibar stok kontrolü ve yenileme",
      category: "STOCK",
      priority: "NORMAL",
    },
    {
      title: "Ekipman Bakımı",
      description: "Şezlong ve şemsiye bakımı",
      category: "MAINTENANCE",
      priority: "LOW",
    },
    {
      title: "VIP Karşılama Hazırlığı",
      description: "VIP misafir için özel hazırlık",
      category: "VIP",
      priority: "HIGH",
    },
    {
      title: "Bar Stok Sayımı",
      description: "Günlük bar stok sayımı ve raporu",
      category: "STOCK",
      priority: "NORMAL",
    },
    {
      title: "Güvenlik Turu",
      description: "Saatlik güvenlik turu",
      category: "SECURITY",
      priority: "HIGH",
    },
    {
      title: "Müşteri Memnuniyet Anketi",
      description: "Check-out sonrası anket uygulaması",
      category: "QUALITY",
      priority: "LOW",
    },
  ];

  const taskDefs = [];
  for (let i = 0; i < taskDefData.length; i++) {
    const t = taskDefData[i];
    const tdId = `taskdef-seed-${i.toString().padStart(2, "0")}`;
    const td = await prisma.taskDefinition.upsert({
      where: { id: tdId },
      update: { priority: t.priority },
      create: {
        id: tdId,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        isActive: true,
      },
    });
    taskDefs.push(td);
  }

  // ── StaffTasks (10 adet) ──
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 10; i++) {
    const stId = `stafftask-seed-${i.toString().padStart(2, "0")}`;
    const existing = await prisma.staffTask.findFirst({ where: { id: stId } });
    if (!existing) {
      await prisma.staffTask.create({
        data: {
          id: stId,
          staffId: staffMembers[i % staffMembers.length].id,
          taskDefinitionId: taskDefs[i % taskDefs.length].id,
          title: taskDefs[i % taskDefs.length].title,
          description: taskDefs[i % taskDefs.length].description,
          date: todayDate,
          isCompleted: i < 4,
          completedAt: i < 4 ? new Date() : null,
        },
      });
    }
  }

  // ── StaffAssignments (8 adet) ──
  const cabanaSubset = allCabanas.slice(0, 8);
  for (let i = 0; i < 8; i++) {
    const saId = `staffassign-seed-${i.toString().padStart(2, "0")}`;
    const existing = await prisma.staffAssignment.findFirst({
      where: { id: saId },
    });
    if (!existing) {
      await prisma.staffAssignment.create({
        data: {
          id: saId,
          staffId: staffMembers[i % staffMembers.length].id,
          cabanaId: cabanaSubset[i % cabanaSubset.length].id,
          date: todayDate,
          shift: i % 2 === 0 ? "MORNING" : "AFTERNOON",
        },
      });
    }
  }

  // ── ServicePoints (4 adet) ──
  const servicePointData = [
    {
      name: "Sunset Bar",
      type: "BAR",
      description: "Ana platform üzerindeki bar",
      coordX: 873.24,
      coordY: 326.52,
      requiredStaffCount: 3,
      staffRoles: ["Barmen", "Garson", "Kasiyer"],
    },
    {
      name: "Blue Sea Bar",
      type: "BEACH_BAR",
      description: "Kıyı barı",
      coordX: 320.35,
      coordY: 191.05,
      requiredStaffCount: 2,
      staffRoles: ["Barmen", "Garson"],
    },
    {
      name: "Spa & Wellness",
      type: "SPA",
      description: "Spa ve wellness merkezi",
      coordX: 750,
      coordY: 300,
      requiredStaffCount: 2,
      staffRoles: ["Masör", "Resepsiyonist"],
    },
  ];

  for (let i = 0; i < servicePointData.length; i++) {
    const sp = servicePointData[i];
    const spId = `sp-seed-${i.toString().padStart(2, "0")}`;
    await prisma.servicePoint.upsert({
      where: { name: sp.name },
      update: { coordX: sp.coordX, coordY: sp.coordY },
      create: {
        id: spId,
        name: sp.name,
        type: sp.type,
        description: sp.description,
        coordX: sp.coordX,
        coordY: sp.coordY,
        requiredStaffCount: sp.requiredStaffCount,
        staffRoles: sp.staffRoles,
        isActive: true,
      },
    });
  }

  // ── ServicePointStaff (6 adet) ──
  const servicePoints = await prisma.servicePoint.findMany({ take: 4 });
  const spStaffData = [
    { spIdx: 0, staffIdx: 0, role: "Barmen", shift: "FULL_DAY" },
    { spIdx: 0, staffIdx: 1, role: "Garson", shift: "MORNING" },
    { spIdx: 0, staffIdx: 2, role: "Kasiyer", shift: "FULL_DAY" },
    { spIdx: 1, staffIdx: 4, role: "Barmen", shift: "AFTERNOON" },
    { spIdx: 2, staffIdx: 8, role: "Şef", shift: "FULL_DAY" },
    { spIdx: 3, staffIdx: 5, role: "Masör", shift: "FULL_DAY" },
  ];

  for (let i = 0; i < spStaffData.length; i++) {
    const d = spStaffData[i];
    const sp = servicePoints[d.spIdx];
    const st = staffMembers[d.staffIdx];
    if (!sp || !st) continue;
    const existing = await prisma.servicePointStaff.findFirst({
      where: {
        servicePointId: sp.id,
        staffId: st.id,
        date: todayDate,
        role: d.role,
      },
    });
    if (!existing) {
      await prisma.servicePointStaff.create({
        data: {
          servicePointId: sp.id,
          staffId: st.id,
          role: d.role,
          shift: d.shift,
          date: todayDate,
        },
      });
    }
  }

  // ── WaitlistEntries (4 adet) ──
  const waitlistData = [
    { guestIdx: 0, cabIdx: 0, daysFromNow: 3, duration: 2 },
    { guestIdx: 2, cabIdx: 1, daysFromNow: 5, duration: 1 },
    { guestIdx: 5, cabIdx: 2, daysFromNow: 7, duration: 3 },
    { guestIdx: 8, cabIdx: 3, daysFromNow: 10, duration: 2 },
  ];

  for (let i = 0; i < waitlistData.length; i++) {
    const w = waitlistData[i];
    const wlId = `wl-seed-${i.toString().padStart(2, "0")}`;
    const existing = await prisma.waitlistEntry.findFirst({
      where: { id: wlId },
    });
    if (!existing) {
      const desiredStart = new Date(today.getTime() + w.daysFromNow * dayMs);
      const desiredEnd = new Date(desiredStart.getTime() + w.duration * dayMs);
      await prisma.waitlistEntry.create({
        data: {
          id: wlId,
          cabanaId: allCabanas[w.cabIdx % allCabanas.length].id,
          userId: casinoUser.id,
          guestName: guests[w.guestIdx].name,
          desiredStart,
          desiredEnd,
          notes: i === 0 ? "VIP misafir, öncelikli bildirim isteniyor" : null,
          isNotified: false,
        },
      });
    }
  }

  // ── Reviews (3 adet — CHECKED_OUT rezervasyonlara) ──
  const checkedOutReservations = reservations.filter(
    (r) => r.status === ReservationStatus.CHECKED_OUT,
  );

  const reviewData = [
    { rating: 5, comment: "Mükemmel hizmet, kesinlikle tekrar geleceğiz!" },
    {
      rating: 4,
      comment:
        "Çok güzel bir deneyimdi, küçük aksaklıklar vardı ama genel olarak harika.",
    },
    { rating: 5, comment: "VIP hizmet kalitesi gerçekten üst düzeydi." },
  ];

  for (
    let i = 0;
    i < Math.min(reviewData.length, checkedOutReservations.length);
    i++
  ) {
    const rez = checkedOutReservations[i];
    const existing = await prisma.review.findFirst({
      where: { reservationId: rez.id },
    });
    if (!existing) {
      await prisma.review.create({
        data: {
          reservationId: rez.id,
          userId: casinoUser.id,
          rating: reviewData[i].rating,
          comment: reviewData[i].comment,
        },
      });
    }
  }

  // ── BlackoutDates (3 adet) ──
  const blackoutData = [
    { daysFromNow: 20, duration: 2, reason: "Bakım ve onarım" },
    { daysFromNow: 30, duration: 3, reason: "Özel etkinlik rezervasyonu" },
    { daysFromNow: 45, duration: 1, reason: "Teknik kontrol" },
  ];

  for (let i = 0; i < blackoutData.length; i++) {
    const b = blackoutData[i];
    const bdId = `blackout-seed-${i.toString().padStart(2, "0")}`;
    const existing = await prisma.blackoutDate.findFirst({
      where: { id: bdId },
    });
    if (!existing) {
      const startDate = new Date(today.getTime() + b.daysFromNow * dayMs);
      const endDate = new Date(startDate.getTime() + b.duration * dayMs);
      await prisma.blackoutDate.create({
        data: {
          id: bdId,
          cabanaId: allCabanas[i % allCabanas.length].id,
          startDate,
          endDate,
          reason: b.reason,
          createdBy: admin.id,
        },
      });
    }
  }

  console.log("Seeding completed!");
  console.log(
    `Created users: ${systemAdmin.username}, ${admin.username}, ${casinoUser.username}, ${fnbUser.username}`,
  );
  console.log(`Created classes: Standart, Premium, VIP, Aile`);
  console.log(
    `Created product groups: İçecekler, Yiyecekler, Hizmetler, Eğlence & Aktivite, Spa & Wellness`,
  );
  console.log(`Created 18 products across 5 groups`);
  console.log(`Created ${cabanas.length} cabanas`);
  console.log(`Created ${guests.length} guests`);
  console.log(`Created ${reservations.length} reservations`);
  console.log(`Created 8 FnB orders`);
  console.log(`Created 5 notifications`);
  console.log(`Created 5 extra services with prices`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
