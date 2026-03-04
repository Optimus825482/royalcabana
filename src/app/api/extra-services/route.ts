import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1, "İsim zorunlu"),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0).optional(),
});

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req) => {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const services = await prisma.extraService.findMany({
      where: {
        isDeleted: false,
        ...(activeOnly ? { isActive: true } : {}),
        ...(category ? { category } : {}),
      },
      include: {
        prices: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: services });
  },
  { requiredPermissions: ["system.config.view"] },
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

    const { name, description, category, price } = parsed.data;

    const existing = await prisma.extraService.findFirst({
      where: { name, isDeleted: false },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu isimde bir ekstra hizmet zaten mevcut." },
        { status: 409 },
      );
    }

    const service = await prisma.extraService.create({
      data: {
        name,
        description: description ?? null,
        category: category ?? null,
        ...(price !== undefined && price !== null
          ? {
              prices: {
                create: {
                  price,
                  changedBy: session.user.id,
                },
              },
            }
          : {}),
      },
      include: {
        prices: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "ExtraService",
      entityId: service.id,
      newValue: { name, category, price },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  },
  { requiredPermissions: ["system.config.create"] },
);
