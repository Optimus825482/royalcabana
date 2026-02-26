import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const upsertSchema = z.object({
  conceptId: z.string().min(1),
  productId: z.string().min(1),
  price: z.number().min(0),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const conceptId = searchParams.get("conceptId");

  const prices = await prisma.conceptPrice.findMany({
    where: conceptId ? { conceptId } : undefined,
    include: {
      product: { select: { id: true, name: true, salePrice: true } },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ prices });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
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

  return NextResponse.json(record, { status: 200 });
}
