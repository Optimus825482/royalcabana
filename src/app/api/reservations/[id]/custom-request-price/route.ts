import { NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { PricingEngine } from "@/lib/pricing";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";
import { z } from "zod";
import { parseBody } from "@/lib/validators";

const customRequestPriceSchema = z.object({
  price: z.number().nonnegative("Fiyat negatif olamaz."),
});

export const PATCH = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const body = await req.json();
    const parsed = parseBody(customRequestPriceSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    const { price } = parsed.data;

    const reservation = await prisma.reservation.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        cabanaId: true,
        userId: true,
        guestName: true,
        startDate: true,
        endDate: true,
        status: true,
        conceptId: true,
        customRequests: true,
        extraItems_json: true,
        cabana: { select: { conceptId: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (!reservation.customRequests) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu rezervasyonda liste dışı talep bulunmamaktadır.",
        },
        { status: 400 },
      );
    }

    // Recalculate total price with PricingEngine + custom request price
    const storedExtras: Array<{ productId: string; quantity: number }> =
      reservation.extraItems_json
        ? typeof reservation.extraItems_json === "string"
          ? JSON.parse(reservation.extraItems_json)
          : (reservation.extraItems_json as Array<{
              productId: string;
              quantity: number;
            }>)
        : [];

    const engine = new PricingEngine();
    const calculated = await engine.calculatePrice({
      cabanaId: reservation.cabanaId,
      conceptId: reservation.conceptId ?? reservation.cabana.conceptId ?? null,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      extraItems: storedExtras,
    });

    const newTotalPrice = calculated.grandTotal + price;

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        customRequestPriced: true,
        customRequestPrice: price,
        totalPrice: newTotalPrice,
      },
      include: {
        cabana: { select: { id: true, name: true } },
        user: { select: { id: true, username: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Reservation",
      entityId: id,
      oldValue: { customRequestPriced: false },
      newValue: {
        customRequestPriced: true,
        customRequestPrice: price,
        totalPrice: newTotalPrice,
      },
    });

    after(async () => {
      sseManager.broadcast(SSE_EVENTS.RESERVATION_UPDATED, {
        reservationId: id,
        cabanaName: updated.cabana?.name ?? "",
        guestName: updated.guestName,
        customRequestPriced: true,
      });

      await notificationService.send({
        userId: reservation.userId,
        type: NotificationType.STATUS_CHANGED,
        title: "Liste Dışı Talep Fiyatlandırıldı",
        message: `"${reservation.customRequests}" talebiniz ${price.toFixed(2)} olarak fiyatlandırıldı.`,
        metadata: {
          reservationId: id,
          customRequestPrice: price,
          cabanaName: updated.cabana?.name ?? "",
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        priceBreakdown: calculated,
        customRequestPrice: price,
        totalPrice: newTotalPrice,
      },
    });
  },
  { requiredPermissions: ["reservation.update"] },
);
