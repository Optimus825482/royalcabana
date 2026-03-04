import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { reportEngine } from "@/services/report.service";
import { Role, ReportType, ReportGroupBy } from "@/types";

const querySchema = z.object({
  type: z.nativeEnum(ReportType),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  classId: z.string().optional(),
  conceptId: z.string().optional(),
  groupBy: z.nativeEnum(ReportGroupBy).optional(),
});

const postSchema = z.object({
  type: z.nativeEnum(ReportType),
  format: z.enum(["pdf", "excel", "csv"]).optional(),
  filters: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      classId: z.string().optional(),
      conceptId: z.string().optional(),
      groupBy: z.nativeEnum(ReportGroupBy).optional(),
    })
    .optional(),
});

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req: NextRequest) => {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz parametreler",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { type, startDate, endDate, classId, conceptId, groupBy } =
      parsed.data;
    const result = await reportEngine.generate(type, {
      startDate,
      endDate,
      classId,
      conceptId,
      groupBy,
    });

    return NextResponse.json({ success: true, data: result });
  },
  { requiredPermissions: ["report.view"] },
);

export const POST = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req) => {
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation error" },
        { status: 400 },
      );
    }

    const { type, format, filters } = parsed.data;
    const result = await reportEngine.generate(type, filters ?? {});

    if (format === "csv") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = result.data as any;
      let rows: Record<string, unknown>[] | undefined;

      if (Array.isArray(d.breakdown) && d.breakdown.length > 0) {
        rows = d.breakdown;
      } else if (Array.isArray(d.topCabanas) && d.topCabanas.length > 0) {
        rows = d.topCabanas;
      } else if (Array.isArray(d.topGuests) && d.topGuests.length > 0) {
        rows = d.topGuests;
      } else if (
        Array.isArray(d.vipDistribution) &&
        d.vipDistribution.length > 0
      ) {
        rows = d.vipDistribution;
      } else if (Array.isArray(d.topConcepts) && d.topConcepts.length > 0) {
        rows = d.topConcepts;
      } else if (d.summary && typeof d.summary === "object") {
        rows = [d.summary];
      }

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Dışa aktarılacak veri bulunamadı." },
          { status: 404 },
        );
      }
      const headers = Object.keys(rows[0]);
      const csvRows = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
        ),
      ];
      const csvContent = csvRows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="report-${type.toLowerCase()}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = await reportEngine.exportPDF(result);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${type.toLowerCase()}.pdf"`,
        },
      });
    }

    if (format === "excel") {
      const buffer = await reportEngine.exportExcel(result);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="report-${type.toLowerCase()}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  },
  { requiredPermissions: ["report.view"] },
);
