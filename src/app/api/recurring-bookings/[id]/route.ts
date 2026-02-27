import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

// PATCH — isActive toggle
export const PATCH = withAuth(
  [Role.CASINO_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).recurringBooking.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tekrarlayan rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    const updated = await (prisma as any).recurringBooking.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        cabana: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "RecurringBooking",
      entityId: id,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive: updated.isActive },
    });

    return NextResponse.json(updated);
  },
);

// DELETE — Tekrarlayan rezervasyonu sil
export const DELETE = withAuth(
  [Role.CASINO_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).recurringBooking.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tekrarlayan rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM recurring_bookings WHERE id = $1`,
      id,
    );

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "RecurringBooking",
      entityId: id,
      oldValue: {
        cabanaId: existing.cabanaId,
        guestName: existing.guestName,
        pattern: existing.pattern,
      },
    });

    return NextResponse.json({ success: true });
  },
);
