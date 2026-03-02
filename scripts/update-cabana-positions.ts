/**
 * Cabana pozisyonlarını krokiye göre toplu güncelleme scripti
 * Çalıştırmak için: npx ts-node scripts/update-cabana-positions.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Görsel boyutu: 1040x678
// Krokiye göre cabana pozisyonları (piksel koordinatları)
// Sağ taraf platformu (1-15)
// Sol taraf platformu (16-25)

const cabanaPositions: Record<string, { x: number; y: number }> = {
  // === SAĞ PLATFORM (deniz tarafı - alt kısım) ===
  "Kabana-04": { x: 870, y: 580 },
  "Kabana-05": { x: 820, y: 580 },
  "Kabana-06": { x: 770, y: 530 },
  "Kabana-07": { x: 920, y: 530 },
  "Kabana-08": { x: 920, y: 480 },
  "Kabana-09": { x: 920, y: 430 },
  "Kabana-10": { x: 780, y: 400 },
  "Kabana-11": { x: 730, y: 400 },
  "Kabana-12": { x: 680, y: 350 },
  "Kabana-13": { x: 730, y: 450 },
  "Kabana-14": { x: 680, y: 450 },
  "Kabana-15": { x: 680, y: 500 },

  // === SOL PLATFORM ===
  "Kabana-16": { x: 280, y: 480 },
  "CABANA-16": { x: 280, y: 480 },
  "Kabana-17": { x: 280, y: 430 },
  "CABANA-17": { x: 280, y: 430 },
  "Kabana-18": { x: 330, y: 380 },
  "CABANA-18": { x: 330, y: 380 },
  "Kabana-19": { x: 380, y: 320 },
  "CABANA-19": { x: 380, y: 320 },
  "Kabana-20": { x: 280, y: 350 },
  "CABANA-20": { x: 280, y: 350 },
  "Kabana-21": { x: 180, y: 280 },
  "CABANA-21": { x: 180, y: 280 },
  "Kabana-22": { x: 180, y: 330 },
  "CABANA-22": { x: 180, y: 330 },
  "Kabana-23": { x: 230, y: 400 },
  "CABANA-23": { x: 230, y: 400 },
  "Kabana-24": { x: 180, y: 430 },
  "CABANA-24": { x: 180, y: 430 },
  "Kabana-25": { x: 180, y: 480 },
  "CABANA-25": { x: 180, y: 480 },

  // === ÜST KISIM ===
  "Kabana-01": { x: 480, y: 280 },
  "Kabana-02": { x: 530, y: 280 },
  "Kabana-03": { x: 480, y: 330 },
};

async function main() {
  console.log("Cabana pozisyonları güncelleniyor...\n");

  const cabanas = await prisma.cabana.findMany({
    select: { id: true, name: true, coordX: true, coordY: true },
  });

  console.log(`Toplam ${cabanas.length} cabana bulundu.\n`);

  let updated = 0;
  let skipped = 0;

  for (const cabana of cabanas) {
    const newPos = cabanaPositions[cabana.name];

    if (newPos) {
      await prisma.cabana.update({
        where: { id: cabana.id },
        data: {
          coordX: newPos.x,
          coordY: newPos.y,
        },
      });
      console.log(
        `✓ ${cabana.name}: (${cabana.coordX}, ${cabana.coordY}) → (${newPos.x}, ${newPos.y})`,
      );
      updated++;
    } else {
      console.log(`⊘ ${cabana.name}: Krokide pozisyon tanımlı değil, atlandı`);
      skipped++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Güncellenen: ${updated}`);
  console.log(`Atlanan: ${skipped}`);
  console.log(`========================================`);
}

main()
  .catch((e) => {
    console.error("Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
