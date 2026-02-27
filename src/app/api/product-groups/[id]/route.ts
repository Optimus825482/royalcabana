import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  sortOrder: z.number().int().optional(),
});

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;
    const group = await prisma.productGroup.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json(
        { message: "Grup bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error" },
        { status: 400 },
      );
    }

    const updated = await prisma.productGroup.update({
      where: { id },
      data: parsed.data,
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "ProductGroup",
      entityId: id,
      oldValue: { name: group.name, sortOrder: group.sortOrder },
      newValue: parsed.data,
    });

    return NextResponse.json(updated);
  },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;
    const group = await prisma.productGroup.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json(
        { message: "Grup bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.product.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });
    await prisma.productGroup.delete({ where: { id } });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "ProductGroup",
      entityId: id,
      oldValue: { name: group.name, sortOrder: group.sortOrder },
    });

    return NextResponse.json({ message: "Grup silindi." });
  },
);
