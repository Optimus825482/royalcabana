import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

// PATCH — Fiyat aralığını güncelle
export const PATCH = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).cabanaPriceRange.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Fiyat aralığı bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { cabanaId, startDate, endDate, dailyPrice, label, priority } = body;

    // Tarih tutarlılığı kontrolü
    const effectiveStart = startDate ? new Date(startDate) : existing.startDate;
    const effectiveEnd = endDate ? new Date(endDate) : existing.endDate;

    if (effectiveStart >= effectiveEnd) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır." },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (cabanaId !== undefined) updateData.cabanaId = cabanaId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (dailyPrice !== undefined) updateData.dailyPrice = dailyPrice;
    if (label !== undefined) updateData.label = label;
    if (priority !== undefined) updateData.priority = priority;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek alan belirtilmedi." },
        { status: 400 },
      );
    }

    const updated = await (prisma as any).cabanaPriceRange.update({
      where: { id },
      data: updateData,
      include: {
        cabana: { select: { name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "CabanaPrice",
      entityId: id,
      oldValue: {
        cabanaId: existing.cabanaId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        dailyPrice: existing.dailyPrice,
      },
      newValue: updateData,
    });

    return NextResponse.json(updated);
  },
);

// DELETE — Fiyat aralığını sil (hard delete)
export const DELETE = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).cabanaPriceRange.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Fiyat aralığı bulunamadı." },
        { status: 404 },
      );
    }

    await (prisma as any).cabanaPriceRange.delete({ where: { id } });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "CabanaPrice",
      entityId: id,
      oldValue: {
        cabanaId: existing.cabanaId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        dailyPrice: existing.dailyPrice,
      },
    });

    return NextResponse.json({ success: true });
  },
);
