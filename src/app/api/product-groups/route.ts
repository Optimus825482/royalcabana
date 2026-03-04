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

const createSchema = z.object({
  name: z.string().min(2),
  sortOrder: z.number().int().default(0),
});

export const GET = withAuth(
  allRoles,
  async () => {
    const groups = await cached("product-groups:list:v1", 300, async () => {
      return prisma.productGroup.findMany({
        where: { isDeleted: false },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } },
      });
    });
    return NextResponse.json({ success: true, data: groups });
  },
  { requiredPermissions: ["product.view"] },
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
          error: "Validation error",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const group = await prisma.productGroup.create({ data: parsed.data });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "ProductGroup",
      entityId: group.id,
      newValue: parsed.data,
    });

    await invalidateCache("product-groups:list:v1");

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  },
  { requiredPermissions: ["product.create"] },
);
