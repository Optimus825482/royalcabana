import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async (_req, { session, params }) => {
    const id = params!.id;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        cabana: {
          include: {
            cabanaClass: { select: { id: true, name: true } },
            concept: { select: { id: true, name: true } },
          },
        },
        concept: { select: { id: true, name: true } },
        user: { select: { id: true, username: true, email: true } },
        guest: {
          select: {
            id: true,
            name: true,
            vipLevel: true,
            totalVisits: true,
            lastVisitAt: true,
            phone: true,
          },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
        modifications: { orderBy: { createdAt: "desc" } },
        cancellations: { orderBy: { createdAt: "desc" } },
        extraConcepts: { orderBy: { createdAt: "desc" } },
        extraItems: {
          include: { product: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    // IDOR: CASINO_USER sadece kendi rezervasyonunu görebilir
    if (
      session.user.role === Role.CASINO_USER &&
      reservation.userId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Misafir gizliliği: isGuestPrivate ise Casino dışındaki roller göremez
    if (
      (reservation as unknown as { isGuestPrivate?: boolean }).isGuestPrivate &&
      session.user.role !== Role.CASINO_USER
    ) {
      return NextResponse.json({
        success: true,
        data: {
          ...reservation,
          guestName: "Gizli Misafir",
          guestId: null,
          notes: null,
        },
      });
    }

    return NextResponse.json({ success: true, data: reservation });
  },
  { requiredPermissions: ["reservation.view"] },
);
