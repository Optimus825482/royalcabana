import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const adminRoles = [Role.ADMIN, Role.SYSTEM_ADMIN];

const upsertSchema = z.object({
  cabanaId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyPrice: z.number().min(0),
});

export const GET = withAuth(adminRoles, async (req) => {
  const { searchParams } = new URL(req.url);
  const cabanaId = searchParams.get("cabanaId");
  const month = searchParams.get("month");

  const where: Record<string, unknown> = {};
  if (cabanaId) where.cabanaId = cabanaId;
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 1));
    where.date = { gte: start, lt: end };
  }

  const prices = await prisma.cabanaPrice.findMany({
    where,
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ prices });
});

export const POST = withAuth(adminRoles, async (req) => {
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { cabanaId, date, dailyPrice } = parsed.data;
  const dateObj = new Date(date + "T00:00:00.000Z");

  const price = await prisma.cabanaPrice.upsert({
    where: { cabanaId_date: { cabanaId, date: dateObj } },
    update: { dailyPrice },
    create: { cabanaId, date: dateObj, dailyPrice },
  });
  return NextResponse.json(price);
});
