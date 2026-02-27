import { NextRequest, NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { rejectReservationSchema, parseBody } from "@/lib/validators";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";
import { emailService } from "@/lib/email";

export const POST = withAuth([Role.ADMIN], async (req, { session, params }) => {
  const id = params!.id;
  const body = await req.json();
  const parsed = parseBody(rejectReservationSchema, body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { reason } = parsed.data;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { cabana: { select: { name: true } } },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Yalnızca bekleyen rezervasyonlar reddedilebilir." },
      { status: 400 },
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim(),
      },
      include: {
        cabana: { select: { id: true, name: true } },
        user: { select: { id: true, username: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.reservationStatusHistory.create({
      data: {
        reservationId: id,
        fromStatus: "PENDING",
        toStatus: "REJECTED",
        changedBy: session.user.id,
        reason: reason.trim(),
      },
    }),
  ]);

  logAudit({
    userId: session.user.id,
    action: "REJECT",
    entity: "Reservation",
    entityId: id,
    oldValue: { status: "PENDING" },
    newValue: { status: "REJECTED", reason: reason.trim() },
  });

  // SSE + Email + Bildirim — non-blocking
  after(async () => {
    const cabanaName = updated.cabana?.name ?? "";

    sseManager.broadcast(SSE_EVENTS.RESERVATION_REJECTED, {
      reservationId: id,
      cabanaName,
      guestName: updated.guestName,
      reason: reason.trim(),
    });

    await notificationService.send({
      userId: reservation.userId,
      type: NotificationType.REJECTED,
      title: "Rezervasyon Reddedildi",
      message: `${updated.guestName} için ${cabanaName} kabana rezervasyonu reddedildi. Neden: ${reason.trim()}`,
      metadata: { reservationId: id, cabanaName, reason: reason.trim() },
    });

    const user = await prisma.user.findUnique({
      where: { id: reservation.userId },
      select: { email: true, username: true },
    });
    if (user?.email) {
      emailService.sendReservationRejected(user.email, {
        guestName: updated.guestName,
        cabanaName,
        reason: reason.trim(),
      });
    }
  });

  return NextResponse.json(updated);
});
