import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1, "İsim zorunlu"),
  description: z.string().optional(),
  type: z.string().min(1, "Tip zorunlu"),
  coordX: z.number().optional(),
  coordY: z.number().optional(),
  rotation: z.number().optional(),
  scale: z.number().optional(),
  isLocked: z.boolean().optional(),
  requiredStaffCount: z.number().int().min(0).optional(),
  staffRoles: z.array(z.string()).optional(),
});

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async (req) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const lightweight = searchParams.get("lightweight") === "true";

    const servicePoints = await prisma.servicePoint.findMany({
      where: {
        isDeleted: false,
        ...(activeOnly ? { isActive: true } : {}),
        ...(type ? { type } : {}),
      },
      ...(!lightweight && {
        include: {
          staffAssignments: {
            include: {
              staff: { select: { id: true, name: true, position: true } },
            },
            orderBy: { date: "desc" as const },
          },
        },
      }),
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: servicePoints });
  },
);

export const POST = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Doğrulama hatası",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      name,
      description,
      type,
      coordX,
      coordY,
      rotation,
      scale,
      isLocked,
      requiredStaffCount,
      staffRoles,
    } = parsed.data;

    const existing = await prisma.servicePoint.findFirst({
      where: { name, isDeleted: false },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu isimde bir hizmet noktası zaten mevcut." },
        { status: 409 },
      );
    }

    const servicePoint = await prisma.servicePoint.create({
      data: {
        name,
        description: description ?? null,
        type,
        coordX: coordX ?? null,
        coordY: coordY ?? null,
        rotation: rotation ?? 0,
        scale: scale ?? 1,
        isLocked: isLocked ?? false,
        requiredStaffCount: requiredStaffCount ?? 0,
        staffRoles: staffRoles ?? undefined,
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "ServicePoint",
      entityId: servicePoint.id,
      newValue: { name, type },
    });

    return NextResponse.json(
      { success: true, data: servicePoint },
      { status: 201 },
    );
  },
  { requiredPermissions: ["system.config.create"] },
);
