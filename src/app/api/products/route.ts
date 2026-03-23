import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { createProductSchema, parseBody } from "@/lib/validators";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const GET = withAuth(
  allRoles,
  async (req) => {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    const products = await prisma.product.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ group: { sortOrder: "asc" } }, { name: "asc" }],
      include: { group: true },
    });

    return NextResponse.json({ success: true, data: products });
  },
  { requiredPermissions: ["product.view"] },
);

export const POST = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createProductSchema, body);
    if (!parsed.success)
      return NextResponse.json(
        {
          success: false,
          error: parsed.error,
        },
        { status: 400 },
      );

    const product = await prisma.product.create({
      data: parsed.data,
      include: { group: true },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      newValue: parsed.data,
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  },
  { requiredPermissions: ["product.create"] },
);
