import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const createConceptSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  classId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const concepts = await prisma.concept.findMany({
    include: {
      products: {
        include: { product: true },
      },
      cabanaClass: { select: { id: true, name: true } },
      _count: { select: { cabanas: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(concepts);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
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
}
