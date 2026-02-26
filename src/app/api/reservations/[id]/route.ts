import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      cabana: {
        include: {
          cabanaClass: { select: { id: true, name: true } },
          concept: { select: { id: true, name: true } },
        },
      },
      user: { select: { id: true, username: true, email: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      modifications: { orderBy: { createdAt: "desc" } },
      cancellations: { orderBy: { createdAt: "desc" } },
      extraConcepts: { orderBy: { createdAt: "desc" } },
      extraItems: {
        include: { product: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  }

  return NextResponse.json(reservation);
}
