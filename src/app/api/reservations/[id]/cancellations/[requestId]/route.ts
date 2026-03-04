import { NextResponse, after } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { notificationService } from "@/services/notification.service";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { emailService } from "@/lib/email";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export const PATCH = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const reservationId = params!.id;
    const requestId = params!.requestId;

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Geçersiz veri.",
        },
        { status: 400 },
      );
    }

    const { action, rejectionReason } = parsed.data;

    const cancelRequest = await prisma.cancellationRequest.findUnique({
      where: { id: requestId },
      include: {
        reservation: {
          include: { cabana: { select: { id: true, name: true } } },
        },
      },
    });

    if (!cancelRequest || cancelRequest.reservationId !== reservationId) {
      return NextResponse.json(
        { success: false, error: "İptal talebi bulunamadı." },
        { status: 404 },
      );
    }

    if (cancelRequest.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Bu talep zaten işlenmiş." },
        { status: 400 },
      );
    }

    // ── REJECT ──
    if (action === "reject") {
      if (!rejectionReason?.trim()) {
        return NextResponse.json(
          { success: false, error: "Red nedeni zorunludur." },
          { status: 400 },
        );
      }

      const [updatedRequest] = await prisma.$transaction([
        prisma.cancellationRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED" },
        }),
        prisma.reservation.update({
          where: { id: reservationId },
          data: { status: "APPROVED" },
        }),
        prisma.reservationStatusHistory.create({
          data: {
            reservationId,
            fromStatus: "MODIFICATION_PENDING",
            toStatus: "APPROVED",
            changedBy: session.user.id,
            reason: `İptal talebi reddedildi: ${rejectionReason}`,
          },
        }),
      ]);

      logAudit({
        userId: session.user.id,
        action: "REJECT",
        entity: "Reservation",
        entityId: reservationId,
        oldValue: { status: "MODIFICATION_PENDING", requestId },
        newValue: { status: "APPROVED", rejectionReason },
      });

      after(async () => {
        await notificationService.send({
          userId: cancelRequest.reservation.userId,
          type: NotificationType.REJECTED,
          title: "İptal Talebi Reddedildi",
          message: `İptal talebiniz reddedildi: ${rejectionReason}. Rezervasyonunuz onaylı durumda devam ediyor.`,
          metadata: {
            reservationId,
            cabanaName: cancelRequest.reservation.cabana?.name ?? "",
          },
        });

        sseManager.sendToUser(
          cancelRequest.reservation.userId,
          SSE_EVENTS.NOTIFICATION_NEW,
          {
            reservationId,
            type: "cancellation_rejected",
          },
        );

        // Auto-refresh: broadcast to all users except the updater if startDate >= 1 day from now
        const msUntilStart =
          new Date(cancelRequest.reservation.startDate).getTime() - Date.now();
        if (msUntilStart >= 24 * 60 * 60 * 1000) {
          sseManager.broadcastExcludeUser(
            session.user.id,
            SSE_EVENTS.RESERVATION_UPDATED,
            {
              reservationId,
              cabanaName: cancelRequest.reservation.cabana?.name ?? "",
              guestName: cancelRequest.reservation.guestName,
              updatedBy: session.user.id,
            },
          );
        }
      });

      return NextResponse.json({ success: true, data: updatedRequest });
    }

    // ── APPROVE ── Cabana'yı AVAILABLE'a çevir
    const [updatedRequest] = await prisma.$transaction([
      prisma.cancellationRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      }),
      prisma.reservation.update({
        where: { id: reservationId },
        data: { status: "CANCELLED" },
      }),
      prisma.cabana.update({
        where: { id: cancelRequest.reservation.cabanaId },
        data: { status: "AVAILABLE" },
      }),
      prisma.reservationStatusHistory.create({
        data: {
          reservationId,
          fromStatus: "MODIFICATION_PENDING",
          toStatus: "CANCELLED",
          changedBy: session.user.id,
          reason: `İptal onaylandı: ${cancelRequest.reason}`,
        },
      }),
    ]);

    logAudit({
      userId: session.user.id,
      action: "APPROVE",
      entity: "Reservation",
      entityId: reservationId,
      oldValue: { status: "MODIFICATION_PENDING", requestId },
      newValue: { status: "CANCELLED" },
    });

    after(async () => {
      await notificationService.send({
        userId: cancelRequest.reservation.userId,
        type: NotificationType.APPROVED,
        title: "Rezervasyon İptal Edildi",
        message: "İptal talebiniz onaylandı. Rezervasyonunuz iptal edilmiştir.",
        metadata: {
          reservationId,
          cabanaName: cancelRequest.reservation.cabana?.name ?? "",
        },
      });

      const reqOwner = await prisma.user.findUnique({
        where: { id: cancelRequest.reservation.userId },
        select: { email: true },
      });
      if (reqOwner?.email) {
        emailService.sendReservationCancelled(reqOwner.email, {
          guestName: cancelRequest.reservation.guestName,
          cabanaName: cancelRequest.reservation.cabana?.name ?? "",
        });
      }

      sseManager.broadcast(SSE_EVENTS.RESERVATION_CANCELLED, {
        reservationId,
        cabanaId: cancelRequest.reservation.cabanaId,
        cabanaName: cancelRequest.reservation.cabana?.name ?? "",
      });

      // Auto-refresh: broadcast to all users except the updater if startDate >= 1 day from now
      const msUntilStart =
        new Date(cancelRequest.reservation.startDate).getTime() - Date.now();
      if (msUntilStart >= 24 * 60 * 60 * 1000) {
        sseManager.broadcastExcludeUser(
          session.user.id,
          SSE_EVENTS.RESERVATION_UPDATED,
          {
            reservationId,
            cabanaName: cancelRequest.reservation.cabana?.name ?? "",
            guestName: cancelRequest.reservation.guestName,
            updatedBy: session.user.id,
          },
        );
      }
    });

    return NextResponse.json({ success: true, data: updatedRequest });
  },
  { requiredPermissions: ["reservation.update"] },
);
