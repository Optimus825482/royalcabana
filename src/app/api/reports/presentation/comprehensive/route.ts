import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { comprehensivePresentationEngine } from "@/services/comprehensive-presentation.service";

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "html";

    try {
      if (format === "html") {
        const html = await comprehensivePresentationEngine.generateHtml();
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        });
      }

      if (format === "pptx") {
        const buffer = await comprehensivePresentationEngine.generatePptx();
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "Content-Disposition": 'attachment; filename="Royal-Cabana-Sistem-Sunumu.pptx"',
          },
        });
      }

      if (format === "pdf") {
        const buffer = await comprehensivePresentationEngine.generatePdf();
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="Royal-Cabana-Sistem-Sunumu.pdf"',
          },
        });
      }

      return NextResponse.json(
        { success: false, error: `Desteklenmeyen format: ${format}. Geçerli: html, pptx, pdf` },
        { status: 400 },
      );
    } catch (error) {
      console.error("[Comprehensive Presentation] Export hatası:", error);
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      return NextResponse.json(
        { success: false, error: `Sunum oluşturulurken hata oluştu: ${message}` },
        { status: 500 },
      );
    }
  },
  { requiredPermissions: ["report.view"] },
);
