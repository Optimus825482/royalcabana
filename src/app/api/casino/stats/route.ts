import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export const GET = withAuth([Role.CASINO_USER], async (_req, { session }) => {
  const userId = session.user.id;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeReservations,
    pendingRequests,
    upcomingReservations,
    totalReservations,
    thisMonthReservations,
  ] = await Promise.all([
    prisma.reservation.count({
      where: {
        userId,
        status: "APPROVED",
        endDate: { gte: today },
        deletedAt: null,
      },
    }),
    prisma.reservation.count({
      where: { userId, status: "PENDING", deletedAt: null },
    }),
    prisma.reservation.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { gte: today, lte: sevenDaysLater },
        deletedAt: null,
      },
      select: {
        id: true,
        guestName: true,
        startDate: true,
        endDate: true,
        cabana: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    prisma.reservation.count({
      where: { userId, deletedAt: null },
    }),
    prisma.reservation.count({
      where: { userId, createdAt: { gte: monthStart }, deletedAt: null },
    }),
  ]);

  return NextResponse.json({
    activeReservations,
    pendingRequests,
    upcomingReservations: upcomingReservations.map((r) => ({
      id: r.id,
      cabanaName: r.cabana.name,
      guestName: r.guestName,
      startDate: r.startDate,
      endDate: r.endDate,
    })),
    totalReservations,
    thisMonthReservations,
  });
});
