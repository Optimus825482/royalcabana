import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const createProductSchema = z.object({
  name: z.string().min(2),
  purchasePrice: z.number().positive(),
  salePrice: z.number().positive(),
  groupId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  const products = await prisma.product.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ group: { sortOrder: "asc" } }, { name: "asc" }],
    include: { group: true },
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.role !== Role.SYSTEM_ADMIN)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await request.json();
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

  return NextResponse.json(product, { status: 201 });
}
