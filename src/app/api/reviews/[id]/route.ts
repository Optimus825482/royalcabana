import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { parseBody } from "@/lib/validators";

const updateReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1)
    .max(5, "Puan 1-5 arasında olmalıdır.")
    .optional(),
  comment: z.string().optional().nullable(),
});

const allRoles = [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_USER];

export const PATCH = withAuth(allRoles, async (req, { session, params }) => {
  const reviewId = params?.id;
  if (!reviewId) {
    return NextResponse.json({ error: "Review ID gerekli." }, { status: 400 });
  }

  const review = await (prisma as any).review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return NextResponse.json(
      { error: "Değerlendirme bulunamadı." },
      { status: 404 },
    );
  }

  // Only own review can be updated
  if (review.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Yalnızca kendi değerlendirmenizi düzenleyebilirsiniz." },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = parseBody(updateReviewSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await (prisma as any).review.update({
    where: { id: reviewId },
    data: parsed.data,
    include: {
      reservation: {
        select: {
          id: true,
          cabana: { select: { id: true, name: true } },
        },
      },
    },
  });

  logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "Reservation",
    entityId: reviewId,
    oldValue: { rating: review.rating, comment: review.comment },
    newValue: parsed.data,
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuth(allRoles, async (req, { session, params }) => {
  const reviewId = params?.id;
  if (!reviewId) {
    return NextResponse.json({ error: "Review ID gerekli." }, { status: 400 });
  }

  const review = await (prisma as any).review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return NextResponse.json(
      { error: "Değerlendirme bulunamadı." },
      { status: 404 },
    );
  }

  // Own review or ADMIN/SYSTEM_ADMIN
  const isOwner = review.userId === session.user.id;
  const isAdmin =
    session.user.role === Role.ADMIN || session.user.role === Role.SYSTEM_ADMIN;

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "Bu değerlendirmeyi silme yetkiniz yok." },
      { status: 403 },
    );
  }

  await (prisma as any).review.delete({ where: { id: reviewId } });

  logAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "Reservation",
    entityId: reviewId,
    oldValue: { rating: review.rating, comment: review.comment },
  });

  return NextResponse.json({ success: true });
});
