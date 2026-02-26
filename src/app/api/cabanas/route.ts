import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const createCabanaSchema = z.object({
  name: z.string().min(1),
  classId: z.string().cuid(),
  conceptId: z.string().cuid().optional(),
  coordX: z.number(),
  coordY: z.number(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
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
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
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

  return NextResponse.json(cabana, { status: 201 });
}
