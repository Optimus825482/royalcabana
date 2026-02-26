import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const addProductSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().optional(),
});

const removeProductSchema = z.object({
  productId: z.string().min(1),
});

export async function POST(
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

  const concept = await prisma.concept.findUnique({ where: { id } });
  if (!concept) {
    return NextResponse.json(
      { message: "Konsept bulunamadı." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = addProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { productId, quantity = 1 } = parsed.data;

  const existing = await prisma.conceptProduct.findUnique({
    where: { conceptId_productId: { conceptId: id, productId } },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Bu ürün zaten konsepte eklenmiş." },
      { status: 409 },
    );
  }

  const conceptProduct = await prisma.conceptProduct.create({
    data: { conceptId: id, productId, quantity },
    include: { product: true },
  });

  return NextResponse.json(conceptProduct, { status: 201 });
}

export async function DELETE(
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

  const body = await request.json();
  const parsed = removeProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { productId } = parsed.data;

  const entry = await prisma.conceptProduct.findUnique({
    where: { conceptId_productId: { conceptId: id, productId } },
  });

  if (!entry) {
    return NextResponse.json(
      { message: "Bu ürün konsepte eklenmemiş." },
      { status: 404 },
    );
  }

  await prisma.conceptProduct.delete({ where: { id: entry.id } });

  return NextResponse.json({ message: "Ürün konseptten kaldırıldı." });
}
