import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { parseBody } from "@/lib/validators";

const bulkAssignmentSchema = z.object({
  staffId: z.string().min(1, "Personel seçimi zorunludur."),
  targetId: z.string().min(1, "Görev noktası seçimi zorunludur."),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur."),
  endDate: z.string().min(1, "Bitiş tarihi zorunludur."),
  shift: z.string().optional().nullable(),
});

function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

// POST — Tarih aralığında toplu atama oluştur (cabana veya hizmet noktası)
export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(bulkAssignmentSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    const { staffId, targetId, startDate, endDate, shift } = parsed.data;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json(
        { success: false, error: "Geçersiz tarih aralığı." },
        { status: 400 },
      );
    }

    const dates = generateDateRange(start, end);

    if (dates.length > 90) {
      return NextResponse.json(
        { success: false, error: "En fazla 90 günlük atama yapılabilir." },
        { status: 400 },
      );
    }

    // Parallel lookup: cabana + service point + staff aynı anda
    const db = prisma;
    const [cabana, sp, staff] = await Promise.all([
      db.cabana.findUnique({ where: { id: targetId }, select: { id: true } }),
      db.servicePoint.findUnique({
        where: { id: targetId },
        select: { id: true, name: true },
      }),
      db.staff.findUnique({
        where: { id: staffId },
        select: { position: true },
      }),
    ]);

    if (cabana) {
      // ── Cabana assignment (StaffAssignment table) ──
      const existing = await db.staffAssignment.findMany({
        where: { staffId, cabanaId: targetId, date: { in: dates } },
        select: { date: true },
      });

      const existingSet = new Set(
        existing.map((e: { date: Date }) => e.date.toISOString().split("T")[0]),
      );
      const newDates = dates.filter(
        (d) => !existingSet.has(d.toISOString().split("T")[0]),
      );

      if (newDates.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Seçilen tarih aralığında tüm günler zaten atanmış.",
          },
          { status: 409 },
        );
      }

      const created = await db.staffAssignment.createMany({
        data: newDates.map((d) => ({
          staffId,
          cabanaId: targetId,
          date: d,
          shift: shift ?? null,
        })),
      });

      logAudit({
        userId: session.user.id,
        action: "CREATE",
        entity: "StaffAssignment",
        entityId: `bulk-${staffId}`,
        newValue: {
          staffId,
          cabanaId: targetId,
          startDate,
          endDate,
          shift,
          count: created.count,
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            created: created.count,
            skipped: existingSet.size,
            total: dates.length,
          },
        },
        { status: 201 },
      );
    }

    // ── Service point assignment (ServicePointStaff table) ──
    if (!sp) {
      return NextResponse.json(
        { success: false, error: "Seçilen görev noktası bulunamadı." },
        { status: 404 },
      );
    }

    const role = staff?.position || "Personel";

    const existingSP = await db.servicePointStaff.findMany({
      where: { servicePointId: targetId, staffId, date: { in: dates }, role },
      select: { date: true },
    });

    const existingSPSet = new Set(
      existingSP.map((e: { date: Date }) => e.date.toISOString().split("T")[0]),
    );
    const newSPDates = dates.filter(
      (d) => !existingSPSet.has(d.toISOString().split("T")[0]),
    );

    if (newSPDates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Seçilen tarih aralığında tüm günler zaten atanmış.",
        },
        { status: 409 },
      );
    }

    const createdSP = await db.servicePointStaff.createMany({
      data: newSPDates.map((d) => ({
        servicePointId: targetId,
        staffId,
        role,
        shift: shift ?? null,
        date: d,
      })),
    });

    logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "ServicePointStaff",
      entityId: `bulk-${staffId}`,
      newValue: {
        staffId,
        servicePointId: targetId,
        startDate,
        endDate,
        shift,
        count: createdSP.count,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          created: createdSP.count,
          skipped: existingSPSet.size,
          total: dates.length,
        },
      },
      { status: 201 },
    );
  },
  { requiredPermissions: ["staff.create"] },
);
