import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rl = await checkRateLimit(`csp:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit aşıldı." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    console.warn("[CSP Violation]", JSON.stringify(body));
  } catch {
    // ignore malformed reports
  }
  return new NextResponse(null, { status: 204 });
}
