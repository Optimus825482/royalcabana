import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

export const GET = withAuth([Role.SYSTEM_ADMIN], async () => {
  const cabanas = await prisma.cabana.findMany({
    select: {
      id: true,
      name: true,
      isOpenForReservation: true,
      status: true,
      cabanaClass: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ cabanas });
});

export const PATCH = withAuth([Role.SYSTEM_ADMIN], async (req) => {
  const body = await req.json();
  const { cabanaId, isOpen } = body;

  if (!cabanaId || typeof isOpen !== "boolean") {
    return NextResponse.json(
      { message: "cabanaId ve isOpen alanları zorunludur" },
      { status: 400 },
    );
  }

  const cabana = await prisma.cabana.update({
    where: { id: cabanaId },
    data: { isOpenForReservation: isOpen },
    select: { id: true, name: true, isOpenForReservation: true },
  });
  return NextResponse.json(cabana);
});
