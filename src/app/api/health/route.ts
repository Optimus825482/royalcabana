import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: string; latencyMs?: number; error?: string };
    redis: { status: string; latencyMs?: number; error?: string };
  };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result: HealthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: "unknown" },
      redis: { status: "unknown" },
    },
  };

  // DB check
  try {
    const dbStart = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    result.checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (e: unknown) {
    result.checks.database = {
      status: "down",
      error:
        process.env.NODE_ENV === "development"
          ? e instanceof Error
            ? e.message
            : "Unknown error"
          : "Connection failed",
    };
    result.status = "unhealthy";
  }

  // Redis check
  try {
    if (!redis) {
      result.checks.redis = { status: "not_configured" };
    } else {
      const rStart = Date.now();
      await redis.ping();
      result.checks.redis = {
        status: "up",
        latencyMs: Date.now() - rStart,
      };
    }
  } catch (e: unknown) {
    result.checks.redis = {
      status: "down",
      error:
        process.env.NODE_ENV === "development"
          ? e instanceof Error
            ? e.message
            : "Unknown error"
          : "Connection failed",
    };
    if (result.status === "healthy") result.status = "degraded";
  }

  const httpStatus = result.status === "unhealthy" ? 503 : 200;

  return NextResponse.json(
    { success: true, data: result },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
