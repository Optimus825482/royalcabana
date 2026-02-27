import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { withAuth } from "@/lib/api-middleware";

export const GET = withAuth([Role.ADMIN, Role.SYSTEM_ADMIN], async () => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalCabanas,
    availableCabanas,
    reservedCabanas,
    closedCabanas,
    pendingRequests,
    approvedThisMonth,
    rejectedThisMonth,
    revenueResult,
    revenueThisMonthResult,
  ] = await Promise.all([
    prisma.cabana.count(),
    prisma.cabana.count({ where: { status: "AVAILABLE" } }),
    prisma.cabana.count({ where: { status: "RESERVED" } }),
    prisma.cabana.count({ where: { status: "CLOSED" } }),
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count({
      where: { status: "APPROVED", updatedAt: { gte: monthStart } },
    }),
    prisma.reservation.count({
      where: { status: "REJECTED", updatedAt: { gte: monthStart } },
    }),
    prisma.reservation.aggregate({
      where: { status: "APPROVED" },
      _sum: { totalPrice: true },
    }),
    prisma.reservation.aggregate({
      where: { status: "APPROVED", updatedAt: { gte: monthStart } },
      _sum: { totalPrice: true },
    }),
  ]);

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
});
