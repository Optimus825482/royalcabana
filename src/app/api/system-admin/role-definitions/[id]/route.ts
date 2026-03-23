import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

const db = prisma;

const updateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  description: z.string().max(400).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (_req, { params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı ID bilgisi eksik." },
        { status: 400 },
      );
    }

    const item = await db.roleDefinition.findFirst({
      where: { id, isDeleted: false },
      include: {
        permissions: {
          where: { isDeleted: false },
          select: {
            id: true,
            permissionId: true,
            permission: {
              select: {
                key: true,
                name: true,
                module: true,
                action: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: item, error: null });
  },
  { requiredPermissions: ["role.definition.view"] },
);

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı ID bilgisi eksik." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(updateSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error },
        { status: 400 },
      );
    }

    const existing = await db.roleDefinition.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı bulunamadı." },
        { status: 404 },
      );
    }

    if (existing.isSystem) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Sistem rol tanımları güncellenemez.",
        },
        { status: 400 },
      );
    }

    const updated = await db.roleDefinition.update({
      where: { id },
      data: {
        displayName: parsed.data.displayName,
        description: parsed.data.description,
        isActive: parsed.data.isActive,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "RoleDefinition",
      entityId: id,
      oldValue: {
        displayName: existing.displayName,
        description: existing.description,
        isActive: existing.isActive,
      },
      newValue: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  },
  { requiredPermissions: ["role.definition.update"] },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı ID bilgisi eksik." },
        { status: 400 },
      );
    }

    const existing = await db.roleDefinition.findFirst({
      where: { id, isDeleted: false },
      include: {
        permissions: {
          where: { isDeleted: false },
          select: { id: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı bulunamadı." },
        { status: 404 },
      );
    }

    if (existing.isSystem) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Sistem rol tanımları silinemez.",
        },
        { status: 400 },
      );
    }

    await db.$transaction([
      db.roleDefinition.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      }),
      db.rolePermission.updateMany({
        where: {
          roleDefinitionId: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
    ]);

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "RoleDefinition",
      entityId: id,
      oldValue: {
        displayName: existing.displayName,
        role: existing.role,
        permissions: existing.permissions.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id },
      error: null,
    });
  },
  { requiredPermissions: ["role.definition.delete"] },
);
