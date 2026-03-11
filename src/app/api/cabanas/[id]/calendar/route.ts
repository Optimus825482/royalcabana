import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

/**
 * GET /api/cabanas/:id/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Tek bir cabana'ya özel takvim verisi.
 * Cabana bilgileri + o cabana'nın rezervasyonları + blackout dates döner.
 */
export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async (
    req: NextRequest,
    {
      session,
      params,
    }: {
      session: { user: { id: string; role: Role } };
      params?: Record<string, string>;
    },
  ) => {
    const cabanaId = params?.id;
    if (!cabanaId) {
      return NextResponse.json(
        { success: false, error: "Cabana ID gerekli." },
        { status: 400 },
      );
    }
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    // Defaults: current month start → 60 days ahead
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 60);

    const start = startParam ? new Date(startParam) : defaultStart;
    const end = endParam ? new Date(endParam) : defaultEnd;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: "Geçersiz tarih formatı." },
        { status: 400 },
      );
    }

    // Cabana'yı bul
    const cabana = await prisma.cabana.findFirst({
      where: { id: cabanaId, deletedAt: null },
      select: {
        id: true,
        name: true,
        classId: true,
        status: true,
        isOpenForReservation: true,
        color: true,
        cabanaClass: { select: { id: true, name: true } },
        concept: { select: { id: true, name: true } },
      },
    });

    if (!cabana) {
      return NextResponse.json(
        { success: false, error: "Cabana bulunamadı." },
        { status: 404 },
      );
    }

    // Reservation filter
    const reservationWhere: Record<string, unknown> = {
      cabanaId,
      deletedAt: null,
      startDate: { lt: end },
      endDate: { gt: start },
    };

    // CASINO_USER sees only own; ADMIN/CASINO_ADMIN see all
    if (session.user.role === Role.CASINO_USER) {
      reservationWhere.userId = session.user.id;
    }

    const [reservations, blackoutDates] = await Promise.all([
      prisma.reservation.findMany({
        where: reservationWhere,
        select: {
          id: true,
          cabanaId: true,
          userId: true,
          guestName: true,
          guestId: true,
          startDate: true,
          endDate: true,
          status: true,
          totalPrice: true,
          notes: true,
          checkInAt: true,
          checkOutAt: true,
          createdAt: true,
          conceptId: true,
          concept: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
          guest: { select: { id: true, name: true, vipLevel: true } },
        },
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      }),
      prisma.blackoutDate.findMany({
        where: {
          cabanaId,
          startDate: { lt: end },
          endDate: { gt: start },
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          reason: true,
        },
      }),
    ]);

    // Stats
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(todayStr);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const monthReservations = reservations.filter(
      (r) =>
        r.status === "APPROVED" ||
        r.status === "CHECKED_IN" ||
        r.status === "PENDING",
    );

    let todayStatus: "available" | "occupied" | "pending" | "checked_in" =
      "available";
    for (const r of reservations) {
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      if (rStart < tomorrowDate && rEnd > todayDate) {
        if (r.status === "CHECKED_IN") {
          todayStatus = "checked_in";
          break;
        }
        if (r.status === "APPROVED") todayStatus = "occupied";
        if (r.status === "PENDING" && todayStatus === "available")
          todayStatus = "pending";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        cabana,
        reservations: reservations.map((r) => ({
          ...r,
          totalPrice: r.totalPrice ? parseFloat(r.totalPrice.toString()) : null,
        })),
        blackoutDates,
        stats: {
          todayStatus,
          totalReservations: monthReservations.length,
          approvedCount: reservations.filter((r) => r.status === "APPROVED")
            .length,
          pendingCount: reservations.filter((r) => r.status === "PENDING")
            .length,
          checkedInCount: reservations.filter((r) => r.status === "CHECKED_IN")
            .length,
        },
        dateRange: {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        },
      },
    });
  },
  { requiredPermissions: ["reservation.view"] },
);
