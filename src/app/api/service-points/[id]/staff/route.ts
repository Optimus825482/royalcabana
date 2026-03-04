import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

const assignSchema = z.object({
  staffId: z.string().min(1, "Personel seçimi zorunlu"),
  role: z.string().min(1, "Rol zorunlu"),
  shift: z.string().optional(),
  date: z.string().min(1, "Tarih zorunlu"),
});

const bulkAssignSchema = z.object({
  assignments: z.array(assignSchema).min(1, "En az bir atama gerekli"),
});

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const assignments = await prisma.servicePointStaff.findMany({
      where: { servicePointId: id },
      include: {
        staff: {
          select: { id: true, name: true, position: true, phone: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: assignments });
  },
  { requiredPermissions: ["system.config.view"] },
);

export const POST = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const sp = await prisma.servicePoint.findFirst({
      where: { id, isDeleted: false },
    });
    if (!sp) {
      return NextResponse.json(
        { success: false, error: "Hizmet noktası bulunamadı" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = bulkAssignSchema.safeParse(body);
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

    const created = await prisma.$transaction(
      parsed.data.assignments.map((a) =>
        prisma.servicePointStaff.upsert({
          where: {
            servicePointId_staffId_date_role: {
              servicePointId: id,
              staffId: a.staffId,
              date: new Date(a.date),
              role: a.role,
            },
          },
          update: { shift: a.shift ?? null },
          create: {
            servicePointId: id,
            staffId: a.staffId,
            role: a.role,
            shift: a.shift ?? null,
            date: new Date(a.date),
          },
        }),
      ),
    );

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "ServicePointStaff",
      entityId: id,
      newValue: { count: created.length },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
  { requiredPermissions: ["system.config.update"] },
);

export const DELETE = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID gerekli" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: "assignmentId gerekli" },
        { status: 400 },
      );
    }

    const existing = await prisma.servicePointStaff.findUnique({
      where: { id: assignmentId },
    });
    if (!existing || existing.servicePointId !== id) {
      return NextResponse.json(
        { success: false, error: "Atama bulunamadı" },
        { status: 404 },
      );
    }

    await prisma.servicePointStaff.delete({ where: { id: assignmentId } });

    logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "ServicePointStaff",
      entityId: assignmentId,
      oldValue: { staffId: existing.staffId, role: existing.role },
    });

    return NextResponse.json({ success: true, data: { id: assignmentId } });
  },
  { requiredPermissions: ["system.config.update"] },
);
