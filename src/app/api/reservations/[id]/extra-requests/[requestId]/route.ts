import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { extraRequestPriceSchema, parseBody } from "@/lib/validators";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const PATCH = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_ADMIN],
  async (req, { session, params }) => {
    const reservationId = params!.id;
    const requestId = params!.requestId;
    const body = await req.json();

    const parsed = parseBody(extraRequestPriceSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    const { action, unitPrice, rejectionReason } = parsed.data;

    const extraReq = await db.reservationExtraRequest.findFirst({
      where: { id: requestId, reservationId },
      include: {
        product: { select: { id: true, name: true, salePrice: true } },
      },
    });

    if (!extraReq) {
      return NextResponse.json(
        { success: false, error: "Ekstra talep bulunamadı." },
        { status: 404 },
      );
    }

    if (action === "approve") {
      let price = extraReq.unitPrice;
      if (extraReq.type === "PRODUCT" && extraReq.product) {
        price = extraReq.product.salePrice;
      }

      const updated = await db.reservationExtraRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          unitPrice: price,
          pricedBy: session.user.id,
          pricedAt: new Date(),
        },
        include: {
          product: { select: { id: true, name: true, salePrice: true } },
        },
      });

      logAudit({
        userId: session.user.id,
        action: "UPDATE",
        entity: "ReservationExtraRequest",
        entityId: requestId,
        newValue: { status: "APPROVED", unitPrice: price?.toString() },
      });

      await recalcTotalPrice(reservationId);

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "reject") {
      const updated = await db.reservationExtraRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason ?? null,
        },
        include: {
          product: { select: { id: true, name: true, salePrice: true } },
        },
      });

      logAudit({
        userId: session.user.id,
        action: "UPDATE",
        entity: "ReservationExtraRequest",
        entityId: requestId,
        newValue: { status: "REJECTED", rejectionReason },
      });

      await recalcTotalPrice(reservationId);

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "price") {
      if (extraReq.type !== "CUSTOM") {
        return NextResponse.json(
          { success: false, error: "Sadece CUSTOM taleplere fiyat girilebilir." },
          { status: 400 },
        );
      }

      const updated = await db.reservationExtraRequest.update({
        where: { id: requestId },
        data: {
          unitPrice: unitPrice!,
          pricedBy: session.user.id,
          pricedAt: new Date(),
        },
        include: {
          product: { select: { id: true, name: true, salePrice: true } },
        },
      });

      logAudit({
        userId: session.user.id,
        action: "UPDATE",
        entity: "ReservationExtraRequest",
        entityId: requestId,
        newValue: { unitPrice, pricedBy: session.user.id },
      });

      if (extraReq.status === "APPROVED") {
        await recalcTotalPrice(reservationId);
      }

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: "Geçersiz işlem." },
      { status: 400 },
    );
  },
  { requiredPermissions: ["reservation.approve"] },
);

async function recalcTotalPrice(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      totalPrice: true,
      conceptId: true,
      startDate: true,
      endDate: true,
      cabanaId: true,
      extraItems_json: true,
      customRequestPrice: true,
    },
  });

  if (!reservation || !reservation.totalPrice) return;

  const { PricingEngine } = await import("@/lib/pricing");
  const engine = new PricingEngine();

  const storedExtras = reservation.extraItems_json
    ? Array.isArray(reservation.extraItems_json)
      ? (reservation.extraItems_json as Array<{ productId: string; quantity: number }>)
      : []
    : [];

  const calculated = await engine.calculatePrice({
    conceptId: reservation.conceptId,
    startDate: reservation.startDate,
    endDate: reservation.endDate,
    cabanaId: reservation.cabanaId,
    extraItems: storedExtras,
    reservationId,
  });

  let customRequestAmount = 0;
  if (reservation.customRequestPrice) {
    customRequestAmount = parseFloat(reservation.customRequestPrice.toString());
  }

  const newTotal = calculated.grandTotal + customRequestAmount;

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { totalPrice: newTotal },
  });
}
