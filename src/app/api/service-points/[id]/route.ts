import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: z.string().min(1).optional(),
  coordX: z.number().nullable().optional(),
  coordY: z.number().nullable().optional(),
  rotation: z.number().optional(),
  scale: z.number().optional(),
  isLocked: z.boolean().optional(),
  isActive: z.boolean().optional(),
  requiredStaffCount: z.number().int().min(0).optional(),
  staffRoles: z.array(z.string()).nullable().optional(),
});

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const servicePoint = await prisma.servicePoint.findFirst({
      where: { id, isDeleted: false },
      include: {
        staffAssignments: {
          include: {
            staff: { select: { id: true, name: true, position: true } },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!servicePoint) {
      return NextResponse.json(
        { success: false, error: "Bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: servicePoint });
  },
  { requiredPermissions: ["system.config.view"] },
);

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const existing = await prisma.servicePoint.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bulunamadı" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Doğrulama hatası",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { staffRoles, ...rest } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { ...rest };
    if (staffRoles !== undefined) {
      updateData.staffRoles = staffRoles === null ? null : staffRoles;
    }

    const updated = await prisma.servicePoint.update({
      where: { id },
      data: updateData,
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "ServicePoint",
      entityId: id,
      oldValue: {
        name: existing.name,
        type: existing.type,
        isActive: existing.isActive,
      },
      newValue: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ["system.config.update"] },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const existing = await prisma.servicePoint.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bulunamadı" },
        { status: 404 },
      );
    }

    await prisma.servicePoint.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "ServicePoint",
      entityId: id,
      oldValue: { name: existing.name },
    });

    return NextResponse.json({ success: true, data: { id } });
  },
  { requiredPermissions: ["system.config.delete"] },
);
