import { prisma } from "@/lib/prisma";

export interface PresentationOptions {
  title?: string;
  includeImages?: boolean;
}

export class PresentationEngine {
  async generate(options: PresentationOptions = {}): Promise<Buffer> {
    const pptxgenjs = await import("pptxgenjs");
    const pptx = new pptxgenjs.default();

    pptx.layout = "LAYOUT_WIDE";
    pptx.title = options.title ?? "Royal Cabana — Sunum";

    // Slide 1: Kapak
    const cover = pptx.addSlide();
    cover.background = { color: "1a1a2e" };
    cover.addText("Royal Cabana", {
      x: 1,
      y: 2,
      w: 11,
      h: 1.5,
      fontSize: 48,
      bold: true,
      color: "d4af37",
      align: "center",
    });
    cover.addText(options.title ?? "Kabana Yönetim Sistemi", {
      x: 1,
      y: 3.8,
      w: 11,
      h: 0.8,
      fontSize: 20,
      color: "ffffff",
      align: "center",
    });
    cover.addText(new Date().toLocaleDateString("tr-TR"), {
      x: 1,
      y: 4.8,
      w: 11,
      h: 0.5,
      fontSize: 14,
      color: "aaaaaa",
      align: "center",
    });

    // Veri çek
    const [cabanas, classes, concepts] = await Promise.all([
      prisma.cabana.findMany({
        include: {
          cabanaClass: { include: { attributes: true } },
          concept: { include: { products: { include: { product: true } } } },
          prices: { orderBy: { date: "asc" }, take: 7 },
        },
        orderBy: { name: "asc" },
      }),
      prisma.cabanaClass.findMany({ include: { attributes: true } }),
      prisma.concept.findMany({
        include: { products: { include: { product: true } } },
      }),
    ]);

    // Slide 2: Kabana Sınıfları
    const classSlide = pptx.addSlide();
    classSlide.background = { color: "f8f4e8" };
    classSlide.addText("Kabana Sınıfları", {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: "1a1a2e",
    });

    const classRows: (string | { text: string; options: object })[][] = [
      [
        {
          text: "Sınıf Adı",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
        {
          text: "Açıklama",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
        {
          text: "Kabana Sayısı",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
      ],
      ...classes.map((cls) => [
        cls.name,
        cls.description.slice(0, 60),
        String(cabanas.filter((c) => c.classId === cls.id).length),
      ]),
    ];

    classSlide.addTable(
      classRows as Parameters<typeof classSlide.addTable>[0],
      {
        x: 0.5,
        y: 1.3,
        w: 12,
        colW: [3, 7, 2],
        fontSize: 12,
        border: { type: "solid", color: "cccccc" },
        autoPage: true,
      },
    );

    // Slide 3: Kabana Yerleşimi
    const layoutSlide = pptx.addSlide();
    layoutSlide.background = { color: "f8f4e8" };
    layoutSlide.addText("Kabana Yerleşimi", {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: "1a1a2e",
    });

    const cabanaRows: (string | { text: string; options: object })[][] = [
      [
        {
          text: "Kabana",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
        {
          text: "Sınıf",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
        {
          text: "Konsept",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
        {
          text: "Durum",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
      ],
      ...cabanas.map((c) => [
        c.name,
        c.cabanaClass.name,
        c.concept?.name ?? "—",
        c.status,
      ]),
    ];

    layoutSlide.addTable(
      cabanaRows as Parameters<typeof layoutSlide.addTable>[0],
      {
        x: 0.5,
        y: 1.3,
        w: 12,
        colW: [3, 3, 4, 2],
        fontSize: 11,
        border: { type: "solid", color: "cccccc" },
        autoPage: true,
      },
    );

    // Slide 4: Konseptler
    const conceptSlide = pptx.addSlide();
    conceptSlide.background = { color: "f8f4e8" };
    conceptSlide.addText("Konseptler ve Ürünler", {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: "1a1a2e",
    });

    let yPos = 1.3;
    for (const concept of concepts.slice(0, 4)) {
      conceptSlide.addText(`${concept.name}`, {
        x: 0.5,
        y: yPos,
        w: 12,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: "1a1a2e",
      });
      yPos += 0.4;

      const productList = concept.products
        .map(
          (cp) =>
            `• ${cp.product.name} — ${cp.product.salePrice.toLocaleString("tr-TR")} ₺`,
        )
        .join("\n");

      if (productList) {
        conceptSlide.addText(productList, {
          x: 1,
          y: yPos,
          w: 11,
          h: 0.5 * concept.products.length,
          fontSize: 11,
          color: "444444",
        });
        yPos += 0.4 * concept.products.length + 0.2;
      }

      if (yPos > 6.5) break;
    }

    // Slide 5: Fiyatlandırma Özeti
    const priceSlide = pptx.addSlide();
    priceSlide.background = { color: "f8f4e8" };
    priceSlide.addText("Fiyatlandırma Özeti", {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: "1a1a2e",
    });

    const priceRows: (string | { text: string; options: object })[][] = [
      [
        {
          text: "Kabana",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
        {
          text: "Tarih",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
        {
          text: "Günlük Fiyat (₺)",
          options: { bold: true, color: "ffffff", fill: { color: "1a1a2e" } },
        },
      ],
    ];

    for (const cabana of cabanas) {
      for (const price of cabana.prices.slice(0, 3)) {
        priceRows.push([
          cabana.name,
          new Date(price.date).toLocaleDateString("tr-TR"),
          price.dailyPrice.toLocaleString("tr-TR"),
        ]);
      }
    }

    if (priceRows.length > 1) {
      priceSlide.addTable(
        priceRows as Parameters<typeof priceSlide.addTable>[0],
        {
          x: 0.5,
          y: 1.3,
          w: 12,
          colW: [4, 4, 4],
          fontSize: 11,
          border: { type: "solid", color: "cccccc" },
          autoPage: true,
        },
      );
    } else {
      priceSlide.addText("Henüz fiyat tanımlanmamış.", {
        x: 0.5,
        y: 2,
        w: 12,
        h: 0.5,
        fontSize: 14,
        color: "888888",
        align: "center",
      });
    }

    // Görsel materyaller slide'ı (opsiyonel)
    if (options.includeImages) {
      const imgSlide = pptx.addSlide();
      imgSlide.background = { color: "1a1a2e" };
      imgSlide.addText("Görsel Materyaller", {
        x: 0.5,
        y: 0.3,
        w: 12,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: "d4af37",
      });
      imgSlide.addText(
        "Kabana görselleri için lütfen fiziksel kataloga başvurunuz.",
        {
          x: 1,
          y: 2.5,
          w: 11,
          h: 1,
          fontSize: 16,
          color: "ffffff",
          align: "center",
        },
      );
    }

    const buffer = await pptx.write({ outputType: "nodebuffer" });
    return buffer as Buffer;
  }
}

export const presentationEngine = new PresentationEngine();
