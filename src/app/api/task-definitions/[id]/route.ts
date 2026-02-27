import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { parseBody } from "@/lib/validators";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  isActive: z.boolean().optional(),
});

// GET — Tekil görev tanımı
export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { params }) => {
    const { id } = params!;
    const item = await (prisma as any).taskDefinition.findUnique({
      where: { id },
    });
    if (!item || item.deletedAt) {
      return NextResponse.json(
        { error: "Görev tanımı bulunamadı." },
        { status: 404 },
      );
    }
    return NextResponse.json(item);
  },
);

// PATCH — Görev tanımı güncelle
export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session, params }) => {
    const { id } = params!;
    const body = await req.json();
    const parsed = parseBody(updateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = await (prisma as any).taskDefinition.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: "Görev tanımı bulunamadı." },
        { status: 404 },
      );
    }

    const item = await (prisma as any).taskDefinition.update({
      where: { id },
      data: parsed.data,
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "TaskDefinition",
      entityId: id,
      oldValue: existing as Record<string, unknown>,
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json(item);
  },
);

// DELETE — Soft delete
export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session, params }) => {
    const { id } = params!;
    const existing = await (prisma as any).taskDefinition.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: "Görev tanımı bulunamadı." },
        { status: 404 },
      );
    }

    await (prisma as any).taskDefinition.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "TaskDefinition",
      entityId: id,
      oldValue: existing as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  },
);
