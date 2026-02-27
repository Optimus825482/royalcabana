import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createRecurringBookingSchema } from "@/lib/validators";

// GET — Tekrarlayan rezervasyonları listele
export const GET = withAuth(
  [Role.CASINO_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req) => {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;
    const cabanaId = searchParams.get("cabanaId");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (cabanaId) where.cabanaId = cabanaId;
    if (isActive === "true" || isActive === "false") {
      where.isActive = isActive === "true";
    }

    const [items, total] = await Promise.all([
      (prisma as any).recurringBooking.findMany({
        where,
        include: {
          cabana: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).recurringBooking.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  },
);

// POST — Tekrarlayan rezervasyon oluştur
export const POST = withAuth(
  [Role.CASINO_USER, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createRecurringBookingSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const {
      cabanaId,
      guestName,
      pattern,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
    } = parsed.data;

    const item = await (prisma as any).recurringBooking.create({
      data: {
        cabanaId,
        userId: session.user.id,
        guestName,
        pattern,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        cabana: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "RecurringBooking",
      entityId: item.id,
      newValue: {
        cabanaId,
        guestName,
        pattern,
        dayOfWeek,
        dayOfMonth,
        startDate,
        endDate,
      },
    });

    return NextResponse.json(item, { status: 201 });
  },
);
