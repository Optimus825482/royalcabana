import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role, ReservationStatus } from "@/types";

const updateCabanaSchema = z.object({
  name: z.string().min(1).optional(),
  classId: z.string().cuid().optional(),
  conceptId: z.string().cuid().nullable().optional(),
  coordX: z.number().optional(),
  coordY: z.number().optional(),
});

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const GET = withAuth(allRoles, async (_req, { params }) => {
  const id = params!.id;

  const cabana = await prisma.cabana.findUnique({
    where: { id },
    include: {
      cabanaClass: true,
      concept: true,
      prices: { orderBy: { date: "asc" } },
    },
  });

  if (!cabana) {
    return NextResponse.json({ error: "Kabana bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(cabana);
});

export const PATCH = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
  const id = params!.id;

  const cabana = await prisma.cabana.findUnique({ where: { id } });
  if (!cabana) {
    return NextResponse.json({ error: "Kabana bulunamadı." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateCabanaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.cabana.update({
    where: { id },
    data: parsed.data,
    include: {
      cabanaClass: { select: { id: true, name: true } },
      concept: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { params }) => {
    const id = params!.id;

    const cabana = await prisma.cabana.findUnique({
      where: { id },
      include: {
        reservations: {
          where: { status: ReservationStatus.APPROVED },
          select: { id: true },
        },
      },
    });

    if (!cabana) {
      return NextResponse.json(
        { error: "Kabana bulunamadı." },
        { status: 404 },
      );
    }

    if (cabana.reservations.length > 0) {
      return NextResponse.json(
        { error: "Bu kabanada aktif rezervasyon mevcut, silinemez." },
        { status: 400 },
      );
    }

    await prisma.cabana.delete({ where: { id } });

    return NextResponse.json({ success: true });
  },
);
