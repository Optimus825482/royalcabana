import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  purchasePrice: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  groupId: z.string().optional().nullable(),
});

export const GET = withAuth(allRoles, async (_req, { params }) => {
  const id = params!.id;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { group: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(product);
});

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: parsed.data,
    });

    // Record price history if prices changed
    if (
      parsed.data.purchasePrice !== undefined ||
      parsed.data.salePrice !== undefined
    ) {
      const newPurchase =
        parsed.data.purchasePrice ?? Number(product.purchasePrice);
      const newSale = parsed.data.salePrice ?? Number(product.salePrice);
      const oldPurchase = Number(product.purchasePrice);
      const oldSale = Number(product.salePrice);

      if (newPurchase !== oldPurchase || newSale !== oldSale) {
        await (prisma as any).productPriceHistory.create({
          data: {
            productId: id,
            purchasePrice: newPurchase,
            salePrice: newSale,
            source: "MANUAL",
            changedBy: session.user.id,
          },
        });
      }
    }

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Product",
      entityId: id,
      oldValue: {
        name: product.name,
        purchasePrice: Number(product.purchasePrice),
        salePrice: Number(product.salePrice),
        isActive: product.isActive,
        groupId: product.groupId,
      },
      newValue: parsed.data,
    });

    return NextResponse.json(updated);
  },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { conceptProducts: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
    }

    if (product._count.conceptProducts > 0) {
      return NextResponse.json(
        { error: "Bu ürün aktif bir konseptte kullanılıyor, silinemez." },
        { status: 409 },
      );
    }

    await prisma.product.delete({ where: { id } });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Product",
      entityId: id,
      oldValue: { name: product.name },
    });

    return NextResponse.json({ message: "Ürün silindi." });
  },
);
