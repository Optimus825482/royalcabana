import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

export const GET = withAuth(
  [Role.SYSTEM_ADMIN],
  async () => {
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
    return NextResponse.json({ success: true, data: { cabanas } });
  },
  { requiredPermissions: ["system.config.view"] },
);

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req) => {
    const body = await req.json();
    const { cabanaId, isOpen } = body;

    if (!cabanaId || typeof isOpen !== "boolean") {
      return NextResponse.json(
        { success: false, error: "cabanaId ve isOpen alanları zorunludur" },
        { status: 400 },
      );
    }

    const cabana = await prisma.cabana.update({
      where: { id: cabanaId },
      data: { isOpenForReservation: isOpen },
      select: { id: true, name: true, isOpenForReservation: true },
    });
    return NextResponse.json({ success: true, data: cabana });
  },
  { requiredPermissions: ["system.config.update"] },
);
