import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createBlackoutDateSchema } from "@/lib/validators";

// GET — Blackout tarihlerini listele
export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_USER],
  async (req) => {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;
    const cabanaId = searchParams.get("cabanaId");

    const where: Record<string, unknown> = {};
    if (cabanaId) where.cabanaId = cabanaId;

    const [items, total] = await Promise.all([
      (prisma as any).blackoutDate.findMany({
        where,
        include: { cabana: { select: { id: true, name: true } } },
        orderBy: { startDate: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).blackoutDate.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  },
);

// POST — Blackout tarihi oluştur (SYSTEM_ADMIN only)
export const POST = withAuth([Role.SYSTEM_ADMIN], async (req, { session }) => {
  const body = await req.json();
  const parsed = parseBody(createBlackoutDateSchema, body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { cabanaId, startDate, endDate, reason } = parsed.data;

  const item = await (prisma as any).blackoutDate.create({
    data: {
      cabanaId: cabanaId ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason ?? null,
      createdBy: session.user.id,
    },
    include: { cabana: { select: { id: true, name: true } } },
  });

  logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "BlackoutDate",
    entityId: item.id,
    newValue: { cabanaId, startDate, endDate, reason },
  });

  return NextResponse.json(item, { status: 201 });
});
