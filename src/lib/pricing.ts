import { prisma as defaultPrisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { PriceBreakdown, PriceLineItem } from "@/types";

type PrismaClientType = typeof defaultPrisma;
type DecimalLike = Prisma.Decimal | number;

/** Safely convert Prisma Decimal to number */
function toNum(val: DecimalLike | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return Number(val);
}

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

    // ── Paralel veri çekme: bağımsız sorguları aynı anda başlat ──
    const cabanaPricesPromise =
      days > 0
        ? this.prisma.cabanaPrice.findMany({
            where: {
              cabanaId,
              date: { in: this.getDateRange(startDate, endDate) },
            },
          })
        : Promise.resolve([]);

    const priceRangesPromise =
      days > 0
        ? this.prisma.cabanaPriceRange.findMany({
            where: {
              cabanaId,
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            orderBy: { priority: "desc" },
          })
        : Promise.resolve([]);

    const conceptDataPromise = conceptId
      ? Promise.all([
          this.prisma.conceptProduct.findMany({
            where: { conceptId },
            include: { product: true },
          }),
          this.prisma.conceptPrice.findMany({ where: { conceptId } }),
        ])
      : Promise.resolve(null);

    const extraProductsPromise =
      extraItems.length > 0
        ? this.prisma.product.findMany({
            where: { id: { in: extraItems.map((e) => e.productId) } },
          })
        : Promise.resolve([]);

    // Tüm bağımsız sorguları paralel bekle (Rule 1.4)
    const [cabanaPrices, priceRanges, conceptData, extraProducts] =
      await Promise.all([
        cabanaPricesPromise,
        priceRangesPromise,
        conceptDataPromise,
        extraProductsPromise,
      ]);

    // ── Kabana fiyat hesaplama ──
    if (days > 0) {
      const dateRange = this.getDateRange(startDate, endDate);
      const pricedDates = new Set(
        cabanaPrices.map((p) => p.date.toISOString()),
      );
      const missingDates = dateRange.filter(
        (d) => !pricedDates.has(d.toISOString()),
      );

      let rangePriceTotal = 0;
      let rangeDayCount = 0;

      if (missingDates.length > 0) {
        for (const d of missingDates) {
          const match = priceRanges.find(
            (r) => d >= r.startDate && d < r.endDate,
          );
          if (match) {
            rangePriceTotal += toNum(match.dailyPrice);
            rangeDayCount++;
          }
        }
      }

      if (cabanaPrices.length > 0 || rangeDayCount > 0) {
        const dailyTotal = cabanaPrices.reduce(
          (sum: number, p) => sum + toNum(p.dailyPrice),
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
    }

    // ── 2. Konsept Ürün Fiyatları ─────────────────────────────────────────────
    let conceptTotal = 0;

    if (conceptData) {
      const [conceptProducts, allConceptPrices] = conceptData;
      const conceptPriceMap = new Map(
        allConceptPrices.map((cp) => [cp.productId, cp]),
      );

      for (const cp of conceptProducts) {
        const conceptPrice = conceptPriceMap.get(cp.productId);

        let unitPrice: number;
        let source: PriceLineItem["source"];

        if (conceptPrice) {
          unitPrice = toNum(conceptPrice.price);
          source = "CONCEPT_SPECIFIC";
          if (priceSource === "GENERAL") priceSource = "CONCEPT_SPECIFIC";
        } else {
          unitPrice = toNum(cp.product.salePrice);
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
      type ProductRow = {
        id: string;
        name: string;
        salePrice: DecimalLike;
      };
      const productMap = new Map<string, ProductRow>(
        (extraProducts as ProductRow[]).map((p) => [p.id, p]),
      );

      for (const extra of extraItems) {
        const product = productMap.get(extra.productId);
        if (!product) continue;

        const price = toNum(product.salePrice);
        const total = price * extra.quantity;
        extrasTotal += total;

        items.push({
          name: product.name,
          quantity: extra.quantity,
          unitPrice: price,
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
