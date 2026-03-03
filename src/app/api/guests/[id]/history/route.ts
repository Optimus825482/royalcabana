import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

/**
 * GET /api/guests/:id/history
 * Returns guest's past reservations with cabana, dates, duration, extras, concept info.
 * Accessible by CASINO_USER, FNB_USER, ADMIN, SYSTEM_ADMIN.
 */
export const GET = withAuth(
  [Role.CASINO_USER, Role.FNB_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
  async (_req, { params }) => {
    const id = params!.id;

    const guest = await prisma.guest.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        vipLevel: true,
        totalVisits: true,
        lastVisitAt: true,
        isBlacklisted: true,
        notes: true,
      },
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Misafir bulunamadı." },
        { status: 404 },
      );
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        guestId: id,
        deletedAt: null,
        status: { in: ["APPROVED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"] },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        totalPrice: true,
        conceptId: true,
        checkInAt: true,
        checkOutAt: true,
        createdAt: true,
        cabana: { select: { id: true, name: true } },
        concept: { select: { id: true, name: true } },
        extraItems: {
          select: {
            quantity: true,
            unitPrice: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: "desc" },
      take: 10,
    });

    const history = reservations.map((r) => {
      const days = Math.max(
        1,
        Math.ceil(
          (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      const extras = r.extraItems.map((e) => ({
        productName: e.product.name,
        quantity: e.quantity,
        unitPrice: parseFloat(String(e.unitPrice)),
      }));

      return {
        id: r.id,
        cabanaName: r.cabana.name,
        cabanaId: r.cabana.id,
        conceptName: r.concept?.name ?? null,
        startDate: r.startDate,
        endDate: r.endDate,
        days,
        status: r.status,
        totalPrice: r.totalPrice ? parseFloat(String(r.totalPrice)) : null,
        checkInAt: r.checkInAt,
        checkOutAt: r.checkOutAt,
        extras,
        hasExtras: extras.length > 0,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        guest,
        reservations: history,
        totalReservations: history.length,
        summary: {
          totalVisits: guest.totalVisits,
          lastVisitAt: guest.lastVisitAt,
          totalSpent: history.reduce((sum, r) => sum + (r.totalPrice ?? 0), 0),
          favoriteCabana: getMostFrequent(history.map((r) => r.cabanaName)),
          favoriteConcept: getMostFrequent(
            history.map((r) => r.conceptName).filter(Boolean) as string[],
          ),
        },
      },
    });
  },
);

function getMostFrequent(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const freq = new Map<string, number>();
  for (const item of arr) {
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  let max = 0;
  let result = arr[0];
  for (const [key, count] of freq) {
    if (count > max) {
      max = count;
      result = key;
    }
  }
  return result;
}
