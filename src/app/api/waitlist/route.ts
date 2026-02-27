import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createWaitlistSchema } from "@/lib/validators";

// GET — Bekleme listesi
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
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};
    if (cabanaId) where.cabanaId = cabanaId;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      (prisma as any).waitlistEntry.findMany({
        where,
        include: {
          cabana: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).waitlistEntry.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  },
);

// POST — Bekleme listesine ekle
export const POST = withAuth(
  [Role.CASINO_USER, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createWaitlistSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { cabanaId, guestName, desiredStart, desiredEnd, notes } =
      parsed.data;

    const item = await (prisma as any).waitlistEntry.create({
      data: {
        cabanaId,
        userId: session.user.id,
        guestName,
        desiredStart: new Date(desiredStart),
        desiredEnd: new Date(desiredEnd),
        notes: notes ?? null,
      },
      include: {
        cabana: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "WaitlistEntry",
      entityId: item.id,
      newValue: { cabanaId, guestName, desiredStart, desiredEnd },
    });

    return NextResponse.json(item, { status: 201 });
  },
);
