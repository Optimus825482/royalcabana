import { getAuthSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/types";
import { rateLimit } from "@/lib/rate-limit";
import {
  hasPermission,
  hasAnyPermission,
  getPermissionsForRole,
} from "@/lib/permission-cache";

interface AuthContext {
  session: {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
    };
  };
  params?: Record<string, string>;
  /** Kullanıcının aktif permission key'leri */
  permissions: Set<string>;
}

type ApiHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse>;

interface WithAuthOptions {
  rateLimit?: { limit?: number; windowMs?: number };
  /**
   * Granüler permission kontrolü.
   * Belirtilirse, rol kontrolüne ek olarak bu permission'lardan
   * en az birine sahip olma şartı aranır.
   *
   * Örnek: { requiredPermissions: ["product.create", "product.update"] }
   */
  requiredPermissions?: string[];
  /**
   * true ise tüm permission'lara sahip olma şartı aranır (AND).
   * false (default) ise en az birine sahip olma yeterli (OR).
   */
  requireAll?: boolean;
}

/**
 * API route wrapper — auth + RBAC (role + permission) + rate limiting
 *
 * Usage:
 *   // Sadece rol kontrolü (mevcut davranış)
 *   export const GET = withAuth([Role.ADMIN], handler);
 *
 *   // Rol + granüler permission kontrolü
 *   export const POST = withAuth([Role.ADMIN], handler, {
 *     requiredPermissions: ["product.create"],
 *   });
 *
 *   // Tüm permission'lar gerekli (AND)
 *   export const DELETE = withAuth([Role.ADMIN], handler, {
 *     requiredPermissions: ["product.delete", "product.view"],
 *     requireAll: true,
 *   });
 */
export function withAuth(
  allowedRoles: Role[],
  handler: ApiHandler,
  options?: WithAuthOptions,
) {
  return async (
    req: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> },
  ) => {
    // Rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const key = `${req.method}:${req.nextUrl.pathname}:${ip}`;
    const rlOpts = options?.rateLimit;

    if (!rateLimit(key, rlOpts?.limit ?? 30, rlOpts?.windowMs ?? 60_000)) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen biraz bekleyin." },
        { status: 429 },
      );
    }

    // Auth
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role as Role;

    // Role check
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Granüler permission check (opsiyonel)
    if (options?.requiredPermissions?.length) {
      const requireAll = options.requireAll ?? false;

      let permitted: boolean;
      if (requireAll) {
        // Tüm permission'lar gerekli
        permitted = true;
        for (const perm of options.requiredPermissions) {
          if (!(await hasPermission(userRole, perm))) {
            permitted = false;
            break;
          }
        }
      } else {
        permitted = await hasAnyPermission(
          userRole,
          options.requiredPermissions,
        );
      }

      if (!permitted) {
        return NextResponse.json(
          { error: "Bu işlem için yetkiniz bulunmuyor." },
          { status: 403 },
        );
      }
    }

    // Resolve params if present
    const params = routeContext?.params ? await routeContext.params : undefined;

    // Kullanıcının tüm permission'larını context'e ekle
    const permissions = await getPermissionsForRole(userRole);

    try {
      return await handler(req, {
        session: session as AuthContext["session"],
        params: params as Record<string, string> | undefined,
        permissions,
      });
    } catch (error) {
      console.error(
        `[API Error] ${req.method} ${req.nextUrl.pathname}:`,
        error,
      );

      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Geçersiz istek formatı." },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "Sunucu hatası. Lütfen tekrar deneyin." },
        { status: 500 },
      );
    }
  };
}
