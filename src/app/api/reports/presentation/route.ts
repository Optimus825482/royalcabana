import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { presentationEngine } from "@/services/presentation.service";
import { Role } from "@/types";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
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
