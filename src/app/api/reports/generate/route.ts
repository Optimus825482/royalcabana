import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { type, format, filters } = parsed.data;

  try {
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
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { message: "Report generation failed" },
      { status: 500 },
    );
  }
}
