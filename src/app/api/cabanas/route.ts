import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const createCabanaSchema = z.object({
  name: z.string().min(1),
  classId: z.string().cuid(),
  conceptId: z.string().cuid().optional(),
  coordX: z.number(),
  coordY: z.number(),
});

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const GET = withAuth(allRoles, async (req) => {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  const cabanas = await prisma.cabana.findMany({
    where: classId ? { classId } : undefined,
    include: {
      cabanaClass: { select: { id: true, name: true } },
      concept: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(cabanas);
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req, { session }) => {
  const body = await req.json();
  const parsed = createCabanaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, classId, conceptId, coordX, coordY } = parsed.data;

  const existing = await prisma.cabana.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu isimde bir kabana zaten mevcut." },
      { status: 409 },
    );
  }

  const cabana = await prisma.cabana.create({
    data: {
      name,
      classId,
      conceptId: conceptId ?? null,
      coordX,
      coordY,
    },
    include: {
      cabanaClass: { select: { id: true, name: true } },
      concept: { select: { id: true, name: true } },
    },
  });

  logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "Cabana",
    entityId: cabana.id,
    newValue: { name, classId, conceptId, coordX, coordY },
  });

  return NextResponse.json(cabana, { status: 201 });
});
