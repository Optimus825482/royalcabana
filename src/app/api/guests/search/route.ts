import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

/**
 * GET /api/guests/search?q=name
 * Fast autocomplete search for guest names. Returns minimal data.
 */
export const GET = withAuth(
  [Role.CASINO_USER, Role.FNB_USER, Role.ADMIN, Role.SYSTEM_ADMIN],
  async (req) => {
    const q = new URL(req.url).searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const guests = await prisma.guest.findMany({
      where: {
        deletedAt: null,
        isBlacklisted: false,
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        vipLevel: true,
        totalVisits: true,
        lastVisitAt: true,
      },
      orderBy: { totalVisits: "desc" },
      take: 8,
    });

    return NextResponse.json({ success: true, data: guests });
  },
);
