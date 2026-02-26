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

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const { reason } = body;

  if (!reason || String(reason).trim() === "") {
    return NextResponse.json(
      { error: "Red nedeni zorunludur." },
      { status: 400 },
    );
  }

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
        rejectionReason: String(reason).trim(),
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
        reason: String(reason).trim(),
      },
    }),
  ]);

  return NextResponse.json(updated);
}
