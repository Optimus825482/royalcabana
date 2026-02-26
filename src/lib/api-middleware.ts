import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";
import { rateLimit } from "@/lib/rate-limit";

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
 * Usage:
 *   export const GET = withAuth([Role.ADMIN], async (req, { session }) => { ... });
 */
export function withAuth(
  allowedRoles: Role[],
  handler: ApiHandler,
  options?: { rateLimit?: { limit?: number; windowMs?: number } },
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Resolve params if present
    const params = routeContext?.params ? await routeContext.params : undefined;

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
