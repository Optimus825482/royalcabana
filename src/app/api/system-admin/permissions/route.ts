import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { prisma } from "@/lib/prisma";
import { ensureRbacBootstrap } from "@/services/rbac.service";

const db = prisma as any;

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async () => {
    await ensureRbacBootstrap();

    const permissions = await db.permission.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        key: true,
        name: true,
        module: true,
        action: true,
        description: true,
        isSystem: true,
      },
      orderBy: [{ module: "asc" }, { action: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: permissions,
      error: null,
    });
  },
  { requiredPermissions: ["role.definition.view"] },
);
