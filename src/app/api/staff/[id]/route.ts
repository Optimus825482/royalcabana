import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createStaffSchema } from "@/lib/validators";

// GET — Personel detay (atamalar + görevler dahil)
export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (_req, { params }) => {
    const id = params!.id;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            cabana: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
          take: 10,
        },
        servicePointAssignments: {
          include: {
            servicePoint: { select: { id: true, name: true, type: true } },
          },
          orderBy: { date: "desc" },
          take: 10,
        },
        tasks: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });

    if (!staff || staff.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Personel bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: staff });
  },
  { requiredPermissions: ["staff.view"] },
);

// PATCH — Personel güncelle
export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;

    const existing = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Personel bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(createStaffSchema.partial(), body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: parsed.data,
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Staff",
      entityId: id,
      oldValue: {
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        position: existing.position,
      },
      newValue: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ["staff.update"] },
);

// DELETE — Personel soft delete
export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const existing = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Personel bulunamadı." },
        { status: 404 },
      );
    }

    // Soft delete — prisma extension handles this
    await prisma.staff.delete({
      where: { id },
    });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "Staff",
      entityId: id,
      oldValue: { name: existing.name, position: existing.position },
    });

    return NextResponse.json({ success: true, data: null });
  },
  { requiredPermissions: ["staff.delete"] },
);
