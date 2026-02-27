import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createStaffSchema } from "@/lib/validators";

// GET — Personel listesi
export const GET = withAuth([Role.SYSTEM_ADMIN, Role.ADMIN], async (req) => {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );
  const skip = (page - 1) * limit;
  const search = searchParams.get("search")?.trim() || undefined;
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = { deletedAt: null };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { position: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive === "true" || isActive === "false") {
    where.isActive = isActive === "true";
  }

  const [items, total] = await Promise.all([
    (prisma as any).staff.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    (prisma as any).staff.count({ where }),
  ]);

  return NextResponse.json({ items, total });
});

// POST — Personel oluştur
export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createStaffSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const item = await (prisma as any).staff.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        position: parsed.data.position,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Staff",
      entityId: item.id,
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json(item, { status: 201 });
  },
);
