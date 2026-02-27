import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const CONFIG_KEY = "cancellation_policy";

interface CancellationRule {
  id: string;
  hoursBeforeStart: number;
  penaltyPercent: number;
  label: string;
}

interface CancellationPolicy {
  enabled: boolean;
  rules: CancellationRule[];
  defaultPenaltyPercent: number;
}

const DEFAULT_POLICY: CancellationPolicy = {
  enabled: false,
  rules: [],
  defaultPenaltyPercent: 100,
};

function isValidPolicy(data: unknown): data is CancellationPolicy {
  if (!data || typeof data !== "object") return false;
  const p = data as Record<string, unknown>;
  if (typeof p.enabled !== "boolean") return false;
  if (typeof p.defaultPenaltyPercent !== "number") return false;
  if (p.defaultPenaltyPercent < 0 || p.defaultPenaltyPercent > 100)
    return false;
  if (!Array.isArray(p.rules)) return false;
  for (const r of p.rules) {
    if (!r || typeof r !== "object") return false;
    if (typeof r.id !== "string" || !r.id) return false;
    if (typeof r.hoursBeforeStart !== "number" || r.hoursBeforeStart < 0)
      return false;
    if (
      typeof r.penaltyPercent !== "number" ||
      r.penaltyPercent < 0 ||
      r.penaltyPercent > 100
    )
      return false;
    if (typeof r.label !== "string" || !r.label.trim()) return false;
  }
  return true;
}

export const GET = withAuth([Role.SYSTEM_ADMIN], async () => {
  const config = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
  });

  if (!config) {
    return NextResponse.json(DEFAULT_POLICY);
  }

  try {
    const policy = JSON.parse(config.value) as CancellationPolicy;
    return NextResponse.json(policy);
  } catch {
    return NextResponse.json(DEFAULT_POLICY);
  }
});

export const PUT = withAuth([Role.SYSTEM_ADMIN], async (req, { session }) => {
  const body = await req.json();

  if (!isValidPolicy(body)) {
    return NextResponse.json(
      { message: "Geçersiz iptal politikası verisi" },
      { status: 400 },
    );
  }

  const oldConfig = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
  });

  const oldValue = oldConfig
    ? (JSON.parse(oldConfig.value) as CancellationPolicy)
    : DEFAULT_POLICY;

  const config = await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: JSON.stringify(body) },
    create: { key: CONFIG_KEY, value: JSON.stringify(body) },
  });

  logAudit({
    userId: session.user.id,
    action: "CONFIG_CHANGE",
    entity: "SystemConfig",
    entityId: CONFIG_KEY,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: body as unknown as Record<string, unknown>,
  });

  return NextResponse.json(JSON.parse(config.value));
});
