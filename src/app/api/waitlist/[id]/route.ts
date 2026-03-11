import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

// DELETE — Bekleme listesinden çıkar (kendi kaydı veya ADMIN)
export const DELETE = withAuth(
  [Role.CASINO_USER, Role.ADMIN, Role.CASINO_ADMIN, Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const entry = await (prisma as any).waitlistEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: "Bekleme listesi kaydı bulunamadı." },
        { status: 404 },
      );
    }

    // Kendi kaydı değilse ve ADMIN/CASINO_ADMIN/SYSTEM_ADMIN değilse reddet
    const isOwner = entry.userId === session.user.id;
    const isAdmin =
      session.user.role === Role.ADMIN ||
      session.user.role === Role.CASINO_ADMIN ||
      session.user.role === Role.SYSTEM_ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Bu kaydı silme yetkiniz yok." },
        { status: 403 },
      );
    }

    await (prisma as any).waitlistEntry.update({
      where: { id },
      data: {
        isNotified: true,
        notifiedAt: new Date(),
      },
    });

    logAudit({
      userId: session.user.id,
      action: "SOFT_DELETE",
      entity: "WaitlistEntry",
      entityId: id,
      oldValue: {
        cabanaId: entry.cabanaId,
        guestName: entry.guestName,
        desiredStart: entry.desiredStart,
        desiredEnd: entry.desiredEnd,
        isNotified: entry.isNotified,
      },
      newValue: {
        isNotified: true,
      },
    });

    return NextResponse.json({ success: true, data: null });
  },
  { requiredPermissions: ["reservation.delete"] },
);
