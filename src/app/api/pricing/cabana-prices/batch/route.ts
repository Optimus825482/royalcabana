import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

const batchSchema = z.object({
  cabanaId: z.string().min(1),
  prices: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dailyPrice: z.number().min(0),
      }),
    )
    .min(1)
    .max(366),
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

    const { cabanaId, prices } = parsed.data;

    // Verify cabana exists
    const cabana = await prisma.cabana.findUnique({ where: { id: cabanaId } });
    if (!cabana) {
      return NextResponse.json(
        { error: "Kabana bulunamadı." },
        { status: 404 },
      );
    }

    // Use transaction for atomicity
    const results = await prisma.$transaction(
      prices.map(({ date, dailyPrice }) => {
        const dateObj = new Date(date + "T00:00:00.000Z");
        return prisma.cabanaPrice.upsert({
          where: { cabanaId_date: { cabanaId, date: dateObj } },
          update: { dailyPrice },
          create: { cabanaId, date: dateObj, dailyPrice },
        });
      }),
    );

    logAudit({
      userId: session.user.id,
      action: "BATCH_PRICE_UPDATE",
      entity: "CabanaPrice",
      entityId: cabanaId,
      newValue: { cabanaId, priceCount: prices.length },
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      message: `${results.length} fiyat güncellendi.`,
    });
  },
  { requiredPermissions: ["pricing.create"] },
);
