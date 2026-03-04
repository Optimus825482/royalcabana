import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { invalidateCache } from "@/lib/cache";

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
        { success: false, error: "Grup bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation error" },
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

    await invalidateCache("product-groups:list:v1");

    return NextResponse.json({ success: true, data: updated });
  },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;
    const group = await prisma.productGroup.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Grup bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.product.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });
    await prisma.productGroup.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "ProductGroup",
      entityId: id,
      oldValue: { name: group.name, sortOrder: group.sortOrder },
    });

    await invalidateCache("product-groups:list:v1");

    return NextResponse.json({ success: true, data: null });
  },
);
