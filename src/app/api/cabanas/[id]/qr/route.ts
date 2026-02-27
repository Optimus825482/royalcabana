import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export const GET = withAuth(
  [Role.SYSTEM_ADMIN, Role.ADMIN],
  async (req, { params }) => {
    const cabanaId = params?.id;
    if (!cabanaId) {
      return NextResponse.json(
        { error: "Cabana ID gerekli." },
        { status: 400 },
      );
    }

    const cabana = await prisma.cabana.findUnique({
      where: { id: cabanaId },
      select: { id: true, name: true },
    });

    if (!cabana) {
      return NextResponse.json(
        { error: "Kabana bulunamadı." },
        { status: 404 },
      );
    }

    const baseUrl =
      process.env.NEXTAUTH_URL || "https://royalcabana.erkanerdem.net";
    const url = `${baseUrl}/cabana/${cabana.id}`;

    return NextResponse.json({
      url,
      cabanaId: cabana.id,
      cabanaName: cabana.name,
    });
  },
);
