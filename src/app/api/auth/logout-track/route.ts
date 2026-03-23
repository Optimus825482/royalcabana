import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
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
    try {
      const activeSession = await prisma.loginSession.findFirst({
        where: { userId: session.user.id, isActive: true },
        orderBy: { loginAt: "desc" },
      });

      if (activeSession) {
        const now = new Date();
        const duration = Math.floor(
          (now.getTime() - activeSession.loginAt.getTime()) / 1000,
        );

        await prisma.loginSession.update({
          where: { id: activeSession.id },
          data: { logoutAt: now, duration, isActive: false },
        });

        logAudit({
          userId: session.user.id,
          action: "LOGOUT",
          entity: "Session",
          entityId: activeSession.id,
          oldValue: { loginAt: activeSession.loginAt.toISOString() },
          newValue: {
            logoutAt: now.toISOString(),
            durationSeconds: duration,
            durationFormatted: formatDuration(duration),
          },
        });
      }

      return NextResponse.json({ success: true, data: null, error: null });
    } catch (error) {
      console.error("[logout-track] Error:", error);
      return NextResponse.json(
        { success: false, data: null, error: "Server error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}
