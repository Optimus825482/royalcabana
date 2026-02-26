import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { presentationEngine } from "@/services/presentation.service";
import { htmlPresentationEngine } from "@/services/html-presentation.service";
import { Role } from "@/types";

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req) => {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  if (format === "html") {
    const html = await htmlPresentationEngine.generate();
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": 'attachment; filename="royal-cabana-sunum.html"',
      },
    });
  }

  const buffer = await presentationEngine.generate();
  return new NextResponse(buffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": 'attachment; filename="royal-cabana-sunum.pptx"',
    },
  });
});
