import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, updateGuestSchema } from "@/lib/validators";

export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER],
  async (_req, { params }) => {
    const id = params!.id;

    const guest = await (prisma as any).guest.findUnique({
      where: { id },
      include: { _count: { select: { reservations: true } } },
    });

    if (!guest) {
      return NextResponse.json(
        { error: "Misafir bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json(guest);
  },
);

export const PATCH = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).guest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Misafir bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(updateGuestSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

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

    return NextResponse.json(guest);
  },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).guest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Misafir bulunamadı." },
        { status: 404 },
      );
    }

    await (prisma as any).guest.delete({ where: { id } });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Guest",
      entityId: id,
      oldValue: existing as Record<string, unknown>,
    });

    return NextResponse.json({ message: "Misafir silindi." });
  },
);
