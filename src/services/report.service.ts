import { prisma } from "@/lib/prisma";
import { ReportType } from "@/types";
import type { ReportFilters } from "@/types";

export interface ReportResult {
  type: ReportType;
  generatedAt: string;
  warnings: string[];
  data: Record<string, unknown>;
}

export class ReportEngine {
  async generate(
    type: ReportType,
    filters: ReportFilters = {},
  ): Promise<ReportResult> {
    switch (type) {
      case ReportType.OCCUPANCY:
        return this.occupancyReport(filters);
      case ReportType.REVENUE:
        return this.revenueReport(filters);
      case ReportType.COST_ANALYSIS:
        return this.costAnalysisReport(filters);
      case ReportType.REQUEST_STATS:
        return this.requestStatsReport(filters);
    }
  }

  private async occupancyReport(filters: ReportFilters): Promise<ReportResult> {
    const warnings: string[] = [];
    const where = this.buildReservationWhere(filters);

    const [cabanas, reservations] = await Promise.all([
      prisma.cabana.findMany({
        include: { cabanaClass: { select: { name: true } } },
      }),
      prisma.reservation.findMany({
        where,
        select: {
          cabanaId: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),
    ]);

    if (reservations.length === 0)
      warnings.push("Eksik veri alanları: rezervasyon");

    const occupancyMap = new Map<string, number>();
    for (const r of reservations as {
      cabanaId: string;
      startDate: Date;
      endDate: Date;
      status: string;
    }[]) {
      if (r.status !== "APPROVED") continue;
      const days = Math.max(
        0,
        Math.floor((r.endDate.getTime() - r.startDate.getTime()) / 86400000),
      );
      occupancyMap.set(r.cabanaId, (occupancyMap.get(r.cabanaId) ?? 0) + days);
    }

    const rows = cabanas.map(
      (c: { id: string; name: string; cabanaClass: { name: string } }) => ({
        cabanaId: c.id,
        cabanaName: c.name,
        className: c.cabanaClass.name,
        reservedDays: occupancyMap.get(c.id) ?? 0,
      }),
    );

    return {
      type: ReportType.OCCUPANCY,
      generatedAt: new Date().toISOString(),
      warnings,
      data: { rows },
    };
  }

  private async revenueReport(filters: ReportFilters): Promise<ReportResult> {
    const warnings: string[] = [];
    const where = this.buildReservationWhere(filters);

    const reservations = await prisma.reservation.findMany({
      where: { ...where, status: "APPROVED" },
      select: {
        id: true,
        totalPrice: true,
        startDate: true,
        cabanaId: true,
        cabana: { select: { name: true } },
      },
    });

    if (reservations.length === 0)
      warnings.push("Eksik veri alanları: onaylı rezervasyon");

    const nullPriceCount = reservations.filter(
      (r: { totalPrice: number | null }) => r.totalPrice == null,
    ).length;
    if (nullPriceCount > 0)
      warnings.push(
        `Eksik veri alanları: ${nullPriceCount} rezervasyonda fiyat bilgisi yok`,
      );

    const totalRevenue = reservations.reduce(
      (s: number, r: { totalPrice: number | null }) => s + (r.totalPrice ?? 0),
      0,
    );
    const byMonth = new Map<string, number>();
    for (const r of reservations as {
      startDate: Date;
      totalPrice: number | null;
    }[]) {
      const key = r.startDate.toISOString().slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + (r.totalPrice ?? 0));
    }

    return {
      type: ReportType.REVENUE,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        totalRevenue,
        byMonth: Object.fromEntries(byMonth),
        reservationCount: reservations.length,
      },
    };
  }

  private async costAnalysisReport(
    filters: ReportFilters,
  ): Promise<ReportResult> {
    const warnings: string[] = [];
    const where = this.buildReservationWhere(filters);

    const extras = await prisma.extraItem.findMany({
      where: { reservation: where },
      include: {
        product: {
          select: { name: true, purchasePrice: true, salePrice: true },
        },
      },
    });

    if (extras.length === 0) warnings.push("Eksik veri alanları: ekstra ürün");

    const totalCost = extras.reduce(
      (
        s: number,
        e: { product: { purchasePrice: number }; quantity: number },
      ) => s + e.product.purchasePrice * e.quantity,
      0,
    );
    const totalSale = extras.reduce(
      (s: number, e: { unitPrice: number; quantity: number }) =>
        s + e.unitPrice * e.quantity,
      0,
    );

    return {
      type: ReportType.COST_ANALYSIS,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        totalCost,
        totalSale,
        margin: totalSale - totalCost,
        itemCount: extras.length,
      },
    };
  }

  private async requestStatsReport(
    filters: ReportFilters,
  ): Promise<ReportResult> {
    const warnings: string[] = [];
    const where = this.buildReservationWhere(filters);

    const [total, approved, rejected, cancelled, modifications, cancellations] =
      await Promise.all([
        prisma.reservation.count({ where }),
        prisma.reservation.count({ where: { ...where, status: "APPROVED" } }),
        prisma.reservation.count({ where: { ...where, status: "REJECTED" } }),
        prisma.reservation.count({ where: { ...where, status: "CANCELLED" } }),
        prisma.modificationRequest.count(),
        prisma.cancellationRequest.count(),
      ]);

    if (total === 0) warnings.push("Eksik veri alanları: rezervasyon");

    return {
      type: ReportType.REQUEST_STATS,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        total,
        approved,
        rejected,
        cancelled,
        pending: total - approved - rejected - cancelled,
        modifications,
        cancellations,
      },
    };
  }

  private buildReservationWhere(filters: ReportFilters) {
    const where: Record<string, unknown> = {};
    if (filters.startDate || filters.endDate) {
      where.startDate = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }
    if (filters.status) where.status = filters.status;
    if (filters.classId) where.cabana = { classId: filters.classId };
    return where;
  }

  async exportPDF(result: ReportResult): Promise<Buffer> {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Royal Cabana — ${result.type}`, 14, 20);
    doc.setFontSize(10);
    doc.text(
      `Oluşturulma: ${new Date(result.generatedAt).toLocaleString("tr-TR")}`,
      14,
      30,
    );

    if (result.warnings.length > 0) {
      doc.setTextColor(200, 100, 0);
      result.warnings.forEach((w, i) => doc.text(`⚠ ${w}`, 14, 40 + i * 8));
      doc.setTextColor(0, 0, 0);
    }

    let y = 40 + result.warnings.length * 8 + 10;
    const lines = JSON.stringify(result.data, null, 2).split("\n");
    doc.setFontSize(9);
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 6;
    }

    return Buffer.from(doc.output("arraybuffer"));
  }

  async exportExcel(result: ReportResult): Promise<Buffer> {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const flatten = (obj: unknown, prefix = ""): Record<string, unknown> => {
      if (typeof obj !== "object" || obj === null) return { [prefix]: obj };
      return Object.entries(obj as Record<string, unknown>).reduce(
        (acc, [k, v]) => {
          const key = prefix ? `${prefix}.${k}` : k;
          return typeof v === "object" && v !== null && !Array.isArray(v)
            ? { ...acc, ...flatten(v, key) }
            : { ...acc, [key]: Array.isArray(v) ? JSON.stringify(v) : v };
        },
        {} as Record<string, unknown>,
      );
    };

    const rows = Array.isArray(result.data.rows)
      ? (result.data.rows as unknown[]).map((r) => flatten(r))
      : [flatten(result.data)];

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, result.type);

    return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  }
}

export const reportEngine = new ReportEngine();
