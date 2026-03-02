"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { Role } from "@/types";

interface PermissionsResponse {
  success: boolean;
  data: {
    role: Role;
    permissions: string[];
  };
  error: string | null;
}

/**
 * Kullanıcının aktif permission'larını çeker ve kontrol fonksiyonları sağlar.
 *
 * Kullanım:
 *   const { can, canAny, canAll, permissions } = usePermissions();
 *
 *   if (can("product.create")) { ... }
 *   if (canAny(["product.create", "product.update"])) { ... }
 */
export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const { data, isLoading: isPermissionsLoading } =
    useQuery<PermissionsResponse>({
      queryKey: ["user-permissions", role],
      queryFn: async () => {
        const res = await fetch("/api/auth/permissions");
        if (!res.ok) throw new Error("Permission fetch failed");
        return res.json();
      },
      staleTime: 60_000, // 1 dk cache — permission-cache TTL ile senkron
      enabled: !!session?.user,
    });

  const permissionKeys = useMemo(() => {
    if (!data?.success) return new Set<string>();
    return new Set(data.data.permissions);
  }, [data]);

  const can = useCallback(
    (permissionKey: string): boolean => {
      if (!role) return false;
      if (role === Role.SYSTEM_ADMIN) return true;
      return permissionKeys.has(permissionKey);
    },
    [role, permissionKeys],
  );

  const canAny = useCallback(
    (keys: string[]): boolean => {
      if (!role) return false;
      if (role === Role.SYSTEM_ADMIN) return true;
      return keys.some((k) => permissionKeys.has(k));
    },
    [role, permissionKeys],
  );

  const canAll = useCallback(
    (keys: string[]): boolean => {
      if (!role) return false;
      if (role === Role.SYSTEM_ADMIN) return true;
      return keys.every((k) => permissionKeys.has(k));
    },
    [role, permissionKeys],
  );

  return {
    role,
    permissions: permissionKeys,
    can,
    canAny,
    canAll,
    isLoading: !session || isPermissionsLoading,
  };
}
