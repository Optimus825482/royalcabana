import { prisma as defaultPrisma } from "@/lib/prisma";
import type { PriceBreakdown, PriceLineItem } from "@/types";

type PrismaClientType = typeof defaultPrisma;

export class PricingEngine {
  private prisma: PrismaClientType;

  constructor(prismaClient?: PrismaClientType) {
    this.prisma = prismaClient ?? defaultPrisma;
  }

  async calculatePrice(params: {
    cabanaId: string;
    conceptId: string | null;
    startDate: Date;
    endDate: Date;
    extraItems?: Array<{ productId: string; quantity: number }>;
  }): Promise<PriceBreakdown> {
    const { cabanaId, conceptId, startDate, endDate, extraItems = [] } = params;

    const items: PriceLineItem[] = [];

    // ── 1. Kabana Günlük Fiyatı ──────────────────────────────────────────────
    const days = this.daysBetween(startDate, endDate);
    let cabanaDaily = 0;
    let priceSource: PriceBreakdown["priceSource"] = "GENERAL";

    if (days > 0) {
      const dateRange = this.getDateRange(startDate, endDate);

      // 1. Önce günlük spesifik fiyatlara bak (CabanaPrice)
      const cabanaPrices = await this.prisma.cabanaPrice.findMany({
        where: {
          cabanaId,
          date: { in: dateRange },
        },
      });

      // Günlük fiyat bulunan tarihleri set'e al
      const pricedDates = new Set(
        cabanaPrices.map((p: { date: Date }) => p.date.toISOString()),
      );

      // 2. Eksik günler için CabanaPriceRange'den fiyat ara
      const missingDates = dateRange.filter(
        (d) => !pricedDates.has(d.toISOString()),
      );

      let rangePriceTotal = 0;
      let rangeDayCount = 0;

      if (missingDates.length > 0) {
        const priceRanges = await this.prisma.cabanaPriceRange.findMany({
          where: {
            cabanaId,
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
          orderBy: { priority: "desc" },
        });

        for (const d of missingDates) {
          const match = (
            priceRanges as {
              startDate: Date;
              endDate: Date;
              dailyPrice: number;
            }[]
          ).find((r) => d >= r.startDate && d < r.endDate);
          if (match) {
            rangePriceTotal += match.dailyPrice;
            rangeDayCount++;
          }
        }
      }

      if (cabanaPrices.length > 0 || rangeDayCount > 0) {
        const dailyTotal = cabanaPrices.reduce(
          (sum: number, p: { dailyPrice: number }) => sum + p.dailyPrice,
          0,
        );
        cabanaDaily = dailyTotal + rangePriceTotal;
        priceSource = "CABANA_SPECIFIC";

        if (cabanaPrices.length > 0) {
          items.push({
            name: "Kabana Günlük Fiyat",
            quantity: cabanaPrices.length,
            unitPrice: dailyTotal / cabanaPrices.length,
            total: dailyTotal,
            source: "CABANA_SPECIFIC",
          });
        }
        if (rangeDayCount > 0) {
          items.push({
            name: "Kabana Sezon Fiyatı",
            quantity: rangeDayCount,
            unitPrice: rangePriceTotal / rangeDayCount,
            total: rangePriceTotal,
            source: "CABANA_SPECIFIC",
          });
        }
      }
      // Hiç fiyat kaydı yoksa cabanaDaily = 0 (fiyat belirlenmemiş)
    }

    // ── 2. Konsept Ürün Fiyatları ─────────────────────────────────────────────
    let conceptTotal = 0;

    if (conceptId) {
      const conceptProducts = await this.prisma.conceptProduct.findMany({
        where: { conceptId },
        include: { product: true },
      });

      for (const cp of conceptProducts) {
        // Önce ConceptPrice tablosunda conceptId + productId eşleşmesi ara
        const conceptPrice = await this.prisma.conceptPrice.findUnique({
          where: {
            conceptId_productId: {
              conceptId,
              productId: cp.productId,
            },
          },
        });

        let unitPrice: number;
        let source: PriceLineItem["source"];

        if (conceptPrice) {
          unitPrice = conceptPrice.price;
          source = "CONCEPT_SPECIFIC";
          if (priceSource === "GENERAL") priceSource = "CONCEPT_SPECIFIC";
        } else {
          unitPrice = cp.product.salePrice;
          source = "GENERAL";
        }

        const total = unitPrice * cp.quantity;
        conceptTotal += total;

        items.push({
          name: cp.product.name,
          quantity: cp.quantity,
          unitPrice,
          total,
          source,
        });
      }
    }

    // ── 3. Ekstra Kalemler ────────────────────────────────────────────────────
    let extrasTotal = 0;

    if (extraItems.length > 0) {
      const productIds = extraItems.map((e) => e.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      type ProductRow = { id: string; name: string; salePrice: number };
      const productMap = new Map<string, ProductRow>(
        (products as ProductRow[]).map((p) => [p.id, p]),
      );

      for (const extra of extraItems) {
        const product = productMap.get(extra.productId);
        if (!product) continue;

        const total = product.salePrice * extra.quantity;
        extrasTotal += total;

        items.push({
          name: product.name,
          quantity: extra.quantity,
          unitPrice: product.salePrice,
          total,
          source: "GENERAL",
        });
      }
    }

    // ── 4. Grand Total ────────────────────────────────────────────────────────
    const grandTotal = cabanaDaily + conceptTotal + extrasTotal;

    return {
      cabanaDaily,
      conceptTotal,
      extrasTotal,
      grandTotal,
      priceSource,
      items,
    };
  }

  /** startDate ile endDate arasındaki gün sayısı (endDate dahil değil) */
  private daysBetween(start: Date, end: Date): number {
    const ms = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  /** startDate (dahil) ile endDate (hariç) arasındaki her günün Date dizisi */
  private getDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    current.setUTCHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setUTCHours(0, 0, 0, 0);

    while (current < endNorm) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }
}
