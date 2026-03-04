import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, updateGuestSchema } from "@/lib/validators";

export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async (_req, { params }) => {
    const id = params!.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guest = await (prisma as any).guest.findUnique({
      where: { id, deletedAt: null },
      include: { _count: { select: { reservations: true } } },
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Misafir bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: guest });
  },
);

export const PATCH = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).guest.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Misafir bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(updateGuestSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guest = await (prisma as any).guest.update({
      where: { id },
      data: parsed.data,
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Guest",
      entityId: id,
      oldValue: existing as Record<string, unknown>,
      newValue: guest as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: guest });
  },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).guest.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Misafir bulunamadı." },
        { status: 404 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).guest.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    logAudit({
      userId: session.user.id,
      action: "SOFT_DELETE",
      entity: "Guest",
      entityId: id,
      oldValue: existing as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      data: { message: "Misafir silindi." },
    });
  },
);
