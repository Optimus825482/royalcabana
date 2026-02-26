import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const addAttributeSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
  const id = params!.id;
  const cabanaClass = await prisma.cabanaClass.findUnique({ where: { id } });
  if (!cabanaClass) {
    return NextResponse.json({ message: "Sınıf bulunamadı." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = addAttributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { key, value } = parsed.data;
  const existing = await prisma.classAttribute.findUnique({
    where: { classId_key: { classId: id, key } },
  });
  if (existing) {
    return NextResponse.json(
      { message: "Bu anahtar zaten mevcut." },
      { status: 409 },
    );
  }

  const attribute = await prisma.classAttribute.create({
    data: { classId: id, key, value },
  });
  return NextResponse.json(attribute, { status: 201 });
});
