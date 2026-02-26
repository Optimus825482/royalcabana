import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

export const GET = withAuth(adminRoles, async (_req, { params }) => {
  const cabanaId = params!.cabanaId;
  const prices = await prisma.cabanaPrice.findMany({
    where: { cabanaId },
    orderBy: { date: "asc" },
    select: { id: true, date: true, dailyPrice: true },
  });
  return NextResponse.json({ prices });
});

export const DELETE = withAuth(adminRoles, async (req, { params }) => {
  const cabanaId = params!.cabanaId;
  const { searchParams } = new URL(req.url);
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
});
