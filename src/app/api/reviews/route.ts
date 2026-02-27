import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createReviewSchema } from "@/lib/validators";

const allRoles = [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_USER];

export const GET = withAuth(allRoles, async (req, { session }) => {
  const { searchParams } = new URL(req.url);
  const cabanaId = searchParams.get("cabanaId");
  const rating = searchParams.get("rating");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
  );
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  // CASINO_USER can only see their own reviews
  if (session.user.role === Role.CASINO_USER) {
    where.userId = session.user.id;
  }

  if (cabanaId) {
    where.reservation = { cabanaId };
  }

  if (rating) {
    where.rating = parseInt(rating, 10);
  }

  const [reviews, total] = await Promise.all([
    (prisma as any).review.findMany({
      where,
      include: {
        reservation: {
          select: {
            id: true,
            cabana: { select: { id: true, name: true } },
            startDate: true,
            endDate: true,
            guestName: true,
          },
        },
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    (prisma as any).review.count({ where }),
  ]);

  return NextResponse.json({
    data: reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const POST = withAuth([Role.CASINO_USER], async (req, { session }) => {
  const body = await req.json();
  const parsed = parseBody(createReviewSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { reservationId, rating, comment } = parsed.data;

  // Verify reservation belongs to user and is CHECKED_OUT
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      userId: session.user.id,
      status: "CHECKED_OUT",
    },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Geçerli bir tamamlanmış rezervasyon bulunamadı." },
      { status: 404 },
    );
  }

  // Check if review already exists
  const existing = await (prisma as any).review.findUnique({
    where: { reservationId },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Bu rezervasyon için zaten bir değerlendirme mevcut." },
      { status: 409 },
    );
  }

  const review = await (prisma as any).review.create({
    data: {
      reservationId,
      userId: session.user.id,
      rating,
      comment: comment || null,
    },
    include: {
      reservation: {
        select: {
          id: true,
          cabana: { select: { id: true, name: true } },
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "Reservation",
    entityId: review.id,
    newValue: { reservationId, rating, comment },
  });

  return NextResponse.json(review, { status: 201 });
});
