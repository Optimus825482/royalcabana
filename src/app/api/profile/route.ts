import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

const ALL_ROLES = [
  Role.SYSTEM_ADMIN,
  Role.ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

/** GET /api/profile — mevcut kullanıcının profil bilgileri */
export const GET = withAuth(ALL_ROLES, async (_req, { session }) => {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Kullanıcı bulunamadı" },
      { status: 404 },
    );
  }

  return NextResponse.json(user);
});

/** PATCH /api/profile — kullanıcı bilgilerini güncelle */
export const PATCH = withAuth(
  ALL_ROLES,
  async (req: NextRequest, { session }) => {
    const body = await req.json();
    const { username, email, currentPassword, newPassword } = body as {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    // En az bir alan değişmeli
    if (!username && !email && !newPassword) {
      return NextResponse.json(
        { error: "Güncellenecek en az bir alan gerekli." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    // Şifre değişikliği varsa mevcut şifre doğrulanmalı
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Şifre değiştirmek için mevcut şifrenizi girin." },
          { status: 400 },
        );
      }
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Mevcut şifre hatalı." },
          { status: 400 },
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Yeni şifre en az 6 karakter olmalı." },
          { status: 400 },
        );
      }
    }

    // Username/email benzersizlik kontrolü
    if (username && username !== user.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return NextResponse.json(
          { error: "Bu kullanıcı adı zaten kullanılıyor." },
          { status: 409 },
        );
      }
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: "Bu e-posta adresi zaten kullanılıyor." },
          { status: 409 },
        );
      }
    }

    // Güncelleme verisi hazırla
    const updateData: Record<string, unknown> = {};
    if (username && username !== user.username) updateData.username = username;
    if (email && email !== user.email) updateData.email = email;
    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "Değişiklik yok." });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const changedFields: Record<string, unknown> = {};
    if (updateData.username) changedFields.username = updateData.username;
    if (updateData.email) changedFields.email = updateData.email;
    if (updateData.passwordHash) changedFields.password = "***changed***";

    logAudit({
      userId: session.user.id,
      action: "PROFILE_UPDATE",
      entity: "Profile",
      entityId: session.user.id,
      oldValue: { username: user.username, email: user.email },
      newValue: changedFields,
    });

    return NextResponse.json(updated);
  },
);
