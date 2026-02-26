import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { extraConceptRequestSchema, parseBody } from "@/lib/validators";
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

    if (reservation.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Yalnızca onaylı rezervasyonlar için ek konsept talebi oluşturulabilir.",
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(extraConceptRequestSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { items } = parsed.data;

    const [extraRequest] = await prisma.$transaction([
      prisma.extraConceptRequest.create({
        data: {
          reservationId: id,
          requestedBy: session.user.id,
          items: JSON.stringify(items),
          status: "PENDING",
        },
      }),
      prisma.reservation.update({
        where: { id },
        data: { status: "EXTRA_PENDING" },
      }),
      prisma.reservationStatusHistory.create({
        data: {
          reservationId: id,
          fromStatus: "APPROVED",
          toStatus: "EXTRA_PENDING",
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
            type: "EXTRA_CONCEPT_REQUEST" as const,
            title: "Ek Konsept Talebi",
            message: `${reservation.guestName} için ek konsept talebi oluşturuldu.`,
            metadata: { reservationId: id },
          })),
        });
      }
    });

    return NextResponse.json(extraRequest, { status: 201 });
  },
);
