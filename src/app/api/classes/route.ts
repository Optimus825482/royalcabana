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

const createClassSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  attributes: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional(),
});

export const GET = withAuth(allRoles, async () => {
  const classes = await prisma.cabanaClass.findMany({
    include: {
      attributes: true,
      _count: { select: { cabanas: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(classes);
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req) => {
  const body = await req.json();
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, description, attributes } = parsed.data;

  const existing = await prisma.cabanaClass.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { message: "Bu isimde bir sınıf zaten mevcut." },
      { status: 409 },
    );
  }

  const cabanaClass = await prisma.cabanaClass.create({
    data: {
      name,
      description,
      attributes: attributes?.length ? { create: attributes } : undefined,
    },
    include: {
      attributes: true,
      _count: { select: { cabanas: true } },
    },
  });

  return NextResponse.json(cabanaClass, { status: 201 });
});
