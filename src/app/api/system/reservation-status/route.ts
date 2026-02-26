import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const cabanas = await prisma.cabana.findMany({
    select: {
      id: true,
      name: true,
      isOpenForReservation: true,
      status: true,
      cabanaClass: {
        select: { name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ cabanas });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
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
    select: {
      id: true,
      name: true,
      isOpenForReservation: true,
    },
  });

  return NextResponse.json(cabana);
}
