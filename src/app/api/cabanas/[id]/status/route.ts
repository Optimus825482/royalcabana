import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role, CabanaStatus } from "@/types";
import { withAuth } from "@/lib/api-middleware";

const statusSchema = z.object({
  status: z.nativeEnum(CabanaStatus),
});

export const PATCH = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
  const id = params?.id;

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.cabana.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, name: true, status: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Kabana bulunamadı." }, { status: 404 });
  }
});
