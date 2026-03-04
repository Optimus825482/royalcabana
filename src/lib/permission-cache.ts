import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import redis from "@/lib/redis";

const CACHE_TTL_SECONDS = 300;
const CACHE_KEY_PREFIX = "permissions:";
const CACHE_VERSION = "v1";

interface MemEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const memCache = new Map<string, MemEntry>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as typeof prisma & Record<string, any>;

function cacheKey(role: Role): string {
  return `${CACHE_KEY_PREFIX}${role}:${CACHE_VERSION}`;
}

/**
 * Belirli bir rolün aktif permission key'lerini döndürür.
 * Redis → in-memory fallback → DB sırasıyla dener.
 */
export async function getPermissionsForRole(role: Role): Promise<Set<string>> {
  const now = Date.now();
  const key = cacheKey(role);

  // L1: in-memory
  const mem = memCache.get(key);
  if (mem && now < mem.expiresAt) {
    return mem.permissions;
  }

  // L2: Redis
  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        const keys = new Set<string>(JSON.parse(hit) as string[]);
        memCache.set(key, { permissions: keys, expiresAt: now + CACHE_TTL_SECONDS * 1000 });
        return keys;
      }
    } catch {
      // Redis read failed — fall through to DB
    }
  }

  // L3: DB
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

  const arr = [...keys];

  // Write to Redis
  if (redis) {
    try {
      await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(arr));
    } catch {
      // Redis write failed — continue with memory
    }
  }

  // Write to memory
  memCache.set(key, {
    permissions: keys,
    expiresAt: now + CACHE_TTL_SECONDS * 1000,
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
 * Redis + in-memory her ikisini de temizler.
 */
export async function invalidatePermissionCache(role?: Role): Promise<void> {
  if (role) {
    const key = cacheKey(role);
    memCache.delete(key);
    if (redis) {
      try {
        await redis.del(key);
      } catch {
        // ignore
      }
    }
  } else {
    memCache.clear();
    if (redis) {
      try {
        let cursor = "0";
        do {
          const [next, keys] = await redis.scan(
            cursor,
            "MATCH",
            `${CACHE_KEY_PREFIX}*`,
            "COUNT",
            100,
          );
          cursor = next;
          if (keys.length > 0) await redis.del(...keys);
        } while (cursor !== "0");
      } catch {
        // ignore
      }
    }
  }
}
