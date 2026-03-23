import { NextResponse } from "next/server";
import { after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import {
  CabanaStatus,
  NotificationType,
  ReservationStatus,
  Role,
} from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";

export const POST = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.FNB_ADMIN, Role.FNB_USER],
  async (_req, { session, params }) => {
    const id = params!.id;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { cabana: { select: { name: true } } },
    });

    if (!reservation || reservation.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (reservation.status !== ReservationStatus.APPROVED) {
      return NextResponse.json(
        {
          success: false,
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
          status: ReservationStatus.CHECKED_IN,
          checkInAt: now,
          checkedInBy: session.user.id,
        },
        include: { cabana: { select: { name: true } } },
      }),
      prisma.reservationStatusHistory.create({
        data: {
          reservationId: id,
          fromStatus: reservation.status,
          toStatus: ReservationStatus.CHECKED_IN,
          changedBy: session.user.id,
        },
      }),
      prisma.cabana.update({
        where: { id: reservation.cabanaId },
        data: { status: CabanaStatus.OCCUPIED },
      }),
    ]);

    logAudit({
      userId: session.user.id,
      action: "CHECK_IN",
      entity: "Reservation",
      entityId: id,
      newValue: {
        status: ReservationStatus.CHECKED_IN,
        checkInAt: now.toISOString(),
        checkedInBy: session.user.id,
      },
    });

    after(async () => {
      const cabanaName = updated.cabana?.name ?? "";
      const guestName = updated.guestName;

      sseManager.broadcast(SSE_EVENTS.RESERVATION_CHECKED_IN, {
        reservationId: id,
        cabanaName,
        guestName,
      });

      // İşlemi yapan kullanıcı hariç tüm aktif staff kullanıcılarına push bildirimi
      const otherUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          role: { in: [Role.ADMIN, Role.SYSTEM_ADMIN, Role.FNB_USER] },
          id: { not: session.user.id },
        },
        select: { id: true },
      });

      if (otherUsers.length > 0) {
        await notificationService.sendMany(
          otherUsers.map((u) => ({
            userId: u.id,
            type: NotificationType.CHECK_IN,
            title: "Check-in Yapıldı",
            message: `${guestName} için ${cabanaName} check-in yapıldı.`,
            metadata: { reservationId: id, cabanaName },
          })),
        );
      }
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ["reservation.approve"] },
);
