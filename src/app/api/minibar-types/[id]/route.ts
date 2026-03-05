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

const updateMinibarTypeSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  productIds: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .optional(),
});

export const GET = withAuth(allRoles, async (_req, { params }) => {
  const id = params!.id;
  const minibarType = await (prisma as any).minibarType.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: { select: { id: true, name: true, salePrice: true } },
        },
      },
      _count: { select: { cabanas: true } },
    },
  });

  if (!minibarType) {
    return NextResponse.json(
      { success: false, error: "Minibar tipi bulunamadı." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: minibarType });
});

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const existing = await (prisma as any).minibarType.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Minibar tipi bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = updateMinibarTypeSchema.safeParse(body);
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

    const { name, description, isActive, productIds } = parsed.data;

    // Check name uniqueness if changing
    if (name && name !== existing.name) {
      const dup = await (prisma as any).minibarType.findUnique({
        where: { name },
      });
      if (dup) {
        return NextResponse.json(
          { success: false, error: "Bu isimde bir minibar tipi zaten mevcut." },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      // Update products if provided
      if (productIds !== undefined) {
        await tx.minibarTypeProduct.deleteMany({
          where: { minibarTypeId: id },
        });
        if (productIds.length > 0) {
          await tx.minibarTypeProduct.createMany({
            data: productIds.map((p: any) => ({
              minibarTypeId: id,
              productId: p.productId,
              quantity: p.quantity,
            })),
          });
        }
      }

      return tx.minibarType.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
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
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "MinibarType",
      entityId: id,
      oldValue: { name: existing.name, isActive: existing.isActive },
      newValue: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ["system.config.manage"] },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;
    const existing = await (prisma as any).minibarType.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Minibar tipi bulunamadı." },
        { status: 404 },
      );
    }

    await (prisma as any).minibarType.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "MinibarType",
      entityId: id,
      oldValue: { name: existing.name },
    });

    return NextResponse.json({ success: true, data: null });
  },
  { requiredPermissions: ["system.config.manage"] },
);
