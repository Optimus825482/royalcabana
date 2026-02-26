import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const createClassSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  attributes: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const classes = await prisma.cabanaClass.findMany({
    include: {
      attributes: true,
      _count: { select: { cabanas: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(classes);
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
}
