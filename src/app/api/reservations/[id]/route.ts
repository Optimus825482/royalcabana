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
            minibarType: {
              include: {
                products: {
                  include: {
                    product: {
                      select: { id: true, name: true, salePrice: true },
                    },
                  },
                },
              },
            },
          },
        },
        concept: {
          select: {
            id: true,
            name: true,
            description: true,
            serviceFee: true,
            products: {
              include: {
                product: { select: { id: true, name: true, salePrice: true } },
              },
            },
          },
        },
        minibarType: {
          include: {
            products: {
              include: {
                product: { select: { id: true, name: true, salePrice: true } },
              },
            },
          },
        },
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

    return NextResponse.json({ success: true, data: reservation });
  },
  { requiredPermissions: ["reservation.view"] },
);
