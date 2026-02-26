import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalCabanas, availableCabanas, reservedCabanas, closedCabanas] =
    await Promise.all([
      prisma.cabana.count(),
      prisma.cabana.count({ where: { status: "AVAILABLE" } }),
      prisma.cabana.count({ where: { status: "RESERVED" } }),
      prisma.cabana.count({ where: { status: "CLOSED" } }),
    ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const pendingRequests = await prisma.reservation.count({
    where: { status: "PENDING" },
  });

  const [approvedThisMonth, rejectedThisMonth] = await Promise.all([
    prisma.reservation.count({
      where: { status: "APPROVED", updatedAt: { gte: monthStart } },
    }),
    prisma.reservation.count({
      where: { status: "REJECTED", updatedAt: { gte: monthStart } },
    }),
  ]);

  const revenueResult = await prisma.reservation.aggregate({
    where: { status: "APPROVED" },
    _sum: { totalPrice: true },
  });

  const revenueThisMonthResult = await prisma.reservation.aggregate({
    where: { status: "APPROVED", updatedAt: { gte: monthStart } },
    _sum: { totalPrice: true },
  });

  const occupancyRate =
    totalCabanas > 0 ? (reservedCabanas / totalCabanas) * 100 : 0;

  return NextResponse.json({
    totalCabanas,
    availableCabanas,
    reservedCabanas,
    closedCabanas,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    pendingRequests,
    approvedThisMonth,
    rejectedThisMonth,
    totalRevenue: Number(revenueResult._sum.totalPrice ?? 0),
    revenueThisMonth: Number(revenueThisMonthResult._sum.totalPrice ?? 0),
  });
}
