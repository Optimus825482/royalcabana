import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

const updateConceptSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(1).optional(),
  classId: z.string().nullable().optional(),
  serviceFee: z.coerce.number().min(0).optional(),
});

export const GET = withAuth(allRoles, async (_req, { params }) => {
  const id = params!.id;
  const concept = await prisma.concept.findUnique({
    where: { id },
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
});

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const concept = await (prisma as any).concept.findUnique({ where: { id } });
    if (!concept) {
      return NextResponse.json(
        { message: "Konsept bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = updateConceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await (prisma as any).concept.update({
      where: { id },
      data: parsed.data,
      include: {
        products: { include: { product: true } },
        cabanaClass: { select: { id: true, name: true } },
        _count: { select: { cabanas: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Concept",
      entityId: id,
      oldValue: {
        name: concept.name,
        description: concept.description,
        classId: concept.classId,
        serviceFee: Number(concept.serviceFee),
      },
      newValue: parsed.data,
    });

    return NextResponse.json(updated);
  },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;
    const concept = await (prisma as any).concept.findUnique({
      where: { id },
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
    await prisma.concept.delete({ where: { id } });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Concept",
      entityId: id,
      oldValue: {
        name: concept.name,
        description: concept.description,
        serviceFee: Number(concept.serviceFee),
      },
    });

    return NextResponse.json({ message: "Konsept silindi." });
  },
);
