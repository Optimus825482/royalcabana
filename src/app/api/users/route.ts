import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    "Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir.",
  );

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: passwordSchema,
  role: z.nativeEnum(Role),
});

const ADMIN_ALLOWED_ROLES = [Role.CASINO_USER, Role.FNB_USER];
const CASINO_ADMIN_ALLOWED_ROLES = [Role.CASINO_USER];

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_ADMIN],
  async (req, { session }) => {
    const isAdmin = session.user.role === Role.ADMIN;
    const isCasinoAdmin = session.user.role === Role.CASINO_ADMIN;
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role") as Role | null;

    let whereClause: { role?: Role | { in: Role[] } } = {};
    if (isCasinoAdmin) {
      whereClause = {
        role:
          roleFilter === Role.CASINO_USER
            ? Role.CASINO_USER
            : { in: CASINO_ADMIN_ALLOWED_ROLES },
      };
    } else if (isAdmin) {
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
      where: { ...whereClause, deletedAt: null },
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
    return NextResponse.json({ success: true, data: users });
  },
  { requiredPermissions: ["user.view"] },
);

export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_ADMIN],
  async (req, { session }) => {
    const isAdmin = session.user.role === Role.ADMIN;
    const isCasinoAdmin = session.user.role === Role.CASINO_ADMIN;

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
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

    const { username, email, password, role } = parsed.data;

    // CASINO_ADMIN can only create CASINO_USER
    if (isCasinoAdmin && role !== Role.CASINO_USER) {
      return NextResponse.json(
        {
          success: false,
          error: "Casino Admin yalnızca Casino kullanıcısı oluşturabilir.",
        },
        { status: 403 },
      );
    }
    // ADMIN can only create CASINO_USER and FNB_USER
    if (isAdmin && !ADMIN_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin yalnızca Casino ve F&B kullanıcısı oluşturabilir.",
        },
        { status: 403 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }], deletedAt: null },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Username or email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { username, email, passwordHash, role, createdBy: session.user.id },
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

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      newValue: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  },
  { requiredPermissions: ["user.create"] },
);
