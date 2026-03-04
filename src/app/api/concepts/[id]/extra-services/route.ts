import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { invalidateCache } from "@/lib/cache";
import { PricingEngine } from "@/lib/pricing";

const addSchema = z.object({
  extraServiceId: z.string().min(1),
  quantity: z.number().int().positive().optional(),
});

const removeSchema = z.object({
  extraServiceId: z.string().min(1),
});

const updateQtySchema = z.object({
  extraServiceId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const POST = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { params }) => {
    const id = params!.id;
    const concept = await prisma.concept.findUnique({ where: { id } });
    if (!concept) {
      return NextResponse.json(
        { success: false, error: "Konsept bulunamadı." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Doğrulama hatası",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { extraServiceId, quantity = 1 } = parsed.data;

    const existing = await prisma.conceptExtraService.findUnique({
      where: { conceptId_extraServiceId: { conceptId: id, extraServiceId } },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu hizmet zaten konsepte eklenmiş." },
        { status: 409 },
      );
    }

    const entry = await prisma.conceptExtraService.create({
      data: { conceptId: id, extraServiceId, quantity },
      include: {
        extraService: {
          include: { prices: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
        },
      },
    });

    await invalidateCache("concepts:list:v1");
    after(async () => {
      const engine = new PricingEngine();
      await engine.recalculateReservationsByConceptId(id);
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  },
  { requiredPermissions: ["concept.update"] },
);

export const PATCH = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { params }) => {
    const id = params!.id;
    const body = await req.json();
    const parsed = updateQtySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Doğrulama hatası",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { extraServiceId, quantity } = parsed.data;
    const entry = await prisma.conceptExtraService.findUnique({
      where: { conceptId_extraServiceId: { conceptId: id, extraServiceId } },
    });
    if (!entry) {
      return NextResponse.json(
        { success: false, error: "Bu hizmet konsepte eklenmemiş." },
        { status: 404 },
      );
    }

    const updated = await prisma.conceptExtraService.update({
      where: { id: entry.id },
      data: { quantity },
      include: {
        extraService: {
          include: { prices: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
        },
      },
    });

    await invalidateCache("concepts:list:v1");
    after(async () => {
      const engine = new PricingEngine();
      await engine.recalculateReservationsByConceptId(id);
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ["concept.update"] },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { params }) => {
    const id = params!.id;
    const body = await req.json();
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Doğrulama hatası",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { extraServiceId } = parsed.data;
    const entry = await prisma.conceptExtraService.findUnique({
      where: { conceptId_extraServiceId: { conceptId: id, extraServiceId } },
    });
    if (!entry) {
      return NextResponse.json(
        { success: false, error: "Bu hizmet konsepte eklenmemiş." },
        { status: 404 },
      );
    }

    await prisma.conceptExtraService.delete({
      where: { id: entry.id },
    });
    await invalidateCache("concepts:list:v1");
    after(async () => {
      const engine = new PricingEngine();
      await engine.recalculateReservationsByConceptId(id);
    });
    return NextResponse.json({
      success: true,
      data: { message: "Hizmet konseptten kaldırıldı." },
    });
  },
  { requiredPermissions: ["concept.update"] },
);
