import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { Role as AppRole } from "@/types";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { ensureRbacBootstrap } from "@/services/rbac.service";

const createSchema = z.object({
  role: z.nativeEnum(Role),
  displayName: z.string().min(2).max(80),
  description: z.string().max(400).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const GET = withAuth([AppRole.SYSTEM_ADMIN, AppRole.ADMIN], async () => {
  await ensureRbacBootstrap();

  const items = await prisma.roleDefinition.findMany({
    where: { isDeleted: false },
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
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: items,
    error: null,
  });
});

export const POST = withAuth(
  [AppRole.SYSTEM_ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error },
        { status: 400 },
      );
    }

    const existing = await prisma.roleDefinition.findFirst({
      where: {
        role: parsed.data.role,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Bu role ait tanım zaten mevcut.",
        },
        { status: 409 },
      );
    }

    const item = await prisma.roleDefinition.create({
      data: {
        role: parsed.data.role,
        displayName: parsed.data.displayName,
        description: parsed.data.description ?? null,
        isSystem: false,
        isActive: parsed.data.isActive ?? true,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "RoleDefinition",
      entityId: item.id,
      newValue: {
        role: item.role,
        displayName: item.displayName,
        description: item.description,
        isActive: item.isActive,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: item,
        error: null,
      },
      { status: 201 },
    );
  },
);
