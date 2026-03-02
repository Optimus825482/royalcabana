import { NextResponse, after } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { PricingEngine } from "@/lib/pricing";
import { notificationService } from "@/services/notification.service";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
  adjustedPrice: z.number().nonnegative().optional(),
});

export const PATCH = withAuth(
  [Role.FNB_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
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

    // Paralel: request + reservation bilgilerini aynı anda çek
    const [extraRequest, reservation] = await Promise.all([
      prisma.extraConceptRequest.findUnique({ where: { id: requestId } }),
      prisma.reservation.findUnique({
        where: { id: reservationId },
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
      }),
    ]);

    if (!extraRequest || extraRequest.reservationId !== reservationId) {
      return NextResponse.json(
        { success: false, error: "Ek konsept talebi bulunamadı." },
        { status: 404 },
      );
    }

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (extraRequest.status !== "PENDING") {
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
        prisma.extraConceptRequest.update({
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
            fromStatus: "EXTRA_PENDING",
            toStatus: "APPROVED",
            changedBy: session.user.id,
            reason: `Ek konsept talebi reddedildi: ${rejectionReason}`,
          },
        }),
      ]);

      logAudit({
        userId: session.user.id,
        action: "REJECT",
        entity: "Reservation",
        entityId: reservationId,
        oldValue: { status: "EXTRA_PENDING", requestId },
        newValue: { status: "APPROVED", rejectionReason },
      });

      after(async () => {
        await notificationService.send({
          userId: reservation.userId,
          type: NotificationType.REJECTED,
          title: "Ek Konsept Talebi Reddedildi",
          message: `Ek konsept talebiniz reddedildi: ${rejectionReason}`,
          metadata: {
            reservationId,
            cabanaName: reservation.cabana?.name ?? "",
          },
        });

        sseManager.sendToUser(reservation.userId, SSE_EVENTS.NOTIFICATION_NEW, {
          reservationId,
          type: "extra_concept_rejected",
        });
      });

      return NextResponse.json({ success: true, data: updatedRequest });
    }

    // ── APPROVE ──
    // Items'ı parse et
    let items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    try {
      const raw =
        typeof extraRequest.items === "string"
          ? JSON.parse(extraRequest.items)
          : extraRequest.items;
      items = Array.isArray(raw) ? raw : [];
    } catch {
      return NextResponse.json(
        { success: false, error: "Talep verileri okunamadı." },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Talep içinde ürün bulunamadı." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. ExtraConceptRequest → APPROVED
      await tx.extraConceptRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      });

      // 2. Her item için ExtraItem oluştur
      await tx.extraItem.createMany({
        data: items.map((item) => ({
          reservationId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          addedBy: session.user.id,
        })),
      });

      // 3. Mevcut tüm extra item'ları çek (yeni eklenenler dahil)
      const allExtras = await tx.extraItem.findMany({
        where: { reservationId },
        select: { productId: true, quantity: true },
      });

      // 4. PricingEngine ile toplam fiyat hesapla
      const engine = new PricingEngine(tx as typeof prisma);
      const conceptId =
        reservation.conceptId ?? reservation.cabana?.conceptId ?? null;
      const calculated = await engine.calculatePrice({
        cabanaId: reservation.cabanaId,
        conceptId,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        extraItems: allExtras.map((e) => ({
          productId: e.productId,
          quantity: e.quantity,
        })),
      });

      const finalPrice = adjustedPrice ?? calculated.grandTotal;

      // 5. Reservation güncelle
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "APPROVED",
          totalPrice: finalPrice,
        },
      });

      // 6. Status history
      await tx.reservationStatusHistory.create({
        data: {
          reservationId,
          fromStatus: "EXTRA_PENDING",
          toStatus: "APPROVED",
          changedBy: session.user.id,
          reason: "Ek konsept talebi onaylandı",
        },
      });

      return { calculated, finalPrice };
    });

    logAudit({
      userId: session.user.id,
      action: "APPROVE",
      entity: "Reservation",
      entityId: reservationId,
      oldValue: { status: "EXTRA_PENDING", requestId },
      newValue: {
        status: "APPROVED",
        totalPrice: result.finalPrice,
        extraItems: items,
      },
    });

    after(async () => {
      await notificationService.send({
        userId: reservation.userId,
        type: NotificationType.EXTRA_ADDED,
        title: "Ek Konsept Talebi Onaylandı",
        message: `Ek konsept talebiniz onaylandı. Yeni toplam: ${result.finalPrice.toFixed(2)}`,
        metadata: {
          reservationId,
          cabanaName: reservation.cabana?.name ?? "",
          totalPrice: result.finalPrice,
        },
      });

      sseManager.broadcast(SSE_EVENTS.RESERVATION_APPROVED, {
        reservationId,
        type: "extra_concept_approved",
        totalPrice: result.finalPrice,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        requestId,
        status: "APPROVED",
        priceBreakdown: result.calculated,
        totalPrice: result.finalPrice,
      },
    });
  },
  { requiredPermissions: ["reservation.update"] },
);
