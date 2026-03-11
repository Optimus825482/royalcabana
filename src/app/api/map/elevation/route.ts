import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

const CONFIG_KEY = "map_elevation_data";

// GET — Kaydedilmiş elevation displacement verisini getir
export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async () => {
    const config = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    return NextResponse.json({
      success: true,
      data: config?.value ?? null,
    });
  },
);

// POST — Elevation displacement verisini kaydet (base64 PNG)
export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const { elevationData } = body as { elevationData?: string };

    if (!elevationData || typeof elevationData !== "string") {
      return NextResponse.json(
        { success: false, error: "elevationData gerekli." },
        { status: 400 },
      );
    }

    // Max ~5MB check (base64 PNG of 1040x678 grayscale is typically <500KB)
    if (elevationData.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Veri çok büyük (max 5MB)." },
        { status: 400 },
      );
    }

    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: elevationData },
      create: { key: CONFIG_KEY, value: elevationData },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ELEVATION_SAVE",
        entity: "SystemConfig",
        entityId: CONFIG_KEY,
        newValue: { saved: true, size: elevationData.length },
      },
    });

    return NextResponse.json({ success: true });
  },
);

// DELETE — Elevation displacement verisini sıfırla
export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session }) => {
    await prisma.systemConfig.deleteMany({
      where: { key: CONFIG_KEY },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ELEVATION_RESET",
        entity: "SystemConfig",
        entityId: CONFIG_KEY,
        newValue: { reset: true },
      },
    });

    return NextResponse.json({ success: true });
  },
);
