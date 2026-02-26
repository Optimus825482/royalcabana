import { NextRequest, NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

// Cancellation approve/reject
export const POST = withAuth([Role.ADMIN], async (req, { session, params }) => {
  const reservationId = params!.id;
  const cancelId = params!.cancelId;

  const body = await req.json();
  const { action } = body as { action: "approve" | "reject"; reason?: string };

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Geçersiz aksiyon. 'approve' veya 'reject' olmalı." },
      { status: 400 },
    );
  }

  const cancelRequest = await prisma.cancellationRequest.findUnique({
    where: { id: cancelId },
    include: { reservation: true },
  });

  if (!cancelRequest || cancelRequest.reservationId !== reservationId) {
    return NextResponse.json(
      { error: "İptal talebi bulunamadı." },
      { status: 404 },
    );
  }

  if (cancelRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Bu talep zaten işlenmiş." },
      { status: 400 },
    );
  }

  // REJECT
  if (action === "reject") {
    const reason = body.reason;
    if (!reason?.trim()) {
      return NextResponse.json(
        { error: "Red nedeni zorunludur." },
        { status: 400 },
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.cancellationRequest.update({
        where: { id: cancelId },
        data: { status: "REJECTED" },
      }),
      prisma.reservation.update({
        where: { id: reservationId },
        data: { status: "APPROVED" },
      }),
      prisma.reservationStatusHistory.create({
        data: {
          reservationId,
          fromStatus: "MODIFICATION_PENDING",
          toStatus: "APPROVED",
          changedBy: session.user.id,
          reason: `İptal talebi reddedildi: ${reason}`,
        },
      }),
    ]);

    return NextResponse.json(updated);
  }

  // APPROVE — kabana'yı AVAILABLE'a çevir
  const [updated] = await prisma.$transaction([
    prisma.cancellationRequest.update({
      where: { id: cancelId },
      data: { status: "APPROVED" },
    }),
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED" },
    }),
    // Kabana'yı tekrar müsait yap
    prisma.cabana.update({
      where: { id: cancelRequest.reservation.cabanaId },
      data: { status: "AVAILABLE" },
    }),
    prisma.reservationStatusHistory.create({
      data: {
        reservationId,
        fromStatus: "MODIFICATION_PENDING",
        toStatus: "CANCELLED",
        changedBy: session.user.id,
        reason: `İptal onaylandı: ${cancelRequest.reason}`,
      },
    }),
  ]);

  // Kullanıcıya bildirim (non-blocking)
  after(async () => {
    await prisma.notification.create({
      data: {
        userId: cancelRequest.reservation.userId,
        type: "STATUS_CHANGED",
        title: "Rezervasyon İptal Edildi",
        message: "İptal talebiniz onaylandı. Rezervasyonunuz iptal edilmiştir.",
        metadata: { reservationId },
      },
    });
  });

  return NextResponse.json(updated);
});
