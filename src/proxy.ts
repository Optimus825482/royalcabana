import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { MODULE_ACCESS } from "@/types";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — skip auth
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Static files & Next.js internals — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token expired (deactivated user)
  if (token.expired) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;

  // RBAC — check module access
  const allProtectedPaths = Object.values(MODULE_ACCESS).flat();
  const isProtected = allProtectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const allowedPaths =
      MODULE_ACCESS[role as keyof typeof MODULE_ACCESS] ?? [];
    const hasAccess = allowedPaths.some((p) => pathname.startsWith(p));

    if (!hasAccess) {
      const defaultPath = allowedPaths[0] ?? "/login";
      return NextResponse.redirect(new URL(defaultPath, req.url));
    }
  }

  // Security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "on");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|gorsel|logo).*)"],
};
