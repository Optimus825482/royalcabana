import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type Role = "SYSTEM_ADMIN" | "ADMIN" | "CASINO_USER" | "FNB_USER";

const ROLE_ALLOWED_PATHS: Record<Role, string[]> = {
  SYSTEM_ADMIN: ["/system-admin", "/reports"],
  ADMIN: ["/admin"],
  CASINO_USER: ["/casino", "/reports"],
  FNB_USER: [
    "/fnb",
    "/casino/map",
    "/casino/calendar",
    "/casino/view",
    "/casino/reservations",
    "/casino/waitlist",
    "/casino/recurring",
  ],
};

const COMMON_PATHS = ["/profile", "/weather"];

const PROTECTED_PREFIXES = [
  "/admin",
  "/casino",
  "/fnb",
  "/system-admin",
  "/reports",
];

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth", "/api/health"];
const STATIC_PREFIXES = [
  "/_next/static",
  "/_next/image",
  "/favicon",
  "/icons",
  "/logo",
  "/sw.js",
  "/manifest.json",
  "/offline.html",
];

function buildCspHeader(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // nonce in style-src would cause 'unsafe-inline' to be ignored (CSP spec); use only 'unsafe-inline' so inline style attributes work
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // allow same-origin + Google Analytics if used; avoid blocking login /api/auth
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://*.google-analytics.com",
  ];
  return directives.join("; ");
}

function isPathAllowedForRole(pathname: string, role: Role): boolean {
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (!allowed) return false;
  return allowed.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = buildCspHeader(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", cspHeader);
    response.headers.set("x-nonce", nonce);
    return response;
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.expired) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = token.role as Role | undefined;
  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const needsRbac =
    !pathname.startsWith("/api/") &&
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsRbac && !COMMON_PATHS.some((p) => pathname.startsWith(p))) {
    if (!isPathAllowedForRole(pathname, role)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|logo|sw.js|manifest.json|offline.html).*)",
  ],
};
