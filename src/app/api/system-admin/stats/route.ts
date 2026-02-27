import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, ReservationStatus } from "@/types";
import { withAuth } from "@/lib/api-middleware";

// Prisma $extends ile dönen tip, bazı modellerde doğrudan erişimi kısıtlıyor.
// Projede standart pattern: (prisma as any) ile erişim.
const db = prisma as any;

export const GET = withAuth([Role.SYSTEM_ADMIN], async () => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalCabanas,
    availableCabanas,
    reservedCabanas,
    closedCabanas,
    totalUsers,
    activeUsers,
    totalGuests,
    totalProducts,
    activeProducts,
    totalReservations,
    pendingRequests,
    approvedThisMonth,
    checkedInToday,
    revenueResult,
    revenueThisMonthResult,
    totalStaff,
  ] = await Promise.all([
    db.cabana.count(),
    db.cabana.count({ where: { status: "AVAILABLE" } }),
    db.cabana.count({ where: { status: "RESERVED" } }),
    db.cabana.count({ where: { status: "CLOSED" } }),
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { isActive: true, deletedAt: null } }),
    db.guest.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.product.count({ where: { isActive: true, deletedAt: null } }),
    db.reservation.count(),
    db.reservation.count({ where: { status: ReservationStatus.PENDING } }),
    db.reservation.count({
      where: {
        status: ReservationStatus.APPROVED,
        updatedAt: { gte: monthStart },
      },
    }),
    db.reservation.count({
      where: {
        status: ReservationStatus.CHECKED_IN,
        updatedAt: { gte: todayStart },
      },
    }),
    db.reservation.aggregate({
      where: {
        status: {
          in: [
            ReservationStatus.APPROVED,
            ReservationStatus.CHECKED_IN,
            ReservationStatus.CHECKED_OUT,
          ],
        },
      },
      _sum: { totalPrice: true },
    }),
    db.reservation.aggregate({
      where: {
        status: {
          in: [
            ReservationStatus.APPROVED,
            ReservationStatus.CHECKED_IN,
            ReservationStatus.CHECKED_OUT,
          ],
        },
        createdAt: { gte: monthStart },
      },
      _sum: { totalPrice: true },
    }),
    db.staff.count({ where: { isActive: true } }),
  ]);

  const occupancyRate =
    totalCabanas > 0 ? (reservedCabanas / totalCabanas) * 100 : 0;

  return NextResponse.json({
    totalCabanas,
    availableCabanas,
    reservedCabanas,
    closedCabanas,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    totalUsers,
    activeUsers,
    totalGuests,
    totalProducts,
    activeProducts,
    totalReservations,
    pendingRequests,
    approvedThisMonth,
    checkedInToday,
    totalRevenue: Number(revenueResult._sum.totalPrice ?? 0),
    revenueThisMonth: Number(revenueThisMonthResult._sum.totalPrice ?? 0),
    totalStaff,
  });
});
