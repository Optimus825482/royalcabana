import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ROLE_PERMISSION_KEYS,
  PERMISSION_TEMPLATES,
  ROLE_DISPLAY_DEFAULTS,
} from "@/lib/rbac";
import { Role } from "@prisma/client";

const db = prisma as any;

export async function ensureRbacBootstrap() {
  for (const permission of PERMISSION_TEMPLATES) {
    await db.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        module: permission.module,
        action: permission.action,
        description: permission.description ?? null,
        isSystem: true,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        key: permission.key,
        name: permission.name,
        module: permission.module,
        action: permission.action,
        description: permission.description ?? null,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const permissionMap = new Map<string, string>();
  const permissions = await db.permission.findMany({
    where: { isDeleted: false },
    select: { id: true, key: true },
  });

  for (const permission of permissions) {
    permissionMap.set(permission.key, permission.id);
  }

  const roles = Object.values(Role);

  for (const role of roles) {
    const roleKey = role as keyof typeof ROLE_DISPLAY_DEFAULTS;
    const displayName = ROLE_DISPLAY_DEFAULTS[roleKey];
    const defaultPermissionKeys = DEFAULT_ROLE_PERMISSION_KEYS[roleKey] ?? [];

    const definition = await db.roleDefinition.upsert({
      where: { role },
      update: {
        displayName,
        isSystem: true,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        role,
        displayName,
        description: `${displayName} için varsayılan rol tanımı`,
        isSystem: true,
        isActive: true,
      },
      select: { id: true },
    });

    const activeLinks = await db.rolePermission.count({
      where: {
        roleDefinitionId: definition.id,
        isDeleted: false,
      },
    });

    if (activeLinks > 0) {
      continue;
    }

    for (const permissionKey of defaultPermissionKeys) {
      const permissionId = permissionMap.get(permissionKey);
      if (!permissionId) continue;

      const existing = await db.rolePermission.findFirst({
        where: {
          roleDefinitionId: definition.id,
          permissionId,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        if (existing.isDeleted) {
          await db.rolePermission.update({
            where: { id: existing.id },
            data: { isDeleted: false, deletedAt: null },
          });
        }
        continue;
      }

      await db.rolePermission.create({
        data: {
          roleDefinitionId: definition.id,
          permissionId,
        },
      });
    }
  }
}
