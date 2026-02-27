import { NextRequest, NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { PricingEngine } from "@/lib/pricing";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";
import { emailService } from "@/lib/email";

export const POST = withAuth([Role.ADMIN], async (req, { session, params }) => {
  const id = params!.id;
  const body = await req.json();
  const { totalPrice: manualPrice } = body;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { cabana: { select: { conceptId: true } } },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Yalnızca bekleyen rezervasyonlar onaylanabilir." },
      { status: 400 },
    );
  }

  // PricingEngine ile otomatik fiyat hesapla
  const engine = new PricingEngine();
  const calculated = await engine.calculatePrice({
    cabanaId: reservation.cabanaId,
    conceptId: reservation.cabana.conceptId ?? null,
    startDate: reservation.startDate,
    endDate: reservation.endDate,
  });

  // Admin manuel fiyat verdiyse onu kullan, yoksa hesaplanan fiyatı kullan
  const finalPrice =
    manualPrice !== undefined &&
    manualPrice !== null &&
    !isNaN(Number(manualPrice))
      ? Number(manualPrice)
      : calculated.grandTotal;

  if (finalPrice <= 0 && !manualPrice) {
    return NextResponse.json(
      {
        error: "Fiyat hesaplanamadı. Lütfen manuel fiyat girin.",
        calculatedPrice: calculated,
      },
      { status: 400 },
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: {
        status: "APPROVED",
        totalPrice: finalPrice,
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
        toStatus: "APPROVED",
        changedBy: session.user.id,
      },
    }),
    prisma.cabana.update({
      where: { id: reservation.cabanaId },
      data: { status: "RESERVED" },
    }),
  ]);

  logAudit({
    userId: session.user.id,
    action: "APPROVE",
    entity: "Reservation",
    entityId: id,
    oldValue: { status: "PENDING" },
    newValue: {
      status: "APPROVED",
      totalPrice: finalPrice,
      priceSource: manualPrice ? "MANUAL" : "AUTO",
    },
  });

  // SSE + Email + Bildirim — non-blocking
  after(async () => {
    const cabanaName = updated.cabana?.name ?? "";

    sseManager.broadcast(SSE_EVENTS.RESERVATION_APPROVED, {
      reservationId: id,
      cabanaName,
      guestName: updated.guestName,
      totalPrice: finalPrice,
    });

    await notificationService.send({
      userId: reservation.userId,
      type: NotificationType.APPROVED,
      title: "Rezervasyon Onaylandı",
      message: `${updated.guestName} için ${cabanaName} kabana rezervasyonu onaylandı. Toplam: ${finalPrice.toFixed(2)}`,
      metadata: { reservationId: id, cabanaName, totalPrice: finalPrice },
    });

    // Kullanıcının e-postasını al ve bildirim gönder
    const user = await prisma.user.findUnique({
      where: { id: reservation.userId },
      select: { email: true, username: true },
    });
    if (user?.email) {
      emailService.sendReservationApproved(user.email, {
        guestName: updated.guestName,
        cabanaName,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
      });
    }
  });

  return NextResponse.json({
    ...updated,
    priceBreakdown: calculated,
    priceSource: manualPrice ? "MANUAL" : "AUTO",
  });
});
