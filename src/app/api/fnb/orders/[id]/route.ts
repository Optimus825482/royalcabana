import { NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
};

// PATCH — Sipariş durumunu güncelle
export const PATCH = withAuth(
  [Role.FNB_USER, Role.ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const body = await req.json();
    const status = body?.status as string | undefined;

    if (
      !status ||
      !["PREPARING", "READY", "DELIVERED", "CANCELLED"].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Geçersiz durum. Kabul edilen: PREPARING, READY, DELIVERED, CANCELLED",
        },
        { status: 400 },
      );
    }

    const order = await (prisma as any).fnbOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı." },
        { status: 404 },
      );
    }

    // Durum geçiş kontrolü
    if (status !== "CANCELLED") {
      const allowed = VALID_TRANSITIONS[order.status as string];
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `${order.status} durumundan ${status} durumuna geçiş yapılamaz.`,
          },
          { status: 400 },
        );
      }
    }

    const updated = await (prisma as any).fnbOrder.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
        reservation: {
          select: {
            cabana: { select: { name: true } },
            guestName: true,
          },
        },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "FnbOrder",
      entityId: id,
      oldValue: { status: order.status },
      newValue: { status },
    });

    // SSE broadcast — non-blocking (Rule 3.7)
    after(() => {
      sseManager.broadcast(SSE_EVENTS.FNB_ORDER_UPDATED, {
        orderId: id,
        status,
        previousStatus: order.status,
      });
    });

    return NextResponse.json(updated);
  },
);

// DELETE — Siparişi iptal et (sadece PREPARING durumunda)
export const DELETE = withAuth(
  [Role.FNB_USER, Role.ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const order = await (prisma as any).fnbOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı." },
        { status: 404 },
      );
    }

    if (order.status !== "PREPARING") {
      return NextResponse.json(
        {
          error:
            "Yalnızca hazırlanıyor durumundaki siparişler iptal edilebilir.",
        },
        { status: 400 },
      );
    }

    const cancelled = await (prisma as any).fnbOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "FnbOrder",
      entityId: id,
      oldValue: { status: order.status },
      newValue: { status: "CANCELLED" },
    });

    return NextResponse.json(cancelled);
  },
);
