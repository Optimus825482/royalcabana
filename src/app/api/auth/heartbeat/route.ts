import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const ALL_ROLES = [
  Role.SYSTEM_ADMIN,
  Role.ADMIN,
  Role.CASINO_ADMIN,
  Role.CASINO_USER,
  Role.FNB_ADMIN,
  Role.FNB_USER,
];

export const POST = withAuth(
  ALL_ROLES,
  async (_req, { session }) => {
    await prisma.loginSession.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ success: true, data: null, error: null });
  },
  { rateLimit: { limit: 30, windowMs: 60_000 } },
);
