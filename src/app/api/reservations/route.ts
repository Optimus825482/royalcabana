import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = [
    Role.ADMIN,
    Role.SYSTEM_ADMIN,
    Role.CASINO_USER,
    Role.FNB_USER,
  ];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const cabanaId = searchParams.get("cabanaId");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (cabanaId) where.cabanaId = cabanaId;

  // CASINO_USER sadece kendi rezervasyonlarını görebilir
  if (session.user.role === Role.CASINO_USER) {
    where.userId = session.user.id;
  }

  const isFnB = session.user.role === Role.FNB_USER;

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        cabana: { select: { id: true, name: true } },
        user: { select: { id: true, username: true, email: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        ...(isFnB && {
          modifications: {
            select: {
              id: true,
              status: true,
              newStartDate: true,
              newEndDate: true,
              newGuestName: true,
            },
          },
          cancellations: { select: { id: true, status: true, reason: true } },
          extraConcepts: { select: { id: true, status: true, items: true } },
          extraItems: { include: { product: { select: { name: true } } } },
        }),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return NextResponse.json({ reservations, total });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.CASINO_USER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { cabanaId, guestName, startDate, endDate, notes } = body;

  if (!cabanaId || !guestName || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Zorunlu alanlar eksik." },
      { status: 400 },
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return NextResponse.json(
      { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır." },
      { status: 400 },
    );
  }

  if (start < new Date()) {
    return NextResponse.json(
      { error: "Geçmiş tarihler için talep oluşturulamaz." },
      { status: 400 },
    );
  }

  // Çakışma kontrolü
  const conflict = await prisma.reservation.findFirst({
    where: {
      cabanaId,
      status: "APPROVED",
      startDate: { lt: end },
      endDate: { gt: start },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "Seçilen tarih aralığında bu kabana müsait değildir." },
      { status: 409 },
    );
  }

  const reservation = await prisma.reservation.create({
    data: {
      cabanaId,
      userId: session.user.id,
      guestName,
      startDate: start,
      endDate: end,
      notes: notes ?? null,
      status: "PENDING",
    },
    include: {
      cabana: { select: { id: true, name: true } },
      user: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json(reservation, { status: 201 });
}
