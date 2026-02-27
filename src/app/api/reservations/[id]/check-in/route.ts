import { NextResponse } from "next/server";
import { after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";

export const POST = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const reservation = await (prisma.reservation.findUnique as any)({
      where: { id },
      include: { cabana: { select: { name: true } } },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (reservation.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Yalnızca onaylanmış rezervasyonlar için check-in yapılabilir.",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: {
          status: "CHECKED_IN" as any,
          checkInAt: now,
          checkedInBy: session.user.id,
        } as any,
        include: { cabana: { select: { name: true } } },
      }),
      prisma.reservationStatusHistory.create({
        data: {
          reservationId: id,
          fromStatus: reservation.status,
          toStatus: "CHECKED_IN" as any,
          changedBy: session.user.id,
        },
      }),
    ]);

    logAudit({
      userId: session.user.id,
      action: "CHECK_IN",
      entity: "Reservation",
      entityId: id,
      newValue: {
        status: "CHECKED_IN",
        checkInAt: now.toISOString(),
        checkedInBy: session.user.id,
      },
    });

    after(async () => {
      const cabanaName = (updated as any).cabana?.name ?? "";

      sseManager.broadcast(SSE_EVENTS.RESERVATION_CHECKED_IN, {
        reservationId: id,
        cabanaName,
        guestName: updated.guestName,
      });

      await notificationService.send({
        userId: reservation.userId,
        type: "CHECK_IN" as any,
        title: "Check-in Yapıldı",
        message: `${updated.guestName} için ${cabanaName} kabana check-in yapıldı.`,
        metadata: { reservationId: id, cabanaName },
      });
    });

    return NextResponse.json(updated);
  },
);
