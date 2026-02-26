import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { reportEngine } from "@/services/report.service";
import { Role, ReportType, ReservationStatus } from "@/types";

const generateSchema = z.object({
  type: z.nativeEnum(ReportType),
  format: z.enum(["pdf", "excel"]).optional(),
  filters: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      classId: z.string().optional(),
      conceptId: z.string().optional(),
      status: z.nativeEnum(ReservationStatus).optional(),
    })
    .optional(),
});

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req) => {
  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { type, format, filters } = parsed.data;
  const result = await reportEngine.generate(type, filters ?? {});

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

  return NextResponse.json(result);
});
