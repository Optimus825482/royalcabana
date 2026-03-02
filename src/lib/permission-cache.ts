import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

/**
 * In-memory permission cache with TTL.
 * Production'da Redis tercih edilmeli — şimdilik process-level cache yeterli.
 *
 * Cache key: Role enum string
 * Cache value: Set<string> (permission keys)
 * TTL: 60 saniye — rol yetki değişikliği max 1 dk'da yansır
 */

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 saniye

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as typeof prisma & Record<string, any>;

/**
 * Belirli bir rolün aktif permission key'lerini döndürür.
 * Önce cache'e bakar, yoksa DB'den çeker ve cache'ler.
 */
export async function getPermissionsForRole(role: Role): Promise<Set<string>> {
  const now = Date.now();
  const cached = cache.get(role);

  if (cached && now < cached.expiresAt) {
    return cached.permissions;
  }

  // DB'den çek
  const roleDef = await db.roleDefinition.findFirst({
    where: {
      role,
      isDeleted: false,
      isActive: true,
    },
    select: {
      permissions: {
        where: {
          isDeleted: false,
          permission: {
            isDeleted: false,
            isActive: true,
          },
        },
        select: {
          permission: {
            select: { key: true },
          },
        },
      },
    },
  });

  const keys = new Set<string>(
    roleDef?.permissions?.map(
      (rp: { permission: { key: string } }) => rp.permission.key,
    ) ?? [],
  );

  cache.set(role, {
    permissions: keys,
    expiresAt: now + CACHE_TTL_MS,
  });

  return keys;
}

/**
 * Belirli bir rolün belirli bir permission'a sahip olup olmadığını kontrol eder.
 */
export async function hasPermission(
  role: Role,
  permissionKey: string,
): Promise<boolean> {
  // SYSTEM_ADMIN her zaman full erişim
  if (role === Role.SYSTEM_ADMIN) return true;

  const permissions = await getPermissionsForRole(role);
  return permissions.has(permissionKey);
}

/**
 * Birden fazla permission'dan en az birine sahip mi?
 */
export async function hasAnyPermission(
  role: Role,
  permissionKeys: string[],
): Promise<boolean> {
  if (role === Role.SYSTEM_ADMIN) return true;

  const permissions = await getPermissionsForRole(role);
  return permissionKeys.some((key) => permissions.has(key));
}

/**
 * Tüm permission'lara sahip mi?
 */
export async function hasAllPermissions(
  role: Role,
  permissionKeys: string[],
): Promise<boolean> {
  if (role === Role.SYSTEM_ADMIN) return true;

  const permissions = await getPermissionsForRole(role);
  return permissionKeys.every((key) => permissions.has(key));
}

/**
 * Cache'i temizle — rol yetkileri güncellendiğinde çağrılmalı.
 */
export function invalidatePermissionCache(role?: Role): void {
  if (role) {
    cache.delete(role);
  } else {
    cache.clear();
  }
}
