import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

/**
 * GET /api/pricing/cabana-daily-prices
 *
 * Tüm aktif Cabanaları, sınıfı, konsepti ve konsept bazlı
 * hesaplanan günlük fiyatla birlikte döner.
 *
 * Fiyat formülü: conceptPrice = Σ(product.salePrice × qty) + serviceFee
 * Manuel override veya sezonluk fiyatlandırma yoktur.
 */
export const GET = withAuth(
  adminRoles,
  async () => {
    // Tüm aktif Cabanalar
    const cabanas = await prisma.cabana.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        conceptId: true,
        cabanaClass: { select: { id: true, name: true } },
        concept: { select: { id: true, name: true, serviceFee: true } },
      },
    });

    // Konsepti olan Cabanaların konsept ID'leri
    const conceptIds = [
      ...new Set(cabanas.map((c) => c.conceptId).filter(Boolean) as string[]),
    ];

    // Tüm konsept ürünlerini çek
    const allConceptProducts =
      conceptIds.length > 0
        ? await prisma.conceptProduct.findMany({
            where: {
              conceptId: { in: conceptIds },
              product: { deletedAt: null },
            },
            include: {
              product: {
                select: { id: true, name: true, salePrice: true },
              },
            },
          })
        : [];

    // Konsept bazlı gruplama
    const cpByConceptId = new Map<string, typeof allConceptProducts>();
    for (const cp of allConceptProducts) {
      const arr = cpByConceptId.get(cp.conceptId) ?? [];
      arr.push(cp);
      cpByConceptId.set(cp.conceptId, arr);
    }

    // Her Cabana için hesaplanan fiyatı oluştur
    const data = cabanas.map((cabana) => {
      let calculatedDaily = 0;
      const products: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }> = [];

      if (cabana.conceptId && cabana.concept) {
        const conceptProducts = cpByConceptId.get(cabana.conceptId) ?? [];

        for (const cp of conceptProducts) {
          const unitPrice = Number(cp.product.salePrice);
          const total = unitPrice * cp.quantity;
          calculatedDaily += total;

          products.push({
            productId: cp.productId,
            productName: cp.product.name,
            quantity: cp.quantity,
            unitPrice,
            total,
          });
        }

        calculatedDaily += Number(cabana.concept.serviceFee);
      }

      return {
        id: cabana.id,
        name: cabana.name,
        className: cabana.cabanaClass.name,
        classId: cabana.cabanaClass.id,
        conceptId: cabana.conceptId,
        conceptName: cabana.concept?.name ?? null,
        calculatedDaily,
        breakdown: {
          conceptProductsTotal:
            calculatedDaily -
            (cabana.concept ? Number(cabana.concept.serviceFee) : 0),
          serviceFee: cabana.concept ? Number(cabana.concept.serviceFee) : 0,
          products,
        },
      };
    });

    return NextResponse.json({ success: true, data });
  },
  { requiredPermissions: ["pricing.view"] },
);
