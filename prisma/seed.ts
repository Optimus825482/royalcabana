import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // SystemAdmin kullanıcısı
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const systemAdmin = await prisma.user.upsert({
    where: { username: "sysadmin" },
    update: {},
    create: {
      username: "sysadmin",
      email: "sysadmin@royalcabana.com",
      passwordHash: hashedPassword,
      role: Role.SYSTEM_ADMIN,
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@royalcabana.com",
      passwordHash: hashedPassword,
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
      passwordHash: hashedPassword,
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
      passwordHash: hashedPassword,
      role: Role.FNB_USER,
      isActive: true,
    },
  });

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
      coordX: 100,
      coordY: 340,
    },
    {
      name: "Kabana-02",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 100,
      coordY: 385,
    },
    // Üst sağ çift
    {
      name: "Kabana-07",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 168,
      coordY: 340,
    },
    {
      name: "Kabana-08",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 168,
      coordY: 385,
    },
    // Alt sol çift (platformun alt kolu)
    {
      name: "Kabana-03",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 78,
      coordY: 455,
    },
    {
      name: "Kabana-04",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 78,
      coordY: 500,
    },
    // Alt sağ çift (platformun alt kolu)
    {
      name: "Kabana-05",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 192,
      coordY: 455,
    },
    {
      name: "Kabana-06",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 192,
      coordY: 500,
    },

    // ─── KIYI BOYUNCA — 4 standart kabana, kıyı hattında sıralı ───────
    {
      name: "Kabana-09",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 285,
      coordY: 255,
    },
    {
      name: "Kabana-10",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 323,
      coordY: 255,
    },
    {
      name: "Kabana-11",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 361,
      coordY: 255,
    },
    {
      name: "Kabana-12",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 399,
      coordY: 255,
    },

    // ─── ANA DENİZ PLATFORMU (artı/+ şekli) — 10 kabana ──────────────
    // Sol kol (yukarıdan aşağı): 16 → 17 → 18
    {
      name: "Kabana-16",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 548,
      coordY: 325,
    },
    {
      name: "Kabana-17",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 548,
      coordY: 372,
    },
    {
      name: "Kabana-18",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 548,
      coordY: 419,
    },
    // Sağ kol (yukarıdan aşağı): 25 → 24 → 23
    {
      name: "Kabana-25",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 692,
      coordY: 325,
    },
    {
      name: "Kabana-24",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 692,
      coordY: 372,
    },
    {
      name: "Kabana-23",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 692,
      coordY: 419,
    },
    // Alt sol köşe: 19 (üst), 20 (alt)
    {
      name: "Kabana-19",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 563,
      coordY: 488,
    },
    {
      name: "Kabana-20",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 563,
      coordY: 535,
    },
    // Alt sağ köşe: 22 (üst), 21 (alt)
    {
      name: "Kabana-22",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 677,
      coordY: 488,
    },
    {
      name: "Kabana-21",
      classId: standardClass.id,
      conceptId: basicConcept.id,
      coordX: 677,
      coordY: 535,
    },

    // ─── VIP KABANALAR — Kıyıda, merkez iskele yakını, büyük ─────────
    {
      name: "VIP Kabana-26",
      classId: vipClass.id,
      conceptId: premiumConcept.id,
      coordX: 462,
      coordY: 268,
    },
    {
      name: "VIP Kabana-27",
      classId: vipClass.id,
      conceptId: premiumConcept.id,
      coordX: 522,
      coordY: 268,
    },
  ];

  for (const cabana of cabanas) {
    await prisma.cabana.upsert({
      where: { name: cabana.name },
      update: {
        coordX: cabana.coordX,
        coordY: cabana.coordY,
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
    update: {},
    create: {
      key: "sunset_bar_transform",
      value: JSON.stringify({
        x: 540,
        y: 280,
        scale: 1,
        rotation: 0,
        isLocked: false,
      }),
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: "blue_sea_bar_transform" },
    update: {},
    create: {
      key: "blue_sea_bar_transform",
      value: JSON.stringify({
        x: 680,
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
