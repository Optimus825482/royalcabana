import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

const createSchema = z.object({
  name: z.string().min(2),
  sortOrder: z.number().int().default(0),
});

export const GET = withAuth(allRoles, async () => {
  const groups = await prisma.productGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(groups);
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const group = await prisma.productGroup.create({ data: parsed.data });
  return NextResponse.json(group, { status: 201 });
});
