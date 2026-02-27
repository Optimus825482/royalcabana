import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createGuestSchema } from "@/lib/validators";

export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER],
  async (req) => {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") ?? 20)),
    );
    const skip = (page - 1) * limit;
    const isBlacklisted = searchParams.get("isBlacklisted");

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isBlacklisted === "true" || isBlacklisted === "false") {
      where.isBlacklisted = isBlacklisted === "true";
    }

    const [guests, total] = await Promise.all([
      (prisma as any).guest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).guest.count({ where }),
    ]);

    return NextResponse.json({ guests, total });
  },
);

export const POST = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createGuestSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const guest = await (prisma as any).guest.create({
      data: parsed.data,
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Guest",
      entityId: guest.id,
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json(guest, { status: 201 });
  },
);
