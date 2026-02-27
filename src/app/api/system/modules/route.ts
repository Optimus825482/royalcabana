import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const CONFIG_KEY = "module_config";

export interface ModuleConfig {
  reviews: { enabled: boolean };
}

const DEFAULT_CONFIG: ModuleConfig = {
  reviews: { enabled: true },
};

function isValidConfig(data: unknown): data is ModuleConfig {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!d.reviews || typeof d.reviews !== "object") return false;
  const r = d.reviews as Record<string, unknown>;
  if (typeof r.enabled !== "boolean") return false;
  return true;
}

async function getModuleConfig(): Promise<ModuleConfig> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
  });
  if (!config) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(config.value);
    return isValidConfig(parsed) ? parsed : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

// GET — all authenticated users can read module config
export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async () => {
    const config = await getModuleConfig();
    return NextResponse.json(config);
  },
);

// PUT — only SYSTEM_ADMIN can update
export const PUT = withAuth([Role.SYSTEM_ADMIN], async (req, { session }) => {
  const body = await req.json();
  if (!isValidConfig(body)) {
    return NextResponse.json(
      { message: "Geçersiz modül konfigürasyonu" },
      { status: 400 },
    );
  }

  const oldConfig = await getModuleConfig();

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
    oldValue: oldConfig as unknown as Record<string, unknown>,
    newValue: body as unknown as Record<string, unknown>,
  });

  return NextResponse.json(JSON.parse(config.value));
});
