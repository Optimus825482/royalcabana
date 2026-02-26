import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const addProductSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().optional(),
});

const removeProductSchema = z.object({
  productId: z.string().min(1),
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
  const id = params!.id;
  const concept = await prisma.concept.findUnique({ where: { id } });
  if (!concept) {
    return NextResponse.json(
      { message: "Konsept bulunamadı." },
      { status: 404 },
    );
  }

  const body = await req.json();
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
});

export const DELETE = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
  const id = params!.id;
  const body = await req.json();
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
});
