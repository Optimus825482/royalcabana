import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dailyPrice: z.number().positive().optional(),
  label: z.string().nullable().optional(),
  priority: z.number().int().min(0).optional(),
});

export const PATCH = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const existing = await prisma.cabanaPriceRange.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Fiyat aralığı bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);
    if (parsed.data.dailyPrice !== undefined)
      data.dailyPrice = parsed.data.dailyPrice;
    if (parsed.data.label !== undefined) data.label = parsed.data.label;
    if (parsed.data.priority !== undefined)
      data.priority = parsed.data.priority;

    const updated = await prisma.cabanaPriceRange.update({
      where: { id },
      data,
      include: { cabana: { select: { name: true } } },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "CabanaPrice",
      entityId: id,
      oldValue: {
        dailyPrice: Number(existing.dailyPrice),
        label: existing.label,
      },
      newValue: {
        dailyPrice: Number(updated.dailyPrice),
        label: updated.label,
      },
    });

    return NextResponse.json(updated);
  },
  { requiredPermissions: ["pricing.update"] },
);

export const DELETE = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const existing = await prisma.cabanaPriceRange.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Fiyat aralığı bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.cabanaPriceRange.delete({ where: { id } });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "CabanaPrice",
      entityId: id,
      oldValue: {
        cabanaId: existing.cabanaId,
        dailyPrice: Number(existing.dailyPrice),
        label: existing.label,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fiyat aralığı silindi.",
    });
  },
  { requiredPermissions: ["pricing.delete"] },
);
