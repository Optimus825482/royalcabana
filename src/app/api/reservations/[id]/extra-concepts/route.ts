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
          "Yalnızca onaylı rezervasyonlar için ek konsept talebi oluşturulabilir.",
      },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { items } = body as {
    items: Array<{ productId: string; quantity: number }>;
  };

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "En az bir ürün seçilmelidir." },
      { status: 400 },
    );
  }

  const [extraRequest] = await prisma.$transaction([
    prisma.extraConceptRequest.create({
      data: {
        reservationId: id,
        requestedBy: session.user.id,
        items: JSON.stringify(items),
        status: "PENDING",
      },
    }),
    prisma.reservation.update({
      where: { id },
      data: { status: "EXTRA_PENDING" },
    }),
    prisma.reservationStatusHistory.create({
      data: {
        reservationId: id,
        fromStatus: "APPROVED",
        toStatus: "EXTRA_PENDING",
        changedBy: session.user.id,
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
        type: "EXTRA_CONCEPT_REQUEST",
        title: "Ek Konsept Talebi",
        message: `${reservation.guestName} için ek konsept talebi oluşturuldu.`,
        metadata: { reservationId: id },
      })),
    });
  }

  return NextResponse.json(extraRequest, { status: 201 });
}
