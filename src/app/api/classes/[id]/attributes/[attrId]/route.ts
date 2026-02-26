import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { withAuth } from "@/lib/api-middleware";

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (_req, { params }) => {
    const id = params?.id;
    const attrId = params?.attrId;

    const attribute = await prisma.classAttribute.findFirst({
      where: { id: attrId, classId: id },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: "Özellik bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.classAttribute.delete({ where: { id: attrId } });

    return NextResponse.json({ message: "Özellik silindi." });
  },
);
