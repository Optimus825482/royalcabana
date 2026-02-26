import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { rejectReservationSchema, parseBody } from "@/lib/validators";
import { Role } from "@/types";

export const POST = withAuth([Role.ADMIN], async (req, { session, params }) => {
  const id = params!.id;
  const body = await req.json();
  const parsed = parseBody(rejectReservationSchema, body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { reason } = parsed.data;

  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) {
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Yalnızca bekleyen rezervasyonlar reddedilebilir." },
      { status: 400 },
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim(),
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
        toStatus: "REJECTED",
        changedBy: session.user.id,
        reason: reason.trim(),
      },
    }),
  ]);

  return NextResponse.json(updated);
});
