import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_LOGIN_KEY = "demo_quick_login_enabled";

export const dynamic = "force-dynamic";

export async function GET() {
  const demoConfig = await prisma.systemConfig.findUnique({
    where: { key: DEMO_LOGIN_KEY },
    select: { value: true },
  });

  const demoQuickLoginEnabled = demoConfig ? demoConfig.value === "true" : true;

  return NextResponse.json({
    success: true,
    data: {
      demoQuickLoginEnabled,
    },
    error: null,
  });
}
