import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[logout-track] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}
