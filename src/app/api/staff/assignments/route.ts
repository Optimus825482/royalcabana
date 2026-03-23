import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { parseBody, createStaffAssignmentSchema } from "@/lib/validators";

// GET — Personel atamalarını listele
export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req) => {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;
    const date = searchParams.get("date");
    const cabanaId = searchParams.get("cabanaId");
    const staffId = searchParams.get("staffId");

    const where: Record<string, unknown> = {};
    if (date) where.date = new Date(date);
    if (cabanaId) where.cabanaId = cabanaId;
    if (staffId) where.staffId = staffId;

    const [items, total] = await Promise.all([
      prisma.staffAssignment.findMany({
        where,
        include: {
          staff: { select: { id: true, name: true, position: true } },
          cabana: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.staffAssignment.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { items, total } });
  },
  { requiredPermissions: ["staff.view"] },
);

// POST — Personel ataması oluştur
export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createStaffAssignmentSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    const { staffId, cabanaId, date, shift } = parsed.data;

    // Aynı gün aynı personel aynı Cabana kontrolü
    const existing = await prisma.staffAssignment.findUnique({
      where: {
        staffId_cabanaId_date: {
          staffId,
          cabanaId,
          date: new Date(date),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu personel bu Cabana için bu tarihte zaten atanmış.",
        },
        { status: 409 },
      );
    }

    const item = await prisma.staffAssignment.create({
      data: {
        staffId,
        cabanaId,
        date: new Date(date),
        shift: shift ?? null,
      },
      include: {
        staff: { select: { id: true, name: true, position: true } },
        cabana: { select: { id: true, name: true } },
      },
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "StaffAssignment",
      entityId: item.id,
      newValue: { staffId, cabanaId, date, shift },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  },
  { requiredPermissions: ["staff.create"] },
);
