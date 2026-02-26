import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isSystemAdmin = session.user.role === Role.SYSTEM_ADMIN;
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isSystemAdmin && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

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
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // ADMIN can only edit CASINO_USER and FNB_USER
  if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(user.role as Role)) {
    return NextResponse.json(
      { message: "Bu kullanıcıyı düzenleme yetkiniz yok." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
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
      { message: "Admin yalnızca Casino ve F&B rolü atayabilir." },
      { status: 403 },
    );
  }

  // Build update data, hash password if provided
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

  // Exclude password from audit log
  const { password: _pw, ...auditNewValue } = parsed.data;
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

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isSystemAdmin = session.user.role === Role.SYSTEM_ADMIN;
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isSystemAdmin && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

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
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // ADMIN can only deactivate CASINO_USER and FNB_USER
  if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(user.role as Role)) {
    return NextResponse.json(
      { message: "Bu kullanıcıyı devre dışı bırakma yetkiniz yok." },
      { status: 403 },
    );
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

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

  return NextResponse.json({ message: "User deactivated" });
}
