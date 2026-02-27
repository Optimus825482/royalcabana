import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

// DELETE — Bekleme listesinden çıkar (kendi kaydı veya ADMIN)
export const DELETE = withAuth(
  [Role.CASINO_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const entry = await (prisma as any).waitlistEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Bekleme listesi kaydı bulunamadı." },
        { status: 404 },
      );
    }

    // Kendi kaydı değilse ve ADMIN/SYSTEM_ADMIN değilse reddet
    const isOwner = entry.userId === session.user.id;
    const isAdmin =
      session.user.role === Role.ADMIN ||
      session.user.role === Role.SYSTEM_ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Bu kaydı silme yetkiniz yok." },
        { status: 403 },
      );
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM waitlist_entries WHERE id = $1`,
      id,
    );

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "WaitlistEntry",
      entityId: id,
      oldValue: {
        cabanaId: entry.cabanaId,
        guestName: entry.guestName,
        desiredStart: entry.desiredStart,
        desiredEnd: entry.desiredEnd,
      },
    });

    return NextResponse.json({ success: true });
  },
);
