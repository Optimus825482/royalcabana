import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.string().min(1)).default([]),
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

    const roleDef = await prisma.roleDefinition.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });

    if (!roleDef) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı bulunamadı." },
        { status: 404 },
      );
    }

    const links = await prisma.rolePermission.findMany({
      where: {
        roleDefinitionId: id,
        isDeleted: false,
        permission: {
          isDeleted: false,
          isActive: true,
        },
      },
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
      orderBy: {
        permission: {
          module: "asc",
        },
      },
    });

    return NextResponse.json({ success: true, data: links, error: null });
  },
);

export const PUT = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı ID bilgisi eksik." },
        { status: 400 },
      );
    }

    const roleDef = await prisma.roleDefinition.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, role: true, displayName: true },
    });

    if (!roleDef) {
      return NextResponse.json(
        { success: false, data: null, error: "Rol tanımı bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = parseBody(updatePermissionsSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error },
        { status: 400 },
      );
    }

    const requestedIds = Array.from(new Set(parsed.data.permissionIds));

    const validPermissions = await prisma.permission.findMany({
      where: {
        id: { in: requestedIds },
        isDeleted: false,
        isActive: true,
      },
      select: { id: true },
    });

    if (validPermissions.length !== requestedIds.length) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Geçersiz veya pasif izin seçimi var.",
        },
        { status: 400 },
      );
    }

    const existingLinks = await prisma.rolePermission.findMany({
      where: {
        roleDefinitionId: id,
      },
      select: {
        id: true,
        permissionId: true,
        isDeleted: true,
      },
    });

    const byPermissionId = new Map(
      existingLinks.map((link) => [link.permissionId, link]),
    );
    const selectedSet = new Set(requestedIds);
    const now = new Date();

    const tx: Array<
      | ReturnType<typeof prisma.rolePermission.update>
      | ReturnType<typeof prisma.rolePermission.create>
    > = [];

    for (const permissionId of requestedIds) {
      const existing = byPermissionId.get(permissionId);
      if (!existing) {
        tx.push(
          prisma.rolePermission.create({
            data: {
              roleDefinitionId: id,
              permissionId,
              isDeleted: false,
              deletedAt: null,
            },
          }),
        );
      } else if (existing.isDeleted) {
        tx.push(
          prisma.rolePermission.update({
            where: { id: existing.id },
            data: {
              isDeleted: false,
              deletedAt: null,
            },
          }),
        );
      }
    }

    for (const existing of existingLinks) {
      if (!existing.isDeleted && !selectedSet.has(existing.permissionId)) {
        tx.push(
          prisma.rolePermission.update({
            where: { id: existing.id },
            data: {
              isDeleted: true,
              deletedAt: now,
            },
          }),
        );
      }
    }

    if (tx.length > 0) {
      await prisma.$transaction(tx);
    }

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "RolePermission",
      entityId: id,
      newValue: {
        role: roleDef.role,
        roleDisplayName: roleDef.displayName,
        permissionCount: requestedIds.length,
      },
    });

    const updatedLinks = await prisma.rolePermission.findMany({
      where: {
        roleDefinitionId: id,
        isDeleted: false,
        permission: {
          isDeleted: false,
          isActive: true,
        },
      },
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
      orderBy: {
        permission: {
          module: "asc",
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedLinks,
      error: null,
    });
  },
);
