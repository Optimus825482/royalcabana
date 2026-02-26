import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { PricingEngine } from "@/lib/pricing";
import { Role } from "@/types";

// Modification approve/reject
export const POST = withAuth([Role.ADMIN], async (req, { session, params }) => {
  const reservationId = params!.id;
  const modId = params!.modId;

  const body = await req.json();
  const { action, totalPrice: manualPrice } = body as {
    action: "approve" | "reject";
    totalPrice?: number;
    reason?: string;
  };

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Geçersiz aksiyon. 'approve' veya 'reject' olmalı." },
      { status: 400 },
    );
  }

  const modRequest = await prisma.modificationRequest.findUnique({
    where: { id: modId },
    include: { reservation: { include: { cabana: true } } },
  });

  if (!modRequest || modRequest.reservationId !== reservationId) {
    return NextResponse.json(
      { error: "Değişiklik talebi bulunamadı." },
      { status: 404 },
    );
  }

  if (modRequest.status !== "PENDING") {
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
      prisma.modificationRequest.update({
        where: { id: modId },
        data: { status: "REJECTED", rejectionReason: reason },
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
          reason: `Değişiklik talebi reddedildi: ${reason}`,
        },
      }),
    ]);

    return NextResponse.json(updated);
  }

  // APPROVE — atomik çakışma kontrolü ile
  const newCabanaId = modRequest.newCabanaId ?? modRequest.reservation.cabanaId;
  const newStart = modRequest.newStartDate ?? modRequest.reservation.startDate;
  const newEnd = modRequest.newEndDate ?? modRequest.reservation.endDate;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Pessimistic lock: yeni tarih/kabana için çakışma kontrolü
        const conflicts = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM reservations
          WHERE "cabanaId" = ${newCabanaId}
            AND status = 'APPROVED'
            AND id != ${reservationId}
            AND "startDate" < ${newEnd}
            AND "endDate" > ${newStart}
          FOR UPDATE
        `;

        if (conflicts.length > 0) {
          throw new Error("CONFLICT");
        }

        // Fiyat hesapla
        const engine = new PricingEngine(tx as typeof prisma);
        const cabana = await tx.cabana.findUnique({
          where: { id: newCabanaId },
          select: { conceptId: true },
        });

        const calculated = await engine.calculatePrice({
          cabanaId: newCabanaId,
          conceptId: cabana?.conceptId ?? null,
          startDate: new Date(newStart),
          endDate: new Date(newEnd),
        });

        const finalPrice =
          manualPrice !== undefined && !isNaN(Number(manualPrice))
            ? Number(manualPrice)
            : calculated.grandTotal;

        // Eski kabana'yı AVAILABLE yap (eğer kabana değiştiyse)
        if (
          modRequest.newCabanaId &&
          modRequest.newCabanaId !== modRequest.reservation.cabanaId
        ) {
          await tx.cabana.update({
            where: { id: modRequest.reservation.cabanaId },
            data: { status: "AVAILABLE" },
          });
          await tx.cabana.update({
            where: { id: newCabanaId },
            data: { status: "RESERVED" },
          });
        }

        const updated = await tx.modificationRequest.update({
          where: { id: modId },
          data: { status: "APPROVED" },
        });

        await tx.reservation.update({
          where: { id: reservationId },
          data: {
            status: "APPROVED",
            cabanaId: newCabanaId,
            startDate: new Date(newStart),
            endDate: new Date(newEnd),
            guestName:
              modRequest.newGuestName ?? modRequest.reservation.guestName,
            totalPrice: finalPrice,
          },
        });

        await tx.reservationStatusHistory.create({
          data: {
            reservationId,
            fromStatus: "MODIFICATION_PENDING",
            toStatus: "APPROVED",
            changedBy: session.user.id,
            reason: "Değişiklik talebi onaylandı",
          },
        });

        return { modRequest: updated, calculatedPrice: calculated, finalPrice };
      },
      { isolationLevel: "Serializable", timeout: 15000 },
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "CONFLICT") {
      return NextResponse.json(
        { error: "Yeni tarih aralığında bu kabana müsait değildir." },
        { status: 409 },
      );
    }
    throw err;
  }
});
