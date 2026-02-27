import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { parseBody } from "@/lib/validators";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

// GET — Aktif görev tanımlarını listele
export const GET = withAuth([Role.SYSTEM_ADMIN, Role.ADMIN], async (req) => {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 50),
  );
  const skip = (page - 1) * limit;
  const search = searchParams.get("search")?.trim() || undefined;
  const category = searchParams.get("category")?.trim() || undefined;

  const where: Record<string, unknown> = { deletedAt: null, isActive: true };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) {
    where.category = category;
  }

  const [items, total] = await Promise.all([
    (prisma as any).taskDefinition.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    (prisma as any).taskDefinition.count({ where }),
  ]);

  return NextResponse.json({ items, total });
});

// POST — Yeni görev tanımı oluştur
export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const item = await (prisma as any).taskDefinition.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        category: parsed.data.category ?? null,
        priority: parsed.data.priority,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "TaskDefinition",
      entityId: item.id,
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json(item, { status: 201 });
  },
);
