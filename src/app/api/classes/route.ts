import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { cached, invalidateCache } from "@/lib/cache";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

const createClassSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  attributes: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional(),
});

export const GET = withAuth(
  allRoles,
  async () => {
    const classes = await cached("classes:list:v2", 300, async () => {
      return prisma.cabanaClass.findMany({
        where: { isDeleted: false },
        include: {
          attributes: true,
          _count: { select: { cabanas: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    });
    return NextResponse.json({ success: true, data: classes });
  },
  { requiredPermissions: ["cabana.class.view"] },
);

export const POST = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = createClassSchema.safeParse(body);
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

    const { name, description, attributes } = parsed.data;

    const existing = await prisma.cabanaClass.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu isimde bir sınıf zaten mevcut." },
        { status: 409 },
      );
    }

    const cabanaClass = await prisma.cabanaClass.create({
      data: {
        name,
        description,
        attributes: attributes?.length ? { create: attributes } : undefined,
      },
      include: {
        attributes: true,
        _count: { select: { cabanas: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "CabanaClass",
      entityId: cabanaClass.id,
      newValue: { name, description },
    });

    await invalidateCache("classes:list:v2");

    return NextResponse.json(
      { success: true, data: cabanaClass },
      { status: 201 },
    );
  },
  { requiredPermissions: ["cabana.class.create"] },
);
