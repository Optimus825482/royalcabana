import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { prisma } from "@/lib/prisma";

export const GET = withAuth([Role.SYSTEM_ADMIN], async (req: NextRequest) => {
  const url = req.nextUrl;

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit")) || 25),
  );
  const userId = url.searchParams.get("userId") || undefined;
  const deviceType = url.searchParams.get("deviceType") || undefined;
  const isActive = url.searchParams.get("isActive");
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (deviceType) where.deviceType = deviceType;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;
  if (startDate || endDate) {
    where.loginAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
    };
  }

  const db = prisma as any;
  const [sessions, total] = await Promise.all([
    db.loginSession.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
      orderBy: { loginAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.loginSession.count({ where }),
  ]);

  return NextResponse.json({ sessions, total });
});
