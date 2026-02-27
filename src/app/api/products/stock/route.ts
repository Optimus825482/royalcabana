import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, updateStockSchema } from "@/lib/validators";

// PATCH — Ürün stok güncelle
export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.FNB_USER],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(updateStockSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { productId, stockQuantity, minStockAlert } = parsed.data;

    const existing = await (prisma as any).product.findUnique({
      where: { id: productId },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
    }

    const updated = await (prisma as any).product.update({
      where: { id: productId },
      data: { stockQuantity, minStockAlert },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Product",
      entityId: productId,
      oldValue: {
        stockQuantity: existing.stockQuantity,
        minStockAlert: existing.minStockAlert,
      },
      newValue: { stockQuantity, minStockAlert },
    });

    return NextResponse.json(updated);
  },
);
