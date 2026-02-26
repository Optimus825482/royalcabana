import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

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

export const PATCH = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
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

  return NextResponse.json(updated);
});

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { params }) => {
    const id = params!.id;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
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

    return NextResponse.json({ message: "Ürün silindi." });
  },
);
