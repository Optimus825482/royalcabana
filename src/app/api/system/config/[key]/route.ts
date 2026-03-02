import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

const CONFIG_LABELS: Record<string, string> = {
  demo_quick_login_enabled: "Demo hızlı giriş",
  system_open_for_reservation: "Sistem rezervasyon durumu",
  system_currency: "Sistem para birimi",
};

function toReadableValue(key: string, raw: string): string {
  if (
    key === "demo_quick_login_enabled" ||
    key === "system_open_for_reservation"
  ) {
    return raw === "true" ? "Açık" : "Kapalı";
  }
  return raw;
}

// GET /api/system/config/[key] — herhangi bir config key'ini oku
export const GET = withAuth(allRoles, async (_req, { params }) => {
  const key = params!.key;
  const config = await prisma.systemConfig.findUnique({
    where: { key },
  });
  // Config yoksa null dön (404 yerine) — frontend default değerleri kullanır
  return NextResponse.json({
    success: true,
    data: config ? { key: config.key, value: config.value } : null,
  });
});

// PUT /api/system/config/[key] — config key'ini güncelle veya oluştur
export const PUT = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { params, session }) => {
    const key = params!.key;
    const body = await req.json();
    const { value } = body;

    if (typeof value !== "string") {
      return NextResponse.json(
        { success: false, error: "value alanı string olmalıdır" },
        { status: 400 },
      );
    }

    const oldConfig = await prisma.systemConfig.findUnique({
      where: { key },
    });

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    logAudit({
      userId: session.user.id,
      action: "CONFIG_CHANGE",
      entity: "SystemConfig",
      entityId: key,
      oldValue: oldConfig
        ? {
            key,
            label: CONFIG_LABELS[key] ?? key,
            value: oldConfig.value,
            readableValue: toReadableValue(key, oldConfig.value),
          }
        : null,
      newValue: {
        key,
        label: CONFIG_LABELS[key] ?? key,
        value,
        readableValue: toReadableValue(key, value),
      },
    });

    return NextResponse.json({
      success: true,
      data: { key: config.key, value: config.value },
    });
  },
);
