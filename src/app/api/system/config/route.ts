import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const CONFIG_KEY = "system_open_for_reservation";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEY },
  });

  const isOpen = config ? config.value === "true" : true;

  return NextResponse.json({ isOpen });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { isOpen } = body;

  if (typeof isOpen !== "boolean") {
    return NextResponse.json(
      { message: "isOpen alanı boolean olmalıdır" },
      { status: 400 },
    );
  }

  const config = await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: String(isOpen) },
    create: { key: CONFIG_KEY, value: String(isOpen) },
  });

  return NextResponse.json({ isOpen: config.value === "true" });
}
