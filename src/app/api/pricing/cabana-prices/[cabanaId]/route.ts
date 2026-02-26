import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cabanaId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { cabanaId } = await params;

  const prices = await prisma.cabanaPrice.findMany({
    where: { cabanaId },
    orderBy: { date: "asc" },
    select: { id: true, date: true, dailyPrice: true },
  });

  return NextResponse.json({ prices });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cabanaId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { cabanaId } = await params;
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json(
      { error: "date query param required" },
      { status: 400 },
    );
  }

  const dateObj = new Date(dateStr + "T00:00:00.000Z");

  const existing = await prisma.cabanaPrice.findUnique({
    where: { cabanaId_date: { cabanaId, date: dateObj } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Fiyat bulunamadı." }, { status: 404 });
  }

  await prisma.cabanaPrice.delete({
    where: { cabanaId_date: { cabanaId, date: dateObj } },
  });

  return NextResponse.json({ success: true });
}
