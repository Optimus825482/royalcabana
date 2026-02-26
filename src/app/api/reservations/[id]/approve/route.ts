import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { totalPrice } = body;

  if (
    totalPrice === undefined ||
    totalPrice === null ||
    isNaN(Number(totalPrice))
  ) {
    return NextResponse.json(
      { error: "Toplam fiyat zorunludur." },
      { status: 400 },
    );
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Yalnızca bekleyen rezervasyonlar onaylanabilir." },
      { status: 400 },
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        totalPrice: Number(totalPrice),
      },
      include: {
        cabana: { select: { id: true, name: true } },
        user: { select: { id: true, username: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.reservationStatusHistory.create({
      data: {
        reservationId: params.id,
        fromStatus: "PENDING",
        toStatus: "APPROVED",
        changedBy: session.user.id,
      },
    }),
    prisma.cabana.update({
      where: { id: reservation.cabanaId },
      data: { status: "RESERVED" },
    }),
  ]);

  return NextResponse.json(updated);
}
