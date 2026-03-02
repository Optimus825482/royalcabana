import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

// GET /api/system/config/[key]
export const GET = withAuth(
  allRoles,
  async (_req, { params }) => {
    const key = params?.key;
    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key parametresi gerekli" },
        { status: 400 },
      );
    }

    const config = await prisma.systemConfig.findUnique({ where: { key } });

    return NextResponse.json({
      success: true,
      data: config ? { key: config.key, value: config.value } : null,
    });
  },
  { requiredPermissions: ["system.config.view"] },
);

// PUT /api/system/config/[key]
export const PUT = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { params }) => {
    const key = params?.key;
    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key parametresi gerekli" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { value } = body;

    if (typeof value !== "string") {
      return NextResponse.json(
        { success: false, error: "value alanı string olmalıdır" },
        { status: 400 },
      );
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({
      success: true,
      data: { key: config.key, value: config.value },
    });
  },
  { requiredPermissions: ["system.config.update"] },
);
