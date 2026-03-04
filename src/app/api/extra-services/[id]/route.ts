import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  price: z.number().min(0).optional(),
});

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const service = await prisma.extraService.findFirst({
      where: { id, isDeleted: false },
      include: {
        prices: { orderBy: { effectiveFrom: "desc" } },
      },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: "Bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: service });
  },
  { requiredPermissions: ["system.config.view"] },
);

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const existing = await prisma.extraService.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bulunamadı" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Doğrulama hatası",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { price, ...updateData } = parsed.data;

    await prisma.extraService.update({
      where: { id },
      data: updateData,
    });

    // Fiyat değişikliği varsa yeni price record oluştur (arşiv pattern)
    if (price !== undefined) {
      await prisma.extraServicePrice.create({
        data: {
          extraServiceId: id,
          price,
          changedBy: session.user.id,
        },
      });
    }

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "ExtraService",
      entityId: id,
      oldValue: { name: existing.name, isActive: existing.isActive },
      newValue: parsed.data,
    });

    const result = await prisma.extraService.findFirst({
      where: { id },
      include: { prices: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
    });

    return NextResponse.json({ success: true, data: result });
  },
  { requiredPermissions: ["system.config.update"] },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const existing = await prisma.extraService.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bulunamadı" },
        { status: 404 },
      );
    }

    await prisma.extraService.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "ExtraService",
      entityId: id,
      oldValue: { name: existing.name, isActive: existing.isActive },
    });

    return NextResponse.json({ success: true });
  },
  { requiredPermissions: ["system.config.delete"] },
);
