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
const CONFIG_KEY = "system_open_for_reservation";

export const GET = withAuth(allRoles, async () => {
  const config = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
  });
  const isOpen = config ? config.value === "true" : true;
  return NextResponse.json({ isOpen });
});

export const PATCH = withAuth([Role.SYSTEM_ADMIN], async (req, { session }) => {
  const body = await req.json();
  const { isOpen } = body;

  if (typeof isOpen !== "boolean") {
    return NextResponse.json(
      { message: "isOpen alanı boolean olmalıdır" },
      { status: 400 },
    );
  }

  const oldConfig = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
  });

  const config = await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: String(isOpen) },
    create: { key: CONFIG_KEY, value: String(isOpen) },
  });

  logAudit({
    userId: session.user.id,
    action: "CONFIG_CHANGE",
    entity: "SystemConfig",
    entityId: CONFIG_KEY,
    oldValue: { isOpen: oldConfig ? oldConfig.value === "true" : true },
    newValue: { isOpen },
  });

  return NextResponse.json({ isOpen: config.value === "true" });
});
