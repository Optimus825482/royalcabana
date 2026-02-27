import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createStaffTaskSchema } from "@/lib/validators";

// GET — Personel görevlerini listele
export const GET = withAuth([Role.SYSTEM_ADMIN, Role.ADMIN], async (req) => {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );
  const skip = (page - 1) * limit;
  const staffId = searchParams.get("staffId");
  const date = searchParams.get("date");
  const isCompleted = searchParams.get("isCompleted");

  const where: Record<string, unknown> = {};
  if (staffId) where.staffId = staffId;
  if (date) where.date = new Date(date);
  if (isCompleted === "true" || isCompleted === "false") {
    where.isCompleted = isCompleted === "true";
  }

  const [items, total] = await Promise.all([
    (prisma as any).staffTask.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true } },
        taskDefinition: {
          select: { id: true, title: true, category: true, priority: true },
        },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    (prisma as any).staffTask.count({ where }),
  ]);

  return NextResponse.json({ items, total });
});

// POST — Personel görevi oluştur
export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createStaffTaskSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { staffId, taskDefinitionId, title, description, date } = parsed.data;

    const item = await (prisma as any).staffTask.create({
      data: {
        staffId,
        taskDefinitionId: taskDefinitionId ?? null,
        title,
        description: description ?? null,
        date: new Date(date),
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "StaffTask",
      entityId: item.id,
      newValue: { staffId, title, date },
    });

    return NextResponse.json(item, { status: 201 });
  },
);
