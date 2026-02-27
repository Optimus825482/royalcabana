import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

// PATCH — Görev tamamla/güncelle
export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;

    const existing = await (prisma as any).staffTask.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    // isCompleted toggle veya explicit set
    if (typeof body.isCompleted === "boolean") {
      data.isCompleted = body.isCompleted;
      data.completedAt = body.isCompleted ? new Date() : null;
    } else if (body.toggleComplete) {
      data.isCompleted = !existing.isCompleted;
      data.completedAt = !existing.isCompleted ? new Date() : null;
    }

    // Diğer alanlar
    if (body.title) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.date) data.date = new Date(body.date);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek alan belirtilmedi." },
        { status: 400 },
      );
    }

    const updated = await (prisma as any).staffTask.update({
      where: { id },
      data,
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "StaffTask",
      entityId: id,
      oldValue: {
        isCompleted: existing.isCompleted,
        title: existing.title,
      },
      newValue: data,
    });

    return NextResponse.json(updated);
  },
);
