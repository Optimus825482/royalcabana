import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

const createProductSchema = z.object({
  name: z.string().min(2),
  purchasePrice: z.number().positive(),
  salePrice: z.number().positive(),
  groupId: z.string().optional().nullable(),
});

export const GET = withAuth(allRoles, async (req) => {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const products = await prisma.product.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ group: { sortOrder: "asc" } }, { name: "asc" }],
    include: { group: true },
  });

  return NextResponse.json(products);
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req, { session }) => {
  const body = await req.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );

  const product = await prisma.product.create({
    data: parsed.data,
    include: { group: true },
  });

  // Record initial price history
  await (prisma as any).productPriceHistory.create({
    data: {
      productId: product.id,
      purchasePrice: parsed.data.purchasePrice,
      salePrice: parsed.data.salePrice,
      source: "MANUAL",
      changedBy: session.user.id,
    },
  });

  logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "Product",
    entityId: product.id,
    newValue: parsed.data,
  });

  return NextResponse.json(product, { status: 201 });
});
