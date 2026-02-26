import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export const GET = withAuth([Role.SYSTEM_ADMIN], async () => {
  const [cabanas, classes, concepts] = await Promise.all([
    prisma.cabana.findMany({
      include: {
        cabanaClass: true,
        concept: true,
        prices: { orderBy: { date: "asc" }, take: 7 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.cabanaClass.findMany({
      include: { attributes: true },
      orderBy: { name: "asc" },
    }),
    prisma.concept.findMany({
      include: { products: { include: { product: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const statusMap: Record<string, string> = {
    AVAILABLE: "Müsait",
    RESERVED: "Rezerveli",
    CLOSED: "Kapalı",
  };

  return NextResponse.json({
    cabanas: cabanas.map((c) => ({
      name: c.name,
      className: c.cabanaClass.name,
      conceptName: c.concept?.name ?? "—",
      status: c.status,
      statusLabel: statusMap[c.status] ?? c.status,
    })),
    classes: classes.map((cls) => ({
      name: cls.name,
      description: cls.description,
      cabanaCount: cabanas.filter((c) => c.classId === cls.id).length,
      attributes: cls.attributes.map((a) => ({ key: a.key, value: a.value })),
    })),
    concepts: concepts.map((con) => ({
      name: con.name,
      description: con.description,
      products: con.products.map((cp) => ({
        name: cp.product.name,
        salePrice: Number(cp.product.salePrice),
        group: "Genel",
      })),
    })),
    prices: cabanas.flatMap((c) =>
      c.prices.map((p) => ({
        cabanaName: c.name,
        className: c.cabanaClass.name,
        date: new Date(p.date).toLocaleDateString("tr-TR"),
        dailyPrice: Number(p.dailyPrice),
      })),
    ),
    stats: {
      totalCabanas: cabanas.length,
      totalClasses: classes.length,
      totalConcepts: concepts.length,
      available: cabanas.filter((c) => c.status === "AVAILABLE").length,
      reserved: cabanas.filter((c) => c.status === "RESERVED").length,
      closed: cabanas.filter((c) => c.status === "CLOSED").length,
    },
  });
});
