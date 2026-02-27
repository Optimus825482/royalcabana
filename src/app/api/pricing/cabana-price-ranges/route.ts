import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createPriceRangeSchema } from "@/lib/validators";

// GET — Fiyat aralıklarını listele
export const GET = withAuth([Role.ADMIN, Role.SYSTEM_ADMIN], async (req) => {
  const { searchParams } = req.nextUrl;
  const cabanaId = searchParams.get("cabanaId");

  const where: Record<string, unknown> = {};
  if (cabanaId) where.cabanaId = cabanaId;

  const [priceRanges, total] = await Promise.all([
    (prisma as any).cabanaPriceRange.findMany({
      where,
      include: {
        cabana: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    (prisma as any).cabanaPriceRange.count({ where }),
  ]);

  return NextResponse.json({ priceRanges, total });
});

// POST — Yeni fiyat aralığı oluştur
export const POST = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createPriceRangeSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { cabanaId, startDate, endDate, dailyPrice, label, priority } =
      parsed.data;

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır." },
        { status: 400 },
      );
    }

    const priceRange = await (prisma as any).cabanaPriceRange.create({
      data: {
        cabanaId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        dailyPrice,
        label: label ?? null,
        priority: priority ?? 0,
      },
      include: {
        cabana: { select: { name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "CabanaPrice",
      entityId: priceRange.id,
      newValue: { cabanaId, startDate, endDate, dailyPrice, label },
    });

    return NextResponse.json(priceRange, { status: 201 });
  },
);
