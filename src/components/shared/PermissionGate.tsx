"use client";

import { usePermissions } from "@/hooks/usePermissions";
import type { ReactNode } from "react";

interface PermissionGateProps {
  /** Gerekli permission key(ler) */
  permission?: string;
  permissions?: string[];
  /** true ise tüm permission'lar gerekli (AND), false ise en az biri yeterli (OR) */
  requireAll?: boolean;
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
 */
export default function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

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
