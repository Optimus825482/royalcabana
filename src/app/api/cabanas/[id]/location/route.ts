import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { withAuth } from "@/lib/api-middleware";

const locationSchema = z.object({
  coordX: z.number(),
  coordY: z.number(),
  rotation: z.number().optional(),
  scaleX: z.number().min(0.1).max(5).optional(),
  scaleY: z.number().min(0.1).max(5).optional(),
  color: z.string().optional(),
  isLocked: z.boolean().optional(),
});

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { params }) => {
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
      const data: Record<string, number | string | boolean> = {
        coordX: parsed.data.coordX,
        coordY: parsed.data.coordY,
      };
      if (parsed.data.rotation !== undefined) {
        data.rotation = parsed.data.rotation;
      }
      if (parsed.data.scaleX !== undefined) {
        data.scaleX = parsed.data.scaleX;
      }
      if (parsed.data.scaleY !== undefined) {
        data.scaleY = parsed.data.scaleY;
      }
      if (parsed.data.color !== undefined) {
        data.color = parsed.data.color;
      }
      if (parsed.data.isLocked !== undefined) {
        data.isLocked = parsed.data.isLocked;
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
          scaleX: true,
          scaleY: true,
          color: true,
          isLocked: true,
        },
      });
      return NextResponse.json(updated);
    } catch {
      return NextResponse.json(
        { error: "Kabana bulunamadı." },
        { status: 404 },
      );
    }
  },
  { requiredPermissions: ["map.update"] },
);
