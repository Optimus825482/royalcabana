import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const GET = withAuth(allRoles, async (_req, { params }) => {
  const id = params!.id;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }

  const history = await (prisma as any).productPriceHistory.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, name: true } },
    },
  });

  // Enrich with user info
  const changedByIds = [
    ...new Set(
      (history as Array<{ changedBy: string }>).map((h) => h.changedBy),
    ),
  ];

  const users =
    changedByIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: changedByIds } },
          select: { id: true, username: true },
        })
      : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const enriched = (history as any[]).map((h) => {
    const user = userMap.get(h.changedBy);
    return {
      id: h.id,
      productId: h.productId,
      purchasePrice: Number(h.purchasePrice),
      salePrice: Number(h.salePrice),
      source: h.source,
      changedBy: h.changedBy,
      changedByUser: user ? { id: user.id, username: user.username } : null,
      createdAt: h.createdAt,
    };
  });

  return NextResponse.json(enriched);
});
