import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { PricingEngine } from "@/lib/pricing";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

const previewSchema = z.object({
  cabanaId: z.string().min(1),
  conceptId: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extraItems: z
    .array(
      z.object({ productId: z.string(), quantity: z.number().int().min(1) }),
    )
    .optional(),
});

export const POST = withAuth(adminRoles, async (req) => {
  const body = await req.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { cabanaId, conceptId, startDate, endDate, extraItems } = parsed.data;

  const engine = new PricingEngine();
  const breakdown = await engine.calculatePrice({
    cabanaId,
    conceptId: conceptId ?? null,
    startDate: new Date(startDate + "T00:00:00.000Z"),
    endDate: new Date(endDate + "T00:00:00.000Z"),
    extraItems: extraItems ?? [],
  });

  return NextResponse.json(breakdown);
});
