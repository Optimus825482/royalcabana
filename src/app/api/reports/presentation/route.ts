import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { presentationEngine } from "@/services/presentation.service";
import { htmlPresentationEngine } from "@/services/html-presentation.service";
import { Role } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // format=html → HTML sunum, varsayılan → PPTX
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  try {
    if (format === "html") {
      const html = await htmlPresentationEngine.generate();
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="royal-cabana-sunum.html"',
        },
      });
    }

    // PPTX (default)
    const buffer = await presentationEngine.generate();
    return new NextResponse(buffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="royal-cabana-sunum.pptx"',
      },
    });
  } catch (error) {
    console.error("Presentation generation error:", error);
    return NextResponse.json(
      { message: "Presentation generation failed" },
      { status: 500 },
    );
  }
}
