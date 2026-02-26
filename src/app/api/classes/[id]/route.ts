import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role, CabanaStatus } from "@/types";

const updateClassSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(1).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const cabanaClass = await prisma.cabanaClass.findUnique({
    where: { id },
    include: {
      attributes: true,
      cabanas: true,
    },
  });

  if (!cabanaClass) {
    return NextResponse.json({ message: "Sınıf bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(cabanaClass);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const cabanaClass = await prisma.cabanaClass.findUnique({ where: { id } });

  if (!cabanaClass) {
    return NextResponse.json({ message: "Sınıf bulunamadı." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateClassSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.cabanaClass.update({
    where: { id },
    data: parsed.data,
    include: {
      attributes: true,
      _count: { select: { cabanas: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const cabanaClass = await prisma.cabanaClass.findUnique({
    where: { id },
    include: {
      cabanas: { where: { status: { not: CabanaStatus.CLOSED } } },
    },
  });

  if (!cabanaClass) {
    return NextResponse.json({ message: "Sınıf bulunamadı." }, { status: 404 });
  }

  if (cabanaClass.cabanas.length > 0) {
    return NextResponse.json(
      { message: "Bu sınıfa ait aktif kabana bulunmaktadır." },
      { status: 409 },
    );
  }

  await prisma.cabanaClass.delete({ where: { id } });

  return NextResponse.json({ message: "Sınıf silindi." });
}
