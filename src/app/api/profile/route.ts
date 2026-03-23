import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

const ALL_ROLES = [
  Role.SYSTEM_ADMIN,
  Role.ADMIN,
  Role.CASINO_ADMIN,
  Role.CASINO_USER,
  Role.FNB_ADMIN,
  Role.FNB_USER,
];

/** GET /api/profile — mevcut kullanıcının profil bilgileri */
export const GET = withAuth(ALL_ROLES, async (_req, { session }) => {
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
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
      { success: false, data: null, error: "Kullanıcı bulunamadı" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: user, error: null });
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
        {
          success: false,
          data: null,
          error: "Güncellenecek en az bir alan gerekli.",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    // Şifre değişikliği varsa mevcut şifre doğrulanmalı
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Şifre değiştirmek için mevcut şifrenizi girin.",
          },
          { status: 400 },
        );
      }
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, data: null, error: "Mevcut şifre hatalı." },
          { status: 400 },
        );
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error:
              "Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir.",
          },
          { status: 400 },
        );
      }
    }

    // Username/email benzersizlik kontrolü
    if (username && username !== user.username) {
      const existing = await prisma.user.findFirst({
        where: { username, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Bu kullanıcı adı zaten kullanılıyor.",
          },
          { status: 409 },
        );
      }
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findFirst({
        where: { email, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Bu e-posta adresi zaten kullanılıyor.",
          },
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
      return NextResponse.json({
        success: true,
        data: { message: "Değişiklik yok." },
        error: null,
      });
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

    return NextResponse.json({ success: true, data: updated, error: null });
  },
);
