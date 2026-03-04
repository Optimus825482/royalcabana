import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER],
  async (_req, { session, params }) => {
    const reservationId = params!.id;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, userId: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (
      session.user.role === Role.CASINO_USER &&
      reservation.userId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Bu rezervasyona erişim yetkiniz yok." },
        { status: 403 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extraRequests = await (prisma as any).reservationExtraRequest.findMany(
      {
        where: { reservationId },
        include: {
          product: {
            select: { id: true, name: true, salePrice: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    );

    return NextResponse.json({ success: true, data: extraRequests });
  },
  { requiredPermissions: ["reservation.view"] },
);
