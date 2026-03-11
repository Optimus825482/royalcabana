import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { Prisma } from "@prisma/client";

const ADMIN_ALLOWED_ROLES = [Role.CASINO_USER, Role.FNB_USER];
const CASINO_ADMIN_ALLOWED_ROLES = [Role.CASINO_USER];

const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    "Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir.",
  );

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: passwordSchema.optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_ADMIN],
  async (req, { session, params }) => {
    const id = params!.id;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const isAdmin = session.user.role === Role.ADMIN;
    const isCasinoAdmin = session.user.role === Role.CASINO_ADMIN;

    // CASINO_ADMIN can only edit CASINO_USER
    if (isCasinoAdmin && user.role !== Role.CASINO_USER) {
      return NextResponse.json(
        { success: false, error: "Bu kullanıcıyı düzenleme yetkiniz yok." },
        { status: 403 },
      );
    }
    // ADMIN can only edit CASINO_USER and FNB_USER
    if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(user.role as Role)) {
      return NextResponse.json(
        { success: false, error: "Bu kullanıcıyı düzenleme yetkiniz yok." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    // CASINO_ADMIN can only assign CASINO_USER
    if (
      isCasinoAdmin &&
      parsed.data.role &&
      parsed.data.role !== Role.CASINO_USER
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Casino Admin yalnızca Casino kullanıcısı rolü atayabilir.",
        },
        { status: 403 },
      );
    }
    // ADMIN cannot change role to SYSTEM_ADMIN or ADMIN
    if (
      isAdmin &&
      parsed.data.role &&
      !ADMIN_ALLOWED_ROLES.includes(parsed.data.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin yalnızca Casino ve F&B rolü atayabilir.",
        },
        { status: 403 },
      );
    }

    const { password, ...restData } = parsed.data;
    const updateData: Record<string, unknown> = { ...restData };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    const { password: _pw, ...auditNewValue } = parsed.data;
    after(async () => {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entity: "User",
          entityId: user.id,
          oldValue: {
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          } as Prisma.InputJsonValue,
          newValue: {
            ...auditNewValue,
            ...(password ? { passwordChanged: true } : {}),
          } as Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ["user.update"] },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_ADMIN],
  async (_req, { session, params }) => {
    const id = params!.id;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const isAdmin = session.user.role === Role.ADMIN;
    const isCasinoAdmin = session.user.role === Role.CASINO_ADMIN;

    if (isCasinoAdmin && user.role !== Role.CASINO_USER) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu kullanıcıyı devre dışı bırakma yetkiniz yok.",
        },
        { status: 403 },
      );
    }
    if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(user.role as Role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu kullanıcıyı devre dışı bırakma yetkiniz yok.",
        },
        { status: 403 },
      );
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    after(async () => {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE",
          entity: "User",
          entityId: user.id,
          oldValue: { isActive: user.isActive } as Prisma.InputJsonValue,
          newValue: { isActive: false } as Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: { message: "User deactivated" },
    });
  },
  { requiredPermissions: ["user.delete"] },
);
