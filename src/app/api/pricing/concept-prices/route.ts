import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

const upsertSchema = z.object({
  conceptId: z.string().min(1),
  productId: z.string().min(1),
  price: z.number().min(0),
});

export const GET = withAuth(adminRoles, async (req) => {
  const { searchParams } = new URL(req.url);
  const conceptId = searchParams.get("conceptId");

  const prices = await prisma.conceptPrice.findMany({
    where: conceptId ? { conceptId } : undefined,
    include: {
      product: { select: { id: true, name: true, salePrice: true } },
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ prices });
});

export const POST = withAuth(adminRoles, async (req) => {
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { conceptId, productId, price } = parsed.data;

  const record = await prisma.conceptPrice.upsert({
    where: { conceptId_productId: { conceptId, productId } },
    update: { price },
    create: { conceptId, productId, price },
    include: {
      product: { select: { id: true, name: true, salePrice: true } },
    },
  });
  return NextResponse.json(record);
});
