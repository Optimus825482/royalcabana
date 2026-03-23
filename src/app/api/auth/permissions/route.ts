import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { getPermissionsForRole } from "@/lib/permission-cache";

/**
 * GET /api/auth/permissions
 * Mevcut kullanıcının aktif permission key'lerini döndürür.
 * Frontend usePermissions hook'u bu endpoint'i kullanır.
 */
export const GET = withAuth(
  [
    Role.SYSTEM_ADMIN,
    Role.ADMIN,
    Role.CASINO_ADMIN,
    Role.CASINO_USER,
    Role.FNB_ADMIN,
    Role.FNB_USER,
  ],
  async (_req, { session }) => {
    const role = session.user.role;
    const permissions = await getPermissionsForRole(role);

    return NextResponse.json({
      success: true,
      data: {
        role,
        permissions: Array.from(permissions),
      },
      error: null,
    });
  },
);
