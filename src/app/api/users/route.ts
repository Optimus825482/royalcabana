import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
});

// Roles that ADMIN can manage
const ADMIN_ALLOWED_ROLES = [Role.CASINO_USER, Role.FNB_USER];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isSystemAdmin = session.user.role === Role.SYSTEM_ADMIN;
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isSystemAdmin && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role") as Role | null;

  // ADMIN can only see CASINO_USER and FNB_USER
  let whereClause: { role?: Role | { in: Role[] } } = {};
  if (isAdmin) {
    whereClause = {
      role:
        roleFilter && ADMIN_ALLOWED_ROLES.includes(roleFilter)
          ? roleFilter
          : { in: ADMIN_ALLOWED_ROLES },
    };
  } else if (roleFilter) {
    whereClause = { role: roleFilter };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isSystemAdmin = session.user.role === Role.SYSTEM_ADMIN;
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isSystemAdmin && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { username, email, password, role } = parsed.data;

  // ADMIN can only create CASINO_USER and FNB_USER
  if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { message: "Admin yalnızca Casino ve F&B kullanıcısı oluşturabilir." },
      { status: 403 },
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Username or email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role,
      createdBy: session.user.id,
    },
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

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      oldValue: null,
      newValue: { username: user.username, email: user.email, role: user.role },
    },
  });

  return NextResponse.json(user, { status: 201 });
}
