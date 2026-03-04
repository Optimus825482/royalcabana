import { NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { PricingEngine } from "@/lib/pricing";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";
import { emailService } from "@/lib/email";

export const POST = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const body = await req.json();
    const { totalPrice: manualPrice } = body;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        cabanaId: true,
        userId: true,
        guestName: true,
        startDate: true,
        endDate: true,
        status: true,
        conceptId: true,
        extraItems_json: true,
        customRequests: true,
        customRequestPriced: true,
        customRequestPrice: true,
        cabana: { select: { conceptId: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Yalnızca bekleyen rezervasyonlar onaylanabilir." },
        { status: 400 },
      );
    }

    // Parse extraItems from reservation
    const storedExtras: Array<{ productId: string; quantity: number }> =
      reservation.extraItems_json
        ? typeof reservation.extraItems_json === "string"
          ? JSON.parse(reservation.extraItems_json)
          : (reservation.extraItems_json as Array<{
              productId: string;
              quantity: number;
            }>)
        : [];

    // PricingEngine ile otomatik fiyat hesapla
    const engine = new PricingEngine();
    const calculated = await engine.calculatePrice({
      cabanaId: reservation.cabanaId,
      conceptId: reservation.conceptId ?? reservation.cabana.conceptId ?? null,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      extraItems: storedExtras,
    });

    // Add custom request price if priced
    let customRequestAmount = 0;
    if (reservation.customRequestPriced && reservation.customRequestPrice) {
      customRequestAmount = Number(reservation.customRequestPrice);
    }

    // Approved extra request fiyatlarını topla
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = prisma as any;
    const approvedExtrasFromRequests = await dbAny.reservationExtraRequest.findMany({
      where: { reservationId: id, status: "APPROVED", unitPrice: { not: null } },
    });

    let extraRequestsTotal = 0;
    for (const er of approvedExtrasFromRequests) {
      if (er.unitPrice) {
        extraRequestsTotal += parseFloat(er.unitPrice.toString()) * er.quantity;
      }
    }

    // Fiyatlandırılmamış PENDING talepler için uyarı
    const pendingExtras = await dbAny.reservationExtraRequest.findMany({
      where: { reservationId: id, status: "PENDING" },
    });

    const unpricedCustomExtras = await dbAny.reservationExtraRequest.findMany({
      where: { reservationId: id, status: "APPROVED", type: "CUSTOM", unitPrice: null },
    });

    const autoPrice = calculated.grandTotal + customRequestAmount + extraRequestsTotal;

    // Admin manuel fiyat verdiyse onu kullan, yoksa hesaplanan fiyatı kullan
    const finalPrice =
      manualPrice !== undefined &&
      manualPrice !== null &&
      !isNaN(Number(manualPrice))
        ? Number(manualPrice)
        : autoPrice;

    if (finalPrice <= 0 && !manualPrice) {
      return NextResponse.json(
        {
          success: false,
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

      // Auto-refresh: broadcast to all users except the updater if startDate >= 1 day from now
      const msUntilStart =
        new Date(reservation.startDate).getTime() - Date.now();
      if (msUntilStart >= 24 * 60 * 60 * 1000) {
        sseManager.broadcastExcludeUser(
          session.user.id,
          SSE_EVENTS.RESERVATION_UPDATED,
          {
            reservationId: id,
            cabanaName,
            guestName: updated.guestName,
            updatedBy: session.user.id,
          },
        );
      }

      await notificationService.send({
        userId: reservation.userId,
        type: NotificationType.APPROVED,
        title: "Rezervasyon Onaylandı",
        message: `${updated.guestName} için ${cabanaName} Cabana rezervasyonu onaylandı. Toplam: ${finalPrice.toFixed(2)}`,
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
      success: true,
      data: {
        ...updated,
        priceBreakdown: calculated,
        priceSource: manualPrice ? "MANUAL" : "AUTO",
        customRequests: reservation.customRequests,
        customRequestPriced: reservation.customRequestPriced,
        hasUnpricedCustomRequest:
          !!reservation.customRequests && !reservation.customRequestPriced,
        extraRequestsTotal,
        pendingExtraRequests: pendingExtras.length,
        unpricedCustomExtras: unpricedCustomExtras.length,
      },
    });
  },
  { requiredPermissions: ["reservation.update"] },
);
