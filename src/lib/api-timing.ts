import { NextRequest, NextResponse } from "next/server";

const SLOW_THRESHOLD_MS = 1000;
const CRITICAL_THRESHOLD_MS = 3000;

export function withTiming<T extends NextResponse>(
  req: NextRequest,
  execute: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  const route = `${req.method} ${req.nextUrl.pathname}`;

  return execute().then(
    (response) => {
      const duration = performance.now() - start;
      logTiming(route, duration, response.status);
      response.headers.set(
        "Server-Timing",
        `total;dur=${duration.toFixed(1)};desc="Total"`,
      );
      return response;
    },
    (error) => {
      const duration = performance.now() - start;
      console.error(`[API Timing] ${route} THREW after ${duration.toFixed(0)}ms`);
      throw error;
    },
  );
}

function logTiming(route: string, durationMs: number, status: number) {
  const rounded = Math.round(durationMs);

  if (durationMs >= CRITICAL_THRESHOLD_MS) {
    console.error(
      `[API CRITICAL] ${route} → ${status} in ${rounded}ms (>${CRITICAL_THRESHOLD_MS}ms)`,
    );
  } else if (durationMs >= SLOW_THRESHOLD_MS) {
    console.warn(
      `[API SLOW] ${route} → ${status} in ${rounded}ms (>${SLOW_THRESHOLD_MS}ms)`,
    );
  }
}
