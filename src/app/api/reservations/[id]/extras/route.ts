import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export const GET = withAuth(
  [Role.FNB_USER, Role.ADMIN],
  async (_req, { params }) => {
    const id = params!.id;

    const extras = await prisma.extraItem.findMany({
      where: { reservationId: id },
      include: {
        product: { select: { id: true, name: true, salePrice: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(extras);
  },
);

export const POST = withAuth(
  [Role.FNB_USER],
  async (req, { session, params }) => {
    const id = params!.id;
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (reservation.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Yalnızca onaylı rezervasyonlara ekstra eklenebilir." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { items } = body as {
      items: Array<{ productId: string; quantity: number }>;
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "En az bir ürün seçilmelidir." },
        { status: 400 },
      );
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Bazı ürünler bulunamadı veya aktif değil." },
        { status: 400 },
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const created = await prisma.$transaction(async (tx) => {
      const extras = await Promise.all(
        items.map((item) => {
          const product = productMap.get(item.productId)!;
          return tx.extraItem.create({
            data: {
              reservationId: id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.salePrice,
              addedBy: session.user.id,
            },
            include: {
              product: { select: { id: true, name: true, salePrice: true } },
            },
          });
        }),
      );

      // Toplam ekstra tutarını hesapla ve reservation totalPrice'ı güncelle
      const allExtras = await tx.extraItem.findMany({
        where: { reservationId: id },
      });
      const extrasTotal = allExtras.reduce(
        (sum, e) => sum + Number(e.unitPrice) * e.quantity,
        0,
      );

      const currentReservation = await tx.reservation.findUnique({
        where: { id },
        select: { totalPrice: true },
      });

      const basePrice = Number(currentReservation?.totalPrice ?? 0);
      const oldExtrasTotal = allExtras
        .filter((e) => !extras.some((ne) => ne.id === e.id))
        .reduce((sum, e) => sum + Number(e.unitPrice) * e.quantity, 0);

      await tx.reservation.update({
        where: { id },
        data: { totalPrice: basePrice - oldExtrasTotal + extrasTotal },
      });

      return extras;
    });

    // Rezervasyon sahibine bildirim
    await prisma.notification.create({
      data: {
        userId: reservation.userId,
        type: "EXTRA_ADDED",
        title: "Ekstra Ürün Eklendi",
        message: `Rezervasyonunuza ${items.length} ekstra ürün eklendi.`,
        metadata: { reservationId: id },
      },
    });

    return NextResponse.json(created, { status: 201 });
  },
);
