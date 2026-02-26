import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.FNB_USER, Role.ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const extras = await prisma.extraItem.findMany({
    where: { reservationId: id },
    include: { product: { select: { id: true, name: true, salePrice: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(extras);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== Role.FNB_USER)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation)
    return NextResponse.json(
      { error: "Rezervasyon bulunamadı." },
      { status: 404 },
    );
  if (reservation.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Yalnızca onaylı rezervasyonlara ekstra eklenebilir." },
      { status: 400 },
    );
  }

  const body = await request.json();
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

  const created = await prisma.$transaction(
    items.map((item) => {
      const product = productMap.get(item.productId)!;
      return prisma.extraItem.create({
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
}
