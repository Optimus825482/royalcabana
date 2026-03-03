import { PrismaClient, Role } from "@prisma/client";
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

  // Örnek Kabana Sınıfları
  const standardClass = await prisma.cabanaClass.upsert({
    where: { name: "Standart Kabana" },
    update: {},
    create: {
      name: "Standart Kabana",
      description: "Temel konfor ve hizmetler sunan standart kabana sınıfı",
      defaults: JSON.stringify({ capacity: 2, view: "sea" }),
    },
  });

  const premiumClass = await prisma.cabanaClass.upsert({
    where: { name: "Premium Kabana" },
    update: {},
    create: {
      name: "Premium Kabana",
      description:
        "Üst düzey konfor ve özel hizmetler sunan premium kabana sınıfı",
      defaults: JSON.stringify({ capacity: 4, view: "sea", privatePool: true }),
    },
  });

  const vipClass = await prisma.cabanaClass.upsert({
    where: { name: "VIP Kabana" },
    update: {},
    create: {
      name: "VIP Kabana",
      description:
        "En üst düzey lüks ve kişiselleştirilmiş hizmet sunan VIP kabana",
      defaults: JSON.stringify({
        capacity: 6,
        view: "panoramic",
        privatePool: true,
        butler: true,
      }),
    },
  });

  const familyClass = await prisma.cabanaClass.upsert({
    where: { name: "Aile Kabana" },
    update: {},
    create: {
      name: "Aile Kabana",
      description:
        "Aileler için geniş alan ve çocuk dostu hizmetler sunan kabana",
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

  // ===== KABANALAR — Görseldeki yerleşim planına göre =====
  // Harita boyutu: 1040×678 piksel (sonnn.png)
  // Koordinatlar (coordX, coordY) = piksel cinsinden (0,0 sol-üst köşe)
  // Hava fotoğrafı + kroki eşleşmesine göre düzenlenmiştir.

  const cabanas = [
    // ─── SOL DENİZ PLATFORMU — L-şekil, 8 kabana (2×2 üst + 2×2 alt) ──
    // Üst sol çift
    {
      name: "Kabana-01",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 454.05,
      coordY: 282.76,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-02",
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
      name: "Kabana-07",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 376.98,
      coordY: 442.07,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-08",
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
      name: "Kabana-03",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 372.5,
      coordY: 242.27,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-04",
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
      name: "Kabana-05",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 455.83,
      coordY: 400.83,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-06",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 438.52,
      coordY: 430.5,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },

    // ─── KIYI BOYUNCA — 4 standart kabana, kıyı hattında sıralı ───────
    {
      name: "Kabana-09",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 343.4,
      coordY: 502.22,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-10",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 510.31,
      coordY: 582.25,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-11",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 525.7,
      coordY: 551.66,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-12",
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
      name: "Kabana-13",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 538.98,
      coordY: 403.17,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-14",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 523.16,
      coordY: 433.39,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-15",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 505.28,
      coordY: 463.61,
      rotation: 150,
      scaleX: 1.7,
      scaleY: 1.5,
    },

    // ─── ANA DENİZ PLATFORMU (artı/+ şekli) — 10 kabana ──────────────
    // Sol kol (yukarıdan aşağı): 16 → 17 → 18
    {
      name: "Kabana-16",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 846.99,
      coordY: 432.73,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-17",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 845.93,
      coordY: 468.42,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-18",
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
      name: "Kabana-25",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 933.57,
      coordY: 432.06,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 1.5,
    },
    {
      name: "Kabana-24",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 935.03,
      coordY: 466.71,
      rotation: 0,
      scaleX: 1.8,
      scaleY: 1.5,
    },
    {
      name: "Kabana-23",
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
      name: "Kabana-19",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 787.79,
      coordY: 546.09,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 2.4,
    },
    {
      name: "Kabana-20",
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
      name: "Kabana-22",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 991.57,
      coordY: 600.5,
      rotation: 0,
      scaleX: 1.7,
      scaleY: 2.3,
    },
    {
      name: "Kabana-21",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 992.26,
      coordY: 548.04,
      rotation: 0,
      scaleX: 1.9,
      scaleY: 2.2,
    },

    // ─── VIP KABANALAR — Kıyıda, merkez iskele yakını, büyük ─────────
    {
      name: "VIP Kabana-26",
      classId: vipClass.id,
      conceptId: premiumConcept.id,
      coordX: 539.08,
      coordY: 202.39,
      rotation: 0,
      scaleX: 1.3,
      scaleY: 1.5,
    },
    {
      name: "VIP Kabana-27",
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

  // ===== ÖRNEK KABANA FİYATLARI =====
  // Bugünden itibaren 30 gün için örnek günlük fiyatlar
  const allCabanas = await prisma.cabana.findMany({
    where: { deletedAt: null },
  });
  const today = new Date();

  // Sınıf bazlı günlük fiyat haritası
  const classBasePrices: Record<string, number> = {
    [standardClass.id]: 5000,
    [premiumClass.id]: 8500,
    [vipClass.id]: 15000,
    [familyClass.id]: 7000,
  };

  for (const cab of allCabanas) {
    const basePrice = classBasePrices[cab.classId] ?? 5000;
    for (let d = 0; d < 30; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];
      // Hafta sonu %20 artış
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dailyPrice = isWeekend ? basePrice * 1.2 : basePrice;

      await prisma.cabanaPrice.upsert({
        where: { cabanaId_date: { cabanaId: cab.id, date: new Date(dateStr) } },
        update: { dailyPrice },
        create: { cabanaId: cab.id, date: new Date(dateStr), dailyPrice },
      });
    }
  }

  // Kabana fiyat aralıkları (sezonluk)
  const currentYear = today.getFullYear();
  // Önce mevcut sezonluk fiyat aralıklarını temizle
  await prisma.cabanaPriceRange.deleteMany({
    where: {
      cabanaId: { in: allCabanas.map((c) => c.id) },
      startDate: { gte: new Date(`${currentYear}-01-01`) },
    },
  });

  for (const cab of allCabanas) {
    const basePrice = classBasePrices[cab.classId] ?? 5000;

    // Yaz sezonu: Haziran - Ağustos (%30 artış, priority yüksek)
    await prisma.cabanaPriceRange.create({
      data: {
        cabanaId: cab.id,
        startDate: new Date(`${currentYear}-06-01`),
        endDate: new Date(`${currentYear}-08-31`),
        dailyPrice: basePrice * 1.3,
        label: "Yaz Sezonu",
        priority: 10,
      },
    });

    // Bahar kampanyası: Nisan - Mayıs (%10 indirim)
    await prisma.cabanaPriceRange.create({
      data: {
        cabanaId: cab.id,
        startDate: new Date(`${currentYear}-04-01`),
        endDate: new Date(`${currentYear}-05-31`),
        dailyPrice: basePrice * 0.9,
        label: "Bahar Kampanyası",
        priority: 5,
      },
    });
  }

  // ===== ÖRNEK KONSEPT FİYATLARI =====
  // Her konseptin ürünlerine özel fiyatlar
  const conceptProducts = await prisma.conceptProduct.findMany({
    include: { product: true },
  });

  for (const cp of conceptProducts) {
    // Konsept fiyatı = ürünün satış fiyatının %85'i (konsept indirimi)
    const conceptPrice = Number(cp.product.salePrice) * 0.85;
    await prisma.conceptPrice.upsert({
      where: {
        conceptId_productId: {
          conceptId: cp.conceptId,
          productId: cp.productId,
        },
      },
      update: { price: conceptPrice },
      create: {
        conceptId: cp.conceptId,
        productId: cp.productId,
        price: conceptPrice,
      },
    });
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
