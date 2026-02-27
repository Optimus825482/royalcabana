import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/ua-parser";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { latitude, longitude } = body as {
      latitude?: number;
      longitude?: number;
    };

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const ua = req.headers.get("user-agent");
    const parsed = parseUserAgent(ua);

    // IP-based geolocation fallback
    let city: string | null = null;
    let country: string | null = null;
    let lat = latitude ?? null;
    let lng = longitude ?? null;

    if (!lat && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geoRes = await fetch(
          `http://ip-api.com/json/${ip}?fields=city,country,lat,lon`,
          {
            signal: AbortSignal.timeout(3000),
          },
        );
        if (geoRes.ok) {
          const geo = await geoRes.json();
          city = geo.city ?? null;
          country = geo.country ?? null;
          lat = geo.lat ?? null;
          lng = geo.lon ?? null;
        }
      } catch {
        // IP geolocation failed — continue without
      }
    }

    // Close any stale active sessions for this user
    await prisma.loginSession.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: {
        isActive: false,
        logoutAt: new Date(),
        duration: 0, // unknown duration for stale sessions
      },
    });

    const loginSession = await prisma.loginSession.create({
      data: {
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua,
        deviceType: parsed.deviceType,
        browser: parsed.browser,
        os: parsed.os,
        latitude: lat,
        longitude: lng,
        city,
        country,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "LOGIN",
      entity: "Session",
      entityId: loginSession.id,
      newValue: {
        ip,
        browser: parsed.browser,
        os: parsed.os,
        deviceType: parsed.deviceType,
        city,
        country,
      },
    });

    return NextResponse.json({ sessionId: loginSession.id });
  } catch (error) {
    console.error("[login-track] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
