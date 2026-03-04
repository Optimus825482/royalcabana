import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { withAuth } from "@/lib/api-middleware";
import { invalidateCache } from "@/lib/cache";
import { logAudit } from "@/lib/audit";

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { session, params }) => {
    const id = params?.id;
    const attrId = params?.attrId;

    const attribute = await prisma.classAttribute.findFirst({
      where: { id: attrId, classId: id },
    });

    if (!attribute) {
      return NextResponse.json(
        { success: false, error: "Özellik bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.classAttribute.delete({ where: { id: attrId } });

    await invalidateCache("classes:list:v2");

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "ClassAttribute",
      entityId: attrId!,
      oldValue: {
        classId: attribute.classId,
        key: attribute.key,
        value: attribute.value,
      },
    });

    return NextResponse.json({ success: true, data: { message: "Özellik silindi." } });
  },
);
