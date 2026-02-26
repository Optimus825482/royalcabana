import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role } from "@/types";

const locationSchema = z.object({
  coordX: z.number(),
  coordY: z.number(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cabana = await prisma.cabana.findUnique({ where: { id: params.id } });
  if (!cabana) {
    return NextResponse.json({ error: "Kabana bulunamadı." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = locationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.cabana.update({
    where: { id: params.id },
    data: { coordX: parsed.data.coordX, coordY: parsed.data.coordY },
    select: { id: true, name: true, coordX: true, coordY: true },
  });

  return NextResponse.json(updated);
}
