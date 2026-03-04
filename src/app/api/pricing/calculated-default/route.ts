import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

/**
 * GET /api/pricing/calculated-default?cabanaId=xxx
 *
 * Cabananın atanmış konseptine göre hesaplanan varsayılan günlük fiyat:
 * = SUM(Product.salePrice × quantity) + konsept hizmet ücreti
 */
export const GET = withAuth(
  adminRoles,
  async (req) => {
    const { searchParams } = new URL(req.url);
    const cabanaId = searchParams.get("cabanaId");

    if (!cabanaId) {
      return NextResponse.json({ error: "cabanaId gerekli." }, { status: 400 });
    }

    const cabana = await prisma.cabana.findFirst({
      where: { id: cabanaId, deletedAt: null },
      select: { id: true, name: true, conceptId: true },
    });

    if (!cabana) {
      return NextResponse.json(
        { error: "Cabana bulunamadı." },
        { status: 404 },
      );
    }

    if (!cabana.conceptId) {
      return NextResponse.json({
        success: true,
        data: {
          cabanaId,
          cabanaName: cabana.name,
          conceptId: null,
          conceptName: null,
          calculatedDaily: 0,
          breakdown: {
            conceptProductsTotal: 0,
            serviceFee: 0,
            products: [],
          },
        },
      });
    }

    // Konsept verisini paralel çek
    const [concept, conceptProducts] = await Promise.all([
      prisma.concept.findUnique({
        where: { id: cabana.conceptId },
        select: { id: true, name: true, serviceFee: true },
      }),
      prisma.conceptProduct.findMany({
        where: {
          conceptId: cabana.conceptId,
          product: { deletedAt: null },
        },
        include: {
          product: { select: { id: true, name: true, salePrice: true } },
        },
      }),
    ]);

    if (!concept) {
      return NextResponse.json(
        { error: "Konsept bulunamadı." },
        { status: 404 },
      );
    }

    let conceptProductsTotal = 0;
    const products: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    for (const cp of conceptProducts) {
      const unitPrice = Number(cp.product.salePrice);
      const total = unitPrice * cp.quantity;
      conceptProductsTotal += total;

      products.push({
        productId: cp.productId,
        productName: cp.product.name,
        quantity: cp.quantity,
        unitPrice,
        total,
      });
    }

    const serviceFee = Number(concept.serviceFee);
    const calculatedDaily = conceptProductsTotal + serviceFee;

    return NextResponse.json({
      success: true,
      data: {
        cabanaId,
        cabanaName: cabana.name,
        conceptId: concept.id,
        conceptName: concept.name,
        calculatedDaily,
        breakdown: {
          conceptProductsTotal,
          serviceFee,
          products,
        },
      },
    });
  },
  { requiredPermissions: ["pricing.view"] },
);
