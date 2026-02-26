import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const addAttributeSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export async function POST(
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

  const cabanaClass = await prisma.cabanaClass.findUnique({
    where: { id: params.id },
  });

  if (!cabanaClass) {
    return NextResponse.json({ message: "Sınıf bulunamadı." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = addAttributeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { key, value } = parsed.data;

  const existing = await prisma.classAttribute.findUnique({
    where: { classId_key: { classId: params.id, key } },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Bu anahtar zaten mevcut." },
      { status: 409 },
    );
  }

  const attribute = await prisma.classAttribute.create({
    data: { classId: params.id, key, value },
  });

  return NextResponse.json(attribute, { status: 201 });
}
