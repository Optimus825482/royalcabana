import { NextResponse } from "next/server";
import { after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { CabanaStatus, Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";

export const POST = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.FNB_USER],
  async (_req, { session, params }) => {
    const id = params!.id;

    const reservation = await (prisma.reservation.findUnique as any)({
      where: { id },
      include: { cabana: { select: { name: true } } },
    });

    if (!reservation || reservation.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (reservation.status !== "CHECKED_IN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yalnızca check-in yapılmış rezervasyonlar için check-out yapılabilir.",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const txOps: any[] = [
      prisma.reservation.update({
        where: { id },
        data: {
          status: "CHECKED_OUT" as any,
          checkOutAt: now,
          checkedOutBy: session.user.id,
        } as any,
        include: { cabana: { select: { name: true } } },
      }),
      prisma.reservationStatusHistory.create({
        data: {
          reservationId: id,
          fromStatus: reservation.status,
          toStatus: "CHECKED_OUT" as any,
          changedBy: session.user.id,
        },
      }),
    ];

    if (reservation.guestId) {
      txOps.push(
        (prisma as any).guest.update({
          where: { id: reservation.guestId },
          data: {
            totalVisits: { increment: 1 },
            lastVisitAt: now,
          },
        }),
      );
    }

    const otherActiveCount = await prisma.reservation.count({
      where: {
        cabanaId: reservation.cabanaId,
        id: { not: id },
        status: "CHECKED_IN" as any,
        deletedAt: null,
      },
    });

    if (otherActiveCount === 0) {
      txOps.push(
        prisma.cabana.update({
          where: { id: reservation.cabanaId },
          data: { status: CabanaStatus.AVAILABLE },
        }),
      );
    }

    const [updated] = await prisma.$transaction(txOps);

    logAudit({
      userId: session.user.id,
      action: "CHECK_OUT",
      entity: "Reservation",
      entityId: id,
      newValue: {
        status: "CHECKED_OUT",
        checkOutAt: now.toISOString(),
        checkedOutBy: session.user.id,
      },
    });

    after(async () => {
      const cabanaName = updated.cabana?.name ?? "";

      sseManager.broadcast(SSE_EVENTS.RESERVATION_CHECKED_OUT, {
        reservationId: id,
        cabanaName,
        guestName: updated.guestName,
      });

      await notificationService.send({
        userId: reservation.userId,
        type: "CHECK_OUT" as any,
        title: "Check-out Yapıldı",
        message: `${updated.guestName} için ${cabanaName} Cabana check-out yapıldı.`,
        metadata: { reservationId: id, cabanaName },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ["reservation.update"] },
);
