import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  [Role.SYSTEM_ADMIN]: "Sistem Yöneticisi",
  [Role.ADMIN]: "Admin",
  [Role.CASINO_ADMIN]: "Casino Admin",
  [Role.CASINO_USER]: "Casino Kullanıcısı",
  [Role.FNB_USER]: "F&B Kullanıcısı",
};

const DEMO_USERNAMES = ["sysadmin", "fadmin", "casino1", "cadmin", "fnb1"];

const DEMO_PASSWORDS: Record<string, string> = {
  sysadmin: "admin123",
  fadmin: "123456",
  casino1: "admin123",
  cadmin: "admin123",
  fnb1: "admin123",
};

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, error: "Demo hesaplar production'da devre dışı." },
      { status: 403 },
    );
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        username: { in: DEMO_USERNAMES },
        isActive: true,
        deletedAt: null,
      },
      select: { username: true, role: true },
      orderBy: { createdAt: "asc" },
    });

    const data = users.map((u) => ({
      label: ROLE_LABELS[u.role] ?? u.role,
      username: u.username,
      password: DEMO_PASSWORDS[u.username] ?? "",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[demo-accounts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  }
}
