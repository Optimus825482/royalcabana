import { NextResponse, after } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { PricingEngine } from "@/lib/pricing";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { notificationService } from "@/services/notification.service";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
  adjustedPrice: z.number().nonnegative().optional(),
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

    const { action, rejectionReason, adjustedPrice } = parsed.data;

    const modRequest = await prisma.modificationRequest.findUnique({
      where: { id: requestId },
      include: {
        reservation: {
          select: {
            id: true,
            cabanaId: true,
            userId: true,
            guestName: true,
            startDate: true,
            endDate: true,
            status: true,
            conceptId: true,
            totalPrice: true,
            cabana: { select: { id: true, name: true, conceptId: true } },
          },
        },
      },
    });

    if (!modRequest || modRequest.reservationId !== reservationId) {
      return NextResponse.json(
        { success: false, error: "Değişiklik talebi bulunamadı." },
        { status: 404 },
      );
    }

    if (modRequest.status !== "PENDING") {
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
        prisma.modificationRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED", rejectionReason },
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
            reason: `Değişiklik talebi reddedildi: ${rejectionReason}`,
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
          userId: modRequest.reservation.userId,
          type: NotificationType.REJECTED,
          title: "Değişiklik Talebi Reddedildi",
          message: `Değişiklik talebiniz reddedildi: ${rejectionReason}`,
          metadata: {
            reservationId,
            cabanaName: modRequest.reservation.cabana?.name ?? "",
          },
        });

        sseManager.sendToUser(
          modRequest.reservation.userId,
          SSE_EVENTS.NOTIFICATION_NEW,
          {
            reservationId,
            type: "modification_rejected",
          },
        );
      });

      return NextResponse.json({ success: true, data: updatedRequest });
    }

    // ── APPROVE ── atomik çakışma kontrolü ile
    const newCabanaId =
      modRequest.newCabanaId ?? modRequest.reservation.cabanaId;
    const newStart =
      modRequest.newStartDate ?? modRequest.reservation.startDate;
    const newEnd = modRequest.newEndDate ?? modRequest.reservation.endDate;

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Pessimistic lock: çakışma kontrolü
          const conflicts = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM reservations
            WHERE "cabanaId" = ${newCabanaId}
              AND status = 'APPROVED'
              AND id != ${reservationId}
              AND "startDate" < ${newEnd}
              AND "endDate" > ${newStart}
            FOR UPDATE
          `;

          if (conflicts.length > 0) {
            throw new Error("CONFLICT");
          }

          // Fiyat hesapla
          const engine = new PricingEngine(tx as typeof prisma);
          const cabana = await tx.cabana.findUnique({
            where: { id: newCabanaId },
            select: { conceptId: true },
          });

          // Reservation'ın kendi conceptId'si varsa onu kullan
          const conceptId =
            modRequest.reservation.conceptId ?? cabana?.conceptId ?? null;

          const calculated = await engine.calculatePrice({
            cabanaId: newCabanaId,
            conceptId,
            startDate: new Date(newStart),
            endDate: new Date(newEnd),
          });

          const finalPrice = adjustedPrice ?? calculated.grandTotal;

          // Kabana değiştiyse eski kabana'yı AVAILABLE, yeni kabana'yı RESERVED yap
          if (
            modRequest.newCabanaId &&
            modRequest.newCabanaId !== modRequest.reservation.cabanaId
          ) {
            await tx.cabana.update({
              where: { id: modRequest.reservation.cabanaId },
              data: { status: "AVAILABLE" },
            });
            await tx.cabana.update({
              where: { id: newCabanaId },
              data: { status: "RESERVED" },
            });
          }

          const updated = await tx.modificationRequest.update({
            where: { id: requestId },
            data: { status: "APPROVED" },
          });

          await tx.reservation.update({
            where: { id: reservationId },
            data: {
              status: "APPROVED",
              cabanaId: newCabanaId,
              startDate: new Date(newStart),
              endDate: new Date(newEnd),
              guestName:
                modRequest.newGuestName ?? modRequest.reservation.guestName,
              totalPrice: finalPrice,
            },
          });

          await tx.reservationStatusHistory.create({
            data: {
              reservationId,
              fromStatus: "MODIFICATION_PENDING",
              toStatus: "APPROVED",
              changedBy: session.user.id,
              reason: "Değişiklik talebi onaylandı",
            },
          });

          return { modRequest: updated, calculated, finalPrice };
        },
        { isolationLevel: "Serializable", timeout: 15000 },
      );

      logAudit({
        userId: session.user.id,
        action: "APPROVE",
        entity: "Reservation",
        entityId: reservationId,
        oldValue: {
          status: "MODIFICATION_PENDING",
          cabanaId: modRequest.reservation.cabanaId,
          startDate: modRequest.reservation.startDate,
          endDate: modRequest.reservation.endDate,
        },
        newValue: {
          status: "APPROVED",
          cabanaId: newCabanaId,
          startDate: newStart,
          endDate: newEnd,
          totalPrice: result.finalPrice,
        },
      });

      after(async () => {
        await notificationService.send({
          userId: modRequest.reservation.userId,
          type: NotificationType.APPROVED,
          title: "Değişiklik Talebi Onaylandı",
          message:
            "Değişiklik talebiniz onaylandı ve rezervasyon bilgileriniz güncellendi.",
          metadata: {
            reservationId,
            cabanaName: modRequest.reservation.cabana?.name ?? "",
            totalPrice: result.finalPrice,
          },
        });

        sseManager.broadcast(SSE_EVENTS.RESERVATION_APPROVED, {
          reservationId,
          type: "modification_approved",
          totalPrice: result.finalPrice,
        });
      });

      return NextResponse.json({
        success: true,
        data: {
          modRequest: result.modRequest,
          priceBreakdown: result.calculated,
          totalPrice: result.finalPrice,
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT") {
        return NextResponse.json(
          {
            success: false,
            error: "Yeni tarih aralığında bu kabana müsait değildir.",
          },
          { status: 409 },
        );
      }
      throw err;
    }
  },
  { requiredPermissions: ["reservation.update"] },
);
