import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hasAccess } from "@/lib/rbac";
import { Role } from "@/types";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/logo.png",
  "/gorsel",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as Role;

  if (!hasAccess(role, pathname)) {
    return NextResponse.json(
      { error: "Forbidden", message: "Bu sayfaya erişim yetkiniz yok." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
