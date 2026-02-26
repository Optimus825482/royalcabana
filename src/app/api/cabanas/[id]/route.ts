import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role, ReservationStatus } from "@/types";

const updateCabanaSchema = z.object({
  name: z.string().min(1).optional(),
  classId: z.string().cuid().optional(),
  conceptId: z.string().cuid().nullable().optional(),
  coordX: z.number().optional(),
  coordY: z.number().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const cabana = await prisma.cabana.findUnique({ where: { id } });
  if (!cabana) {
    return NextResponse.json({ error: "Kabana bulunamadı." }, { status: 404 });
  }

  const body = await request.json();
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
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

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
    return NextResponse.json({ error: "Kabana bulunamadı." }, { status: 404 });
  }

  if (cabana.reservations.length > 0) {
    return NextResponse.json(
      { error: "Bu kabanada aktif rezervasyon mevcut, silinemez." },
      { status: 400 },
    );
  }

  await prisma.cabana.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
