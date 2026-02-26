import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== Role.CASINO_USER)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation)
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  if (reservation.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["APPROVED", "PENDING"].includes(reservation.status)) {
    return NextResponse.json(
      { error: "Bu rezervasyon için iptal talebi oluşturulamaz." },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { reason } = body;

  if (!reason?.trim()) {
    return NextResponse.json(
      { error: "İptal nedeni zorunludur." },
      { status: 400 },
    );
  }

  const [cancelRequest] = await prisma.$transaction([
    prisma.cancellationRequest.create({
      data: {
        reservationId: id,
        requestedBy: session.user.id,
        reason,
        status: "PENDING",
      },
    }),
    prisma.reservation.update({
      where: { id },
      data: { status: "MODIFICATION_PENDING" },
    }),
    prisma.reservationStatusHistory.create({
      data: {
        reservationId: id,
        fromStatus: reservation.status as "APPROVED" | "PENDING",
        toStatus: "MODIFICATION_PENDING",
        changedBy: session.user.id,
        reason: `İptal talebi: ${reason}`,
      },
    }),
  ]);

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "CANCELLATION_REQUEST",
        title: "İptal Talebi",
        message: `${reservation.guestName} için iptal talebi oluşturuldu.`,
        metadata: { reservationId: id },
      })),
    });
  }

  return NextResponse.json(cancelRequest, { status: 201 });
}
