import { NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role, NotificationType } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createFnbOrderSchema } from "@/lib/validators";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";

// GET — FnB siparişlerini listele (filtre + pagination)
export const GET = withAuth(
  [Role.FNB_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req) => {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");
    const cabanaId = searchParams.get("cabanaId");
    const today = searchParams.get("today") === "true";

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (cabanaId) where.cabanaId = cabanaId;

    if (today) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      (prisma as any).fnbOrder.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).fnbOrder.count({ where }),
    ]);

    return NextResponse.json({ orders, total });
  },
);

// POST — Yeni FnB siparişi oluştur
export const POST = withAuth([Role.FNB_USER], async (req, { session }) => {
  const body = await req.json();
  const parsed = parseBody(createFnbOrderSchema, body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { reservationId, cabanaId, notes, items } = parsed.data;

  // Rezervasyon varlık kontrolü
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      guestName: true,
      cabana: { select: { name: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  }

  const totalAmount = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0,
  );

  const order = await prisma.$transaction(async (tx: any) => {
    const created = await (tx as any).fnbOrder.create({
      data: {
        reservationId,
        cabanaId,
        notes: notes ?? null,
        status: "PREPARING",
        createdBy: session.user.id,
        items: {
          create: items.map(
            (item: {
              productId: string;
              quantity: number;
              unitPrice: number;
            }) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }),
          ),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });
    return created;
  });

  logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "FnbOrder",
    entityId: order.id,
    newValue: {
      reservationId,
      cabanaId,
      totalAmount,
      itemCount: items.length,
    },
  });

  // SSE + Bildirim — non-blocking (Rule 3.7)
  after(async () => {
    sseManager.sendToRole(Role.ADMIN, SSE_EVENTS.FNB_ORDER_CREATED, {
      orderId: order.id,
      cabanaId,
      totalAmount,
    });

    // Rezervasyon sahibine bildirim
    if (reservation.userId) {
      await notificationService.send({
        userId: reservation.userId,
        type: NotificationType.FNB_ORDER,
        title: "Yeni F&B Siparişi",
        message: `${reservation.guestName} için yeni sipariş oluşturuldu. Tutar: ${totalAmount.toFixed(2)}`,
        metadata: {
          orderId: order.id,
          reservationId,
          cabanaName: reservation.cabana?.name,
        },
      });
    }
  });

  return NextResponse.json(order, { status: 201 });
});
