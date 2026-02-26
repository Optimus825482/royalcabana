import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attrId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id, attrId } = await params;

  const attribute = await prisma.classAttribute.findFirst({
    where: { id: attrId, classId: id },
  });

  if (!attribute) {
    return NextResponse.json(
      { message: "Özellik bulunamadı." },
      { status: 404 },
    );
  }

  await prisma.classAttribute.delete({ where: { id: attrId } });

  return NextResponse.json({ message: "Özellik silindi." });
}
