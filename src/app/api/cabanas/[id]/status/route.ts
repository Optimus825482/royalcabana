import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Role, CabanaStatus } from "@/types";

const statusSchema = z.object({
  status: z.nativeEnum(CabanaStatus),
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
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.cabana.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
    select: { id: true, name: true, status: true },
  });

  return NextResponse.json(updated);
}
