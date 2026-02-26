import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const updateConceptSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(1).optional(),
  classId: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const concept = await prisma.concept.findUnique({
    where: { id: params.id },
    include: {
      products: { include: { product: true } },
      cabanaClass: { select: { id: true, name: true } },
      _count: { select: { cabanas: true } },
    },
  });

  if (!concept) {
    return NextResponse.json(
      { message: "Konsept bulunamadı." },
      { status: 404 },
    );
  }

  return NextResponse.json(concept);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const concept = await prisma.concept.findUnique({ where: { id: params.id } });

  if (!concept) {
    return NextResponse.json(
      { message: "Konsept bulunamadı." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = updateConceptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.concept.update({
    where: { id: params.id },
    data: parsed.data,
    include: {
      products: { include: { product: true } },
      cabanaClass: { select: { id: true, name: true } },
      _count: { select: { cabanas: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const concept = await prisma.concept.findUnique({
    where: { id: params.id },
    include: { _count: { select: { cabanas: true } } },
  });

  if (!concept) {
    return NextResponse.json(
      { message: "Konsept bulunamadı." },
      { status: 404 },
    );
  }

  if (concept._count.cabanas > 0) {
    return NextResponse.json(
      { message: "Bu konsept aktif kabanaya atanmış, silinemez." },
      { status: 409 },
    );
  }

  await prisma.concept.delete({ where: { id: params.id } });

  return NextResponse.json({ message: "Konsept silindi." });
}
