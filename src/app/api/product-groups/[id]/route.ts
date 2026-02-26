import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.role !== Role.SYSTEM_ADMIN)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const group = await prisma.productGroup.findUnique({
    where: { id: params.id },
  });
  if (!group)
    return NextResponse.json({ message: "Grup bulunamadı." }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ message: "Validation error" }, { status: 400 });

  const updated = await prisma.productGroup.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.role !== Role.SYSTEM_ADMIN)
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const group = await prisma.productGroup.findUnique({
    where: { id: params.id },
  });
  if (!group)
    return NextResponse.json({ message: "Grup bulunamadı." }, { status: 404 });

  // Gruptaki ürünleri grupsuz bırak
  await prisma.product.updateMany({
    where: { groupId: params.id },
    data: { groupId: null },
  });
  await prisma.productGroup.delete({ where: { id: params.id } });

  return NextResponse.json({ message: "Grup silindi." });
}
