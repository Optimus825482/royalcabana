import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const upsertSchema = z.object({
  cabanaId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyPrice: z.number().min(0),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cabanaId = searchParams.get("cabanaId");
  const month = searchParams.get("month"); // "2025-07"

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
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.ADMIN, Role.SYSTEM_ADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
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

  return NextResponse.json(price, { status: 200 });
}
