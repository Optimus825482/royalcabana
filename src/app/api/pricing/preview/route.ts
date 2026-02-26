import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";
import { PricingEngine } from "@/lib/pricing";

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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
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
}
