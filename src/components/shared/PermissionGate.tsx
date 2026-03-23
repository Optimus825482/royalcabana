"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { Role } from "@/types";

interface PermissionGateProps {
  /** Gerekli permission key(ler) */
  permission?: string;
  permissions?: string[];
  /** true ise tüm permission'lar gerekli (AND), false ise en az biri yeterli (OR) */
  requireAll?: boolean;
  /** İzin verilen roller (rol kontrolü yapılmak istenirse) */
  allowedRoles?: Role[];
  /** Yetki yoksa gösterilecek fallback (opsiyonel) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Permission-aware conditional rendering.
 *
 * Kullanım:
 *   <PermissionGate permission="product.create">
 *     <CreateProductButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permissions={["product.create", "product.update"]} requireAll>
 *     <BulkEditPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate allowedRoles={[Role.FNB_ADMIN, Role.FNB_USER]}>
 *     <ApproveButton />
 *   </PermissionGate>
 */
export default function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  allowedRoles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();
  const { data: session } = useSession();

  // Rol kontrolü - sadece belirtilen rollere izin ver
  if (allowedRoles?.length) {
    const userRole = session?.user?.role as Role | undefined;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <>{fallback}</>;
    }
    // Rol izni varsa permission kontrolüne geç (opsiyonel)
    if (!permission && !permissions?.length) {
      return <>{children}</>;
    }
  }

  // Tek permission kontrolü
  if (permission) {
    return can(permission) ? <>{children}</> : <>{fallback}</>;
  }

  // Çoklu permission kontrolü
  if (permissions?.length) {
    const hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // Permission belirtilmemişse her zaman göster
  return <>{children}</>;
}
