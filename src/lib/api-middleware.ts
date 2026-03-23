import { getAuthSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/types";
import { rateLimitWithInfo } from "@/lib/rate-limit";
import { withTiming } from "@/lib/api-timing";
import { hasAllPermissions } from "@/lib/permission-cache";

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
}

type ApiHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse>;

/**
 * API route wrapper — auth + RBAC + rate limiting
 *
 * All error responses follow: { success: false, error: "..." }
 * Rate limit responses include Retry-After header.
 *
 * Usage:
 *   export const GET = withAuth([Role.ADMIN], async (req, { session }) => { ... });
 */
export function withAuth(
  allowedRoles: Role[],
  handler: ApiHandler,
  options?: {
    rateLimit?: { limit?: number; windowMs?: number };
    requiredPermissions?: string[];
  },
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

    const rlResult = await rateLimitWithInfo(
      key,
      rlOpts?.limit ?? 30,
      rlOpts?.windowMs ?? 60_000,
    );

    if (!rlResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Çok fazla istek. Lütfen biraz bekleyin." },
        {
          status: 429,
          headers: { "Retry-After": String(rlResult.retryAfter ?? 60) },
        },
      );
    }

    // Auth
    const session = await getAuthSession();
    if (!session?.user) {
      console.log(`[DEBUG Auth] No session for ${req.method} ${req.nextUrl.pathname}`);
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log(`[DEBUG Auth] User: ${session.user.id}, Role: ${session.user.role}, Path: ${req.method} ${req.nextUrl.pathname}`);

    // RBAC
    if (!allowedRoles.includes(session.user.role as Role)) {
      console.log(`[DEBUG RBAC] Role ${session.user.role} not in [${allowedRoles.join(", ")}]`);
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Permission check (after role gate — only if requiredPermissions specified)
    if (options?.requiredPermissions?.length) {
      const hasPerms = await hasAllPermissions(
        session.user.role as Role,
        options.requiredPermissions,
      );
      console.log(`[DEBUG Perms] Role ${session.user.role}, Required: [${options.requiredPermissions.join(", ")}], Has: ${hasPerms}`);
      if (!hasPerms) {
        return NextResponse.json(
          { success: false, error: "Bu işlem için yetkiniz yok." },
          { status: 403 },
        );
      }
    }

    // Resolve params if present
    const params = routeContext?.params ? await routeContext.params : undefined;

    return withTiming(req, async () => {
      try {
        return await handler(req, {
          session: session as AuthContext["session"],
          params: params as Record<string, string> | undefined,
        });
      } catch (error) {
        console.error(
          `[API Error] ${req.method} ${req.nextUrl.pathname}:`,
          error,
        );

        if (error instanceof SyntaxError) {
          return NextResponse.json(
            { success: false, error: "Geçersiz istek formatı." },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { success: false, error: "Sunucu hatası." },
          { status: 500 },
        );
      }
    });
  };
}
