import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createGuestSchema } from "@/lib/validators";

export const GET = withAuth(
  [
    Role.ADMIN,
    Role.SYSTEM_ADMIN,
    Role.CASINO_ADMIN,
    Role.CASINO_USER,
    Role.FNB_USER,
  ],
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
    const vipLevel = searchParams.get("vipLevel");

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isBlacklisted === "true" || isBlacklisted === "false") {
      where.isBlacklisted = isBlacklisted === "true";
    }

    if (
      vipLevel &&
      ["STANDARD", "SILVER", "GOLD", "PLATINUM"].includes(vipLevel)
    ) {
      where.vipLevel = vipLevel;
    }

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: {
          _count: { select: { reservations: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.guest.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { guests, total } });
  },
  { requiredPermissions: ["guest.view"] },
);

export const POST = withAuth(
  [
    Role.ADMIN,
    Role.SYSTEM_ADMIN,
    Role.CASINO_ADMIN,
    Role.CASINO_USER,
    Role.FNB_USER,
  ],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createGuestSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    const guest = await prisma.guest.create({
      data: parsed.data,
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Guest",
      entityId: guest.id,
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: guest }, { status: 201 });
  },
  { requiredPermissions: ["guest.create"] },
);
