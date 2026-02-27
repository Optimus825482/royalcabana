import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

// DELETE — Blackout tarihi sil (hard delete, SYSTEM_ADMIN only)
export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).blackoutDate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Blackout tarihi bulunamadı." },
        { status: 404 },
      );
    }

    // Hard delete — blackoutDate soft delete modeli değil
    await prisma.$executeRawUnsafe(
      `DELETE FROM blackout_dates WHERE id = $1`,
      id,
    );

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "BlackoutDate",
      entityId: id,
      oldValue: {
        cabanaId: existing.cabanaId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        reason: existing.reason,
      },
    });

    return NextResponse.json({ success: true });
  },
);
