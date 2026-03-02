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

// GET /api/system/config/[key] — herhangi bir config key'ini oku
export const GET = withAuth(allRoles, async (_req, { params }) => {
  const key = params!.key;
  const config = await prisma.systemConfig.findUnique({
    where: { key },
  });
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Config bulunamadı" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    data: { key: config.key, value: config.value },
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
      oldValue: oldConfig ? { value: oldConfig.value } : null,
      newValue: { value },
    });

    return NextResponse.json({
      success: true,
      data: { key: config.key, value: config.value },
    });
  },
);
