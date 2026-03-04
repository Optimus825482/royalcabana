import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const rl = await checkRateLimit(`heartbeat:${session.user.id}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit aşıldı." },
        { status: 429 },
      );
    }

    await prisma.loginSession.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
