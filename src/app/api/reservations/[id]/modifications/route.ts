import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { modificationRequestSchema, parseBody } from "@/lib/validators";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

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

    if (reservation.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Yalnızca onaylı rezervasyonlar için değişiklik talebi oluşturulabilir.",
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(modificationRequestSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { newCabanaId, newStartDate, newEndDate, newGuestName } = parsed.data;

    const [modRequest] = await prisma.$transaction([
      prisma.modificationRequest.create({
        data: {
          reservationId: id,
          requestedBy: session.user.id,
          newCabanaId: newCabanaId ?? null,
          newStartDate: newStartDate ? new Date(newStartDate) : null,
          newEndDate: newEndDate ? new Date(newEndDate) : null,
          newGuestName: newGuestName ?? null,
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
          fromStatus: "APPROVED",
          toStatus: "MODIFICATION_PENDING",
          changedBy: session.user.id,
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
            type: "MODIFICATION_REQUEST" as const,
            title: "Değişiklik Talebi",
            message: `${reservation.guestName} için değişiklik talebi oluşturuldu.`,
            metadata: { reservationId: id },
          })),
        });
      }
    });

    logAudit({
      userId: session.user.id,
      action: "MODIFY_REQUEST",
      entity: "Reservation",
      entityId: id,
      oldValue: { status: "APPROVED" },
      newValue: {
        status: "MODIFICATION_PENDING",
        newCabanaId,
        newStartDate,
        newEndDate,
        newGuestName,
      },
    });

    return NextResponse.json(modRequest, { status: 201 });
  },
);
