/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
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

const createMinibarTypeSchema = z.object({
  name: z.string().min(2, "Minibar tipi adı en az 2 karakter olmalıdır."),
  description: z.string().optional().nullable(),
  productIds: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .optional()
    .default([]),
});

export const GET = withAuth(allRoles, async () => {
  const minibarTypes = await (prisma as any).minibarType.findMany({
    where: { isDeleted: false },
    include: {
      products: {
        include: {
          product: { select: { id: true, name: true, salePrice: true } },
        },
      },
      _count: { select: { cabanas: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: minibarTypes });
});

export const POST = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = createMinibarTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          errors: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { name, description, productIds } = parsed.data;

    const existing = await (prisma as any).minibarType.findUnique({
      where: { name },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu isimde bir minibar tipi zaten mevcut." },
        { status: 409 },
      );
    }

    const minibarType = await (prisma as any).minibarType.create({
      data: {
        name,
        description: description ?? null,
        products:
          productIds.length > 0
            ? {
                create: productIds.map((p) => ({
                  productId: p.productId,
                  quantity: p.quantity,
                })),
              }
            : undefined,
      },
      include: {
        products: {
          include: {
            product: { select: { id: true, name: true, salePrice: true } },
          },
        },
        _count: { select: { cabanas: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "MinibarType",
      entityId: minibarType.id,
      newValue: { name, description, productIds },
    });

    return NextResponse.json(
      { success: true, data: minibarType },
      { status: 201 },
    );
  },
  { requiredPermissions: ["system.config.manage"] },
);
