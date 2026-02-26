import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { cancellationRequestSchema, parseBody } from "@/lib/validators";
import { Role } from "@/types";

export const POST = withAuth(
  [Role.CASINO_USER],
  async (req, { session, params }) => {
    const id = params!.id;
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    // IDOR: sadece kendi rezervasyonu
    if (reservation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["APPROVED", "PENDING"].includes(reservation.status)) {
      return NextResponse.json(
        { error: "Bu rezervasyon için iptal talebi oluşturulamaz." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(cancellationRequestSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { reason } = parsed.data;

    const [cancelRequest] = await prisma.$transaction([
      prisma.cancellationRequest.create({
        data: {
          reservationId: id,
          requestedBy: session.user.id,
          reason,
          status: "PENDING",
        },
      }),
      prisma.reservation.update({
        where: { id },
        data: { status: "MODIFICATION_PENDING" },
      }),
      prisma.reservationStatusHistory.create({
        data: {
          reservationId: id,
          fromStatus: reservation.status as "APPROVED" | "PENDING",
          toStatus: "MODIFICATION_PENDING",
          changedBy: session.user.id,
          reason: `İptal talebi: ${reason}`,
        },
      }),
    ]);

    // Admin'lere bildirim — non-blocking (Rule 3.7)
    after(async () => {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "CANCELLATION_REQUEST" as const,
            title: "İptal Talebi",
            message: `${reservation.guestName} için iptal talebi oluşturuldu.`,
            metadata: { reservationId: id },
          })),
        });
      }
    });

    return NextResponse.json(cancelRequest, { status: 201 });
  },
);
