import { prisma as defaultPrisma } from "@/lib/prisma";
import { Prisma, ReservationStatus } from "@prisma/client";
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
    customRequestPrice?: number;
    reservationId?: string;
  }): Promise<PriceBreakdown> {
    const {
      conceptId,
      startDate,
      endDate,
      extraItems = [],
      reservationId,
    } = params;

    const items: PriceLineItem[] = [];
    const days = this.daysBetween(startDate, endDate);
    const priceSource: PriceBreakdown["priceSource"] = "GENERAL";

    // ── Paralel veri çekme: bağımsız sorguları aynı anda başlat ──
    const conceptDataPromise = conceptId
      ? Promise.all([
          this.prisma.conceptProduct.findMany({
            where: { conceptId },
            include: { product: true },
          }),
          this.prisma.concept.findUnique({
            where: { id: conceptId },
            select: { serviceFee: true },
          }),
        ])
      : Promise.resolve(null);

    const extraProductsPromise =
      extraItems.length > 0
        ? this.prisma.product.findMany({
            where: { id: { in: extraItems.map((e) => e.productId) } },
          })
        : Promise.resolve([]);

    const [conceptData, extraProducts] = await Promise.all([
      conceptDataPromise,
      extraProductsPromise,
    ]);

    // ── 1. Konsept Ürün Fiyatları (Product.salePrice × quantity) ──────────────
    let conceptTotal = 0;

    if (conceptData) {
      const [conceptProducts, conceptInfo] = conceptData;

      for (const cp of conceptProducts) {
        const unitPrice = toNum(cp.product.salePrice);
        const stayDays = Math.max(days, 1);
        const totalQty = cp.quantity * stayDays;
        const total = unitPrice * totalQty;
        conceptTotal += total;

        items.push({
          name: cp.product.name,
          quantity: totalQty,
          unitPrice,
          total,
          source: "GENERAL",
        });
      }

      // Service fee
      const serviceFee = toNum(conceptInfo?.serviceFee);
      if (serviceFee > 0) {
        const stayDays = Math.max(days, 1);
        const serviceFeeTotal = serviceFee * stayDays;
        conceptTotal += serviceFeeTotal;
        items.push({
          name: "Konsept Hizmet Ücreti",
          quantity: stayDays,
          unitPrice: serviceFee,
          total: serviceFeeTotal,
          source: "GENERAL",
        });
      }
    }

    // ── 2. Ekstra Kalemler (ExtraServicePrice × quantity) ─────────────────────
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

    // ── 3. Onaylı Ekstra Talepler (ReservationExtraRequest) ──────────────────
    let extraRequestsTotal = 0;

    if (reservationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const approvedExtras = await (
        this.prisma as any
      ).reservationExtraRequest.findMany({
        where: {
          reservationId,
          status: "APPROVED",
          unitPrice: { not: null },
        },
        include: { product: { select: { name: true } } },
      });

      for (const er of approvedExtras) {
        const price = toNum(er.unitPrice);
        const total = price * er.quantity;
        extraRequestsTotal += total;

        items.push({
          name:
            er.type === "PRODUCT"
              ? (er.product?.name ?? "Ekstra Ürün")
              : (er.customName ?? "Özel Talep"),
          quantity: er.quantity,
          unitPrice: price,
          total,
          source: "GENERAL",
        });
      }
    }

    // ── 4. Grand Total ────────────────────────────────────────────────────────
    const grandTotal = conceptTotal + extrasTotal + extraRequestsTotal;

    return {
      days,
      cabanaDaily: 0,
      conceptTotal,
      extrasTotal,
      extraRequestsTotal,
      grandTotal,
      priceSource,
      items,
    };
  }

  /**
   * Verilen conceptId'ye sahip aktif rezervasyonların totalPrice'ını
   * PricingEngine ile yeniden hesaplar. Fire-and-forget olarak çağrılmalı.
   * CANCELLED, REJECTED, CHECKED_OUT durumlarına dokunmaz.
   */
  async recalculateReservationsByConceptId(conceptId: string): Promise<void> {
    const activeStatuses: string[] = [
      "PENDING",
      "APPROVED",
      "CHECKED_IN",
      "MODIFICATION_PENDING",
      "EXTRA_PENDING",
    ];

    const reservations = await this.prisma.reservation.findMany({
      where: {
        conceptId,
        status: { in: activeStatuses as ReservationStatus[] },
        deletedAt: null,
      },
      select: {
        id: true,
        cabanaId: true,
        conceptId: true,
        startDate: true,
        endDate: true,
        extraItems_json: true,
        customRequestPriced: true,
        customRequestPrice: true,
        cabana: { select: { conceptId: true } },
      },
    });

    for (const res of reservations) {
      try {
        const storedExtras = parseExtraItemsJson(res.extraItems_json);

        let customRequestAmount = 0;
        if (res.customRequestPriced && res.customRequestPrice) {
          customRequestAmount = Number(res.customRequestPrice);
        }

        const calculated = await this.calculatePrice({
          cabanaId: res.cabanaId,
          conceptId: res.conceptId ?? res.cabana.conceptId ?? null,
          startDate: res.startDate,
          endDate: res.endDate,
          extraItems: storedExtras,
          customRequestPrice: customRequestAmount || undefined,
          reservationId: res.id,
        });

        const newTotal = calculated.grandTotal;

        await this.prisma.reservation.update({
          where: { id: res.id },
          data: { totalPrice: new Prisma.Decimal(newTotal.toFixed(2)) },
        });
      } catch (err) {
        console.error(
          `[PricingEngine] Recalculate failed for reservation ${res.id}:`,
          err,
        );
      }
    }
  }

  /**
   * Verilen productId'yi içeren tüm concept'leri bulur ve
   * her birinin aktif rezervasyonlarını yeniden hesaplar.
   */
  async recalculateReservationsByProductId(productId: string): Promise<void> {
    const conceptProducts = await this.prisma.conceptProduct.findMany({
      where: { productId },
      select: { conceptId: true },
    });

    const conceptIds = [...new Set(conceptProducts.map((cp) => cp.conceptId))];

    await Promise.all(
      conceptIds.map((cId) => this.recalculateReservationsByConceptId(cId)),
    );
  }

  /** startDate ile endDate arasındaki gün sayısı (endDate dahil değil) */
  private daysBetween(start: Date, end: Date): number {
    const ms = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }
}

type ExtraItemEntry = { productId: string; quantity: number };

function parseExtraItemsJson(
  json: Prisma.JsonValue | null | undefined,
): ExtraItemEntry[] {
  if (!json) return [];
  if (typeof json === "string") {
    try {
      return JSON.parse(json) as ExtraItemEntry[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(json)) return json as ExtraItemEntry[];
  return [];
}
