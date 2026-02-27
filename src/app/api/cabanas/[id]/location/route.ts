import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { withAuth } from "@/lib/api-middleware";

const locationSchema = z.object({
  coordX: z.number(),
  coordY: z.number(),
  rotation: z.number().optional(),
});

export const PATCH = withAuth([Role.SYSTEM_ADMIN], async (req, { params }) => {
  const id = params?.id;

  const body = await req.json();
  const parsed = locationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data: Record<string, number> = {
      coordX: parsed.data.coordX,
      coordY: parsed.data.coordY,
    };
    if (parsed.data.rotation !== undefined) {
      data.rotation = parsed.data.rotation;
    }
    const updated = await prisma.cabana.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        coordX: true,
        coordY: true,
        rotation: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Kabana bulunamadı." }, { status: 404 });
  }
});
