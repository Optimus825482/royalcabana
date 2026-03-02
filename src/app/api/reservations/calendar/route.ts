import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

/**
 * GET /api/reservations/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD&classId=xxx
 *
 * Takvim görünümü için optimize edilmiş endpoint.
 * Belirli tarih aralığındaki tüm rezervasyonları cabana bilgileriyle birlikte döner.
 * Soft-deleted kayıtlar hariç tutulur.
 */
export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async (req: NextRequest, { session }) => {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const classId = searchParams.get("classId");

    // Defaults: 7 days before → 30 days after today
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 7);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const start = startParam ? new Date(startParam) : defaultStart;
    const end = endParam ? new Date(endParam) : defaultEnd;

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: "Geçersiz tarih formatı." },
        { status: 400 },
      );
    }

    // Max range: 90 days to prevent memory issues
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      return NextResponse.json(
        {
          success: false,
          error: "Maksimum 90 günlük aralık sorgulanabilir.",
        },
        { status: 400 },
      );
    }

    // Build cabana filter
    const cabanaWhere: Record<string, unknown> = {
      deletedAt: null,
    };
    if (classId) {
      cabanaWhere.classId = classId;
    }

    // Build reservation filter
    const reservationWhere: Record<string, unknown> = {
      deletedAt: null,
      // Overlapping date range: reservation starts before range end AND ends after range start
      startDate: { lt: end },
      endDate: { gt: start },
    };

    // CASINO_USER sees only own reservations
    if (session.user.role === Role.CASINO_USER) {
      reservationWhere.userId = session.user.id;
    }

    // Parallel fetch: cabanas + reservations + blackout dates
    const [cabanas, reservations, blackoutDates] = await Promise.all([
      prisma.cabana.findMany({
        where: cabanaWhere,
        select: {
          id: true,
          name: true,
          classId: true,
          status: true,
          isOpenForReservation: true,
          color: true,
          cabanaClass: {
            select: { id: true, name: true },
          },
          concept: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.reservation.findMany({
        where: {
          ...reservationWhere,
          ...(classId && { cabana: { classId } }),
        },
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
          cabana: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
          guest: { select: { id: true, name: true, vipLevel: true } },
        },
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      }),
      prisma.blackoutDate.findMany({
        where: {
          startDate: { lt: end },
          endDate: { gt: start },
          ...(classId && { cabana: { classId } }),
        },
        select: {
          id: true,
          cabanaId: true,
          startDate: true,
          endDate: true,
          reason: true,
        },
      }),
    ]);

    // Compute daily stats
    const cabanaIds = new Set(cabanas.map((c) => c.id));
    const totalCabanas = cabanas.length;

    // Today's stats
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(todayStr);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    let occupiedToday = 0;
    let pendingToday = 0;
    let checkedInToday = 0;

    for (const r of reservations) {
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      if (
        rStart < tomorrowDate &&
        rEnd > todayDate &&
        cabanaIds.has(r.cabanaId)
      ) {
        if (r.status === "APPROVED" || r.status === "CHECKED_IN") {
          occupiedToday++;
        }
        if (r.status === "PENDING") {
          pendingToday++;
        }
        if (r.status === "CHECKED_IN") {
          checkedInToday++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        cabanas,
        reservations: reservations.map((r) => {
          const base = {
            ...r,
            totalPrice: r.totalPrice
              ? parseFloat(r.totalPrice.toString())
              : null,
          };
          // Misafir gizliliği: isGuestPrivate ise Casino dışı roller misafir bilgilerini göremez
          if (
            (r as unknown as { isGuestPrivate?: boolean }).isGuestPrivate &&
            session.user.role !== Role.CASINO_USER
          ) {
            return {
              ...base,
              guestName: "Gizli Misafir",
              guestId: null,
              guest: null,
              notes: null,
            };
          }
          return base;
        }),
        blackoutDates,
        stats: {
          totalCabanas,
          occupiedToday,
          pendingToday,
          checkedInToday,
          availableToday: totalCabanas - occupiedToday,
          occupancyRate:
            totalCabanas > 0
              ? Math.round((occupiedToday / totalCabanas) * 100)
              : 0,
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
