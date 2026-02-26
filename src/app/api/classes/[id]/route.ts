import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role, CabanaStatus } from "@/types";
import { withAuth } from "@/lib/api-middleware";

const updateClassSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(1).optional(),
});

export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async (_req, { params }) => {
    const id = params?.id;

    const cabanaClass = await prisma.cabanaClass.findUnique({
      where: { id },
      include: {
        attributes: true,
        _count: { select: { cabanas: true } },
      },
    });

    if (!cabanaClass) {
      return NextResponse.json({ error: "Sınıf bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(cabanaClass);
  },
);

export const PATCH = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
  const id = params?.id;

  const body = await req.json();
  const parsed = updateClassSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.cabanaClass.update({
      where: { id },
      data: parsed.data,
      include: {
        attributes: true,
        _count: { select: { cabanas: true } },
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Sınıf bulunamadı." }, { status: 404 });
  }
});

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { params }) => {
    const id = params?.id;

    const cabanaClass = await prisma.cabanaClass.findUnique({
      where: { id },
      include: {
        cabanas: { where: { status: { not: CabanaStatus.CLOSED } } },
      },
    });

    if (!cabanaClass) {
      return NextResponse.json({ error: "Sınıf bulunamadı." }, { status: 404 });
    }

    if (cabanaClass.cabanas.length > 0) {
      return NextResponse.json(
        { error: "Bu sınıfa ait aktif kabana bulunmaktadır." },
        { status: 409 },
      );
    }

    await prisma.cabanaClass.delete({ where: { id } });

    return NextResponse.json({ message: "Sınıf silindi." });
  },
);
