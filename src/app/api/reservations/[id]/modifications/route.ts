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
  if (reservation.status !== "APPROVED") {
    return NextResponse.json(
      {
        error:
          "Yalnızca onaylı rezervasyonlar için değişiklik talebi oluşturulabilir.",
      },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { newCabanaId, newStartDate, newEndDate, newGuestName } = body;

  if (!newCabanaId && !newStartDate && !newEndDate && !newGuestName) {
    return NextResponse.json(
      { error: "En az bir değişiklik alanı belirtilmelidir." },
      { status: 400 },
    );
  }

  const [modRequest] = await prisma.$transaction([
    prisma.modificationRequest.create({
      data: {
        reservationId: id,
        requestedBy: session.user.id,
        newCabanaId: newCabanaId ?? null,
        newStartDate: newStartDate ? new Date(newStartDate) : null,
        newEndDate: newEndDate ? new Date(newEndDate) : null,
        newGuestName: newGuestName ?? null,
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
        fromStatus: "APPROVED",
        toStatus: "MODIFICATION_PENDING",
        changedBy: session.user.id,
      },
    }),
  ]);

  // Admin'lere bildirim
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "MODIFICATION_REQUEST",
        title: "Değişiklik Talebi",
        message: `${reservation.guestName} için değişiklik talebi oluşturuldu.`,
        metadata: { reservationId: id },
      })),
    });
  }

  return NextResponse.json(modRequest, { status: 201 });
}
