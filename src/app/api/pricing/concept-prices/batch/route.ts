import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

const batchSchema = z.object({
  conceptId: z.string().min(1),
  prices: z
    .array(
      z.object({
        productId: z.string().min(1),
        price: z.number().min(0),
      }),
    )
    .min(1),
});

export const POST = withAuth(
  adminRoles,
  async (req, { session }) => {
    const body = await req.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { conceptId, prices } = parsed.data;

    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
    });
    if (!concept) {
      return NextResponse.json(
        { error: "Konsept bulunamadı." },
        { status: 404 },
      );
    }

    const results = await prisma.$transaction(
      prices.map(({ productId, price }) =>
        prisma.conceptPrice.upsert({
          where: { conceptId_productId: { conceptId, productId } },
          update: { price },
          create: { conceptId, productId, price },
        }),
      ),
    );

    logAudit({
      userId: session.user.id,
      action: "BATCH_PRICE_UPDATE",
      entity: "ConceptPrice",
      entityId: conceptId,
      newValue: { conceptId, priceCount: prices.length },
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      message: `${results.length} konsept fiyatı güncellendi.`,
    });
  },
  { requiredPermissions: ["pricing.create"] },
);
