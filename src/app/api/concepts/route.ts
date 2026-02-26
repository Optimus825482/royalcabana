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

const createConceptSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  classId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

export const GET = withAuth(allRoles, async () => {
  const concepts = await prisma.concept.findMany({
    include: {
      products: { include: { product: true } },
      cabanaClass: { select: { id: true, name: true } },
      _count: { select: { cabanas: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(concepts);
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req) => {
  const body = await req.json();
  const parsed = createConceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, description, classId, productIds } = parsed.data;

  const existing = await prisma.concept.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { message: "Bu isimde bir konsept zaten mevcut." },
      { status: 409 },
    );
  }

  const concept = await prisma.concept.create({
    data: {
      name,
      description,
      classId: classId || null,
      products: productIds?.length
        ? {
            create: productIds.map((productId) => ({ productId, quantity: 1 })),
          }
        : undefined,
    },
    include: {
      products: { include: { product: true } },
      cabanaClass: { select: { id: true, name: true } },
      _count: { select: { cabanas: true } },
    },
  });

  return NextResponse.json(concept, { status: 201 });
});
