import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { Prisma } from "@prisma/client";

const ADMIN_ALLOWED_ROLES = [Role.CASINO_USER, Role.FNB_USER];

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === Role.ADMIN;

    // ADMIN can only edit CASINO_USER and FNB_USER
    if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(user.role as Role)) {
      return NextResponse.json(
        { error: "Bu kullanıcıyı düzenleme yetkiniz yok." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // ADMIN cannot change role to SYSTEM_ADMIN or ADMIN
    if (
      isAdmin &&
      parsed.data.role &&
      !ADMIN_ALLOWED_ROLES.includes(parsed.data.role)
    ) {
      return NextResponse.json(
        { error: "Admin yalnızca Casino ve F&B rolü atayabilir." },
        { status: 403 },
      );
    }

    const { password, ...restData } = parsed.data;
    const updateData: Record<string, unknown> = { ...restData };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
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

    return NextResponse.json(updated);
  },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === Role.ADMIN;

    if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(user.role as Role)) {
      return NextResponse.json(
        { error: "Bu kullanıcıyı devre dışı bırakma yetkiniz yok." },
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

    return NextResponse.json({ message: "User deactivated" });
  },
);
