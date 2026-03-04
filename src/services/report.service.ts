import { prisma } from "@/lib/prisma";
import { DatabaseError } from "@/lib/errors";
import { ReportType, ReportGroupBy } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SmartReportFilters {
  startDate?: Date;
  endDate?: Date;
  classId?: string;
  conceptId?: string;
  groupBy?: ReportGroupBy;
}

export interface ReportResult {
  type: ReportType;
  generatedAt: string;
  warnings: string[];
  data: Record<string, unknown>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function dateDiffDays(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

function periodKey(date: Date, groupBy: ReportGroupBy): string {
  const iso = date.toISOString();
  switch (groupBy) {
    case ReportGroupBy.DAILY:
      return iso.slice(0, 10);
    case ReportGroupBy.WEEKLY: {
      const d = new Date(date);
      const day = d.getDay();
      d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      return `${d.toISOString().slice(0, 10)}`;
    }
    case ReportGroupBy.MONTHLY:
      return iso.slice(0, 7);
  }
}

function clampDate(d: Date, start?: Date, end?: Date): Date {
  if (start && d < start) return start;
  if (end && d > end) return end;
  return d;
}

// ─── Engine ────────────────────────────────────────────────────────────────────

export class ReportEngine {
  async generate(
    type: ReportType,
    filters: SmartReportFilters = {},
  ): Promise<ReportResult> {
    try {
      switch (type) {
        case ReportType.OCCUPANCY:
          return await this.occupancyReport(filters);
        case ReportType.REVENUE:
          return await this.revenueReport(filters);
        case ReportType.PERFORMANCE:
          return await this.performanceReport(filters);
        case ReportType.FNB:
          return await this.fnbReport(filters);
        case ReportType.GUEST:
          return await this.guestReport(filters);
        case ReportType.COST_ANALYSIS:
          return await this.costAnalysisReport(filters);
        case ReportType.REQUEST_STATS:
          return await this.requestStatsReport(filters);
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Rapor oluşturulamadı: ${type}`, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ── Occupancy ──────────────────────────────────────────────────────────────

  private async occupancyReport(
    filters: SmartReportFilters,
  ): Promise<ReportResult> {
    const warnings: string[] = [];
    const groupBy = filters.groupBy ?? ReportGroupBy.MONTHLY;
    const where = this.buildReservationWhere(filters);

    const [cabanas, reservations] = await Promise.all([
      prisma.cabana.findMany({
        where: filters.classId ? { classId: filters.classId } : undefined,
        include: { cabanaClass: { select: { id: true, name: true } } },
      }),
      prisma.reservation.findMany({
        where: {
          ...where,
          status: { in: ["APPROVED", "CHECKED_IN", "CHECKED_OUT"] },
        },
        select: {
          cabanaId: true,
          startDate: true,
          endDate: true,
          totalPrice: true,
          cabana: { select: { classId: true } },
        },
      }),
    ]);

    if (reservations.length === 0) {
      warnings.push("Bu dönemde onaylı rezervasyon bulunamadı.");
    }

    const totalCabanas = cabanas.length;
    const periodStart = filters.startDate ?? new Date("2024-01-01");
    const periodEnd = filters.endDate ?? new Date();
    const totalPeriodDays = dateDiffDays(periodStart, periodEnd);

    const periodBuckets = new Map<
      string,
      { reservations: number; reservedDays: number; revenue: number }
    >();
    const classBuckets = new Map<
      string,
      { className: string; reservedDays: number; totalDays: number }
    >();

    for (const cab of cabanas) {
      const cls = cab.cabanaClass;
      if (!classBuckets.has(cls.id)) {
        classBuckets.set(cls.id, {
          className: cls.name,
          reservedDays: 0,
          totalDays: 0,
        });
      }
      classBuckets.get(cls.id)!.totalDays += totalPeriodDays;
    }

    let totalReservedDays = 0;
    let totalRevenue = 0;

    for (const r of reservations) {
      const rStart = clampDate(r.startDate, filters.startDate, filters.endDate);
      const rEnd = clampDate(r.endDate, filters.startDate, filters.endDate);
      const days = dateDiffDays(rStart, rEnd);
      const rev = Number(r.totalPrice ?? 0);

      totalReservedDays += days;
      totalRevenue += rev;

      const pk = periodKey(rStart, groupBy);
      const bucket = periodBuckets.get(pk) ?? {
        reservations: 0,
        reservedDays: 0,
        revenue: 0,
      };
      bucket.reservations += 1;
      bucket.reservedDays += days;
      bucket.revenue += rev;
      periodBuckets.set(pk, bucket);

      const classId = r.cabana?.classId;
      if (classId && classBuckets.has(classId)) {
        classBuckets.get(classId)!.reservedDays += days;
      }
    }

    const totalCapacityDays = totalCabanas * totalPeriodDays;
    const avgOccupancy =
      totalCapacityDays > 0
        ? Math.round((totalReservedDays / totalCapacityDays) * 10000) / 100
        : 0;

    const breakdown = Array.from(periodBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, b]) => ({
        period,
        occupancy:
          totalCapacityDays > 0
            ? Math.round(
                (b.reservedDays /
                  (totalCabanas * (totalPeriodDays / periodBuckets.size))) *
                  10000,
              ) / 100
            : 0,
        reservations: b.reservations,
        revenue: Math.round(b.revenue * 100) / 100,
      }));

    const byClass = Array.from(classBuckets.entries()).map(([, v]) => ({
      class: v.className,
      occupancy:
        v.totalDays > 0
          ? Math.round((v.reservedDays / v.totalDays) * 10000) / 100
          : 0,
    }));

    return {
      type: ReportType.OCCUPANCY,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        summary: {
          averageOccupancy: avgOccupancy,
          totalReservationDays: totalReservedDays,
          totalCabanas,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
        },
        period: {
          start: periodStart.toISOString().slice(0, 10),
          end: periodEnd.toISOString().slice(0, 10),
        },
        breakdown,
        byClass,
      },
    };
  }

  // ── Revenue ────────────────────────────────────────────────────────────────

  private async revenueReport(
    filters: SmartReportFilters,
  ): Promise<ReportResult> {
    const warnings: string[] = [];
    const groupBy = filters.groupBy ?? ReportGroupBy.MONTHLY;
    const where = this.buildReservationWhere(filters);

    const [reservations, fnbItems, extraItems] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          ...where,
          status: { in: ["APPROVED", "CHECKED_IN", "CHECKED_OUT"] },
        },
        select: {
          id: true,
          totalPrice: true,
          startDate: true,
          conceptId: true,
          concept: { select: { name: true } },
        },
      }),
      prisma.fnbOrderItem.findMany({
        where: {
          order: {
            status: { not: "CANCELLED" },
            reservation: where,
          },
        },
        select: {
          unitPrice: true,
          quantity: true,
          order: { select: { createdAt: true } },
        },
      }),
      prisma.extraItem.findMany({
        where: { reservation: where },
        select: {
          unitPrice: true,
          quantity: true,
          createdAt: true,
        },
      }),
    ]);

    if (reservations.length === 0)
      warnings.push("Bu dönemde gelir kaydı bulunamadı.");

    const reservationRevenue = reservations.reduce(
      (s, r) => s + Number(r.totalPrice ?? 0),
      0,
    );
    const fnbRevenue = fnbItems.reduce(
      (s, i) => s + Number(i.unitPrice) * i.quantity,
      0,
    );
    const extraRevenue = extraItems.reduce(
      (s, i) => s + Number(i.unitPrice) * i.quantity,
      0,
    );

    const periodBuckets = new Map<
      string,
      { reservation: number; fnb: number; extra: number }
    >();

    for (const r of reservations) {
      const pk = periodKey(r.startDate, groupBy);
      const b = periodBuckets.get(pk) ?? { reservation: 0, fnb: 0, extra: 0 };
      b.reservation += Number(r.totalPrice ?? 0);
      periodBuckets.set(pk, b);
    }
    for (const i of fnbItems) {
      const pk = periodKey(i.order.createdAt, groupBy);
      const b = periodBuckets.get(pk) ?? { reservation: 0, fnb: 0, extra: 0 };
      b.fnb += Number(i.unitPrice) * i.quantity;
      periodBuckets.set(pk, b);
    }
    for (const i of extraItems) {
      const pk = periodKey(i.createdAt, groupBy);
      const b = periodBuckets.get(pk) ?? { reservation: 0, fnb: 0, extra: 0 };
      b.extra += Number(i.unitPrice) * i.quantity;
      periodBuckets.set(pk, b);
    }

    const breakdown = Array.from(periodBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, b]) => ({
        period,
        reservation: Math.round(b.reservation * 100) / 100,
        fnb: Math.round(b.fnb * 100) / 100,
        extra: Math.round(b.extra * 100) / 100,
        total: Math.round((b.reservation + b.fnb + b.extra) * 100) / 100,
      }));

    const conceptBuckets = new Map<string, number>();
    for (const r of reservations) {
      const cName = r.concept?.name ?? "Konseptsiz";
      conceptBuckets.set(
        cName,
        (conceptBuckets.get(cName) ?? 0) + Number(r.totalPrice ?? 0),
      );
    }
    const byConcept = Array.from(conceptBuckets.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([concept, revenue]) => ({
        concept,
        revenue: Math.round(revenue * 100) / 100,
      }));

    return {
      type: ReportType.REVENUE,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        summary: {
          totalRevenue:
            Math.round((reservationRevenue + fnbRevenue + extraRevenue) * 100) /
            100,
          reservationRevenue: Math.round(reservationRevenue * 100) / 100,
          fnbRevenue: Math.round(fnbRevenue * 100) / 100,
          extraRevenue: Math.round(extraRevenue * 100) / 100,
          reservationCount: reservations.length,
        },
        period: {
          start: (filters.startDate ?? new Date("2024-01-01"))
            .toISOString()
            .slice(0, 10),
          end: (filters.endDate ?? new Date()).toISOString().slice(0, 10),
        },
        breakdown,
        byConcept,
      },
    };
  }

  // ── Performance ────────────────────────────────────────────────────────────

  private async performanceReport(
    filters: SmartReportFilters,
  ): Promise<ReportResult> {
    const warnings: string[] = [];
    const where = this.buildReservationWhere(filters);

    const [reservations, statusHistory, modifications, cancellations] =
      await Promise.all([
        prisma.reservation.findMany({
          where,
          select: {
            id: true,
            status: true,
            cabanaId: true,
            startDate: true,
            checkInAt: true,
            createdAt: true,
            cabana: { select: { name: true } },
            concept: { select: { name: true } },
          },
        }),
        prisma.reservationStatusHistory.findMany({
          where: { reservation: where },
          select: {
            reservationId: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
        }),
        prisma.modificationRequest.count({ where: { reservation: where } }),
        prisma.cancellationRequest.count({ where: { reservation: where } }),
      ]);

    if (reservations.length === 0)
      warnings.push("Bu dönemde rezervasyon bulunamadı.");

    const totalReservations = reservations.length;
    const cancelledCount = reservations.filter(
      (r) => r.status === "CANCELLED",
    ).length;
    const cancelRate =
      totalReservations > 0
        ? Math.round((cancelledCount / totalReservations) * 10000) / 100
        : 0;
    const modificationRate =
      totalReservations > 0
        ? Math.round((modifications / totalReservations) * 10000) / 100
        : 0;

    const approvalTimes: number[] = [];
    const historyByRes = new Map<
      string,
      { fromStatus: string | null; toStatus: string; createdAt: Date }[]
    >();
    for (const h of statusHistory) {
      const arr = historyByRes.get(h.reservationId) ?? [];
      arr.push({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        createdAt: h.createdAt,
      });
      historyByRes.set(h.reservationId, arr);
    }

    for (const r of reservations) {
      const hist = historyByRes.get(r.id) ?? [];
      const approvalEntry = hist.find((h) => h.toStatus === "APPROVED");
      if (approvalEntry) {
        const diffMs =
          approvalEntry.createdAt.getTime() - r.createdAt.getTime();
        approvalTimes.push(diffMs / 3600000);
      }
    }

    const avgApprovalHours =
      approvalTimes.length > 0
        ? Math.round(
            (approvalTimes.reduce((a, b) => a + b, 0) /
              approvalTimes.length) *
              100,
          ) / 100
        : null;

    const checkInTimes: number[] = [];
    for (const r of reservations) {
      if (r.checkInAt) {
        const diffMs = r.checkInAt.getTime() - r.startDate.getTime();
        checkInTimes.push(diffMs / 3600000);
      }
    }
    const avgCheckInHours =
      checkInTimes.length > 0
        ? Math.round(
            (checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length) *
              100,
          ) / 100
        : null;

    const cabanaCounts = new Map<string, { name: string; count: number }>();
    for (const r of reservations) {
      const existing = cabanaCounts.get(r.cabanaId);
      if (existing) {
        existing.count += 1;
      } else {
        cabanaCounts.set(r.cabanaId, { name: r.cabana.name, count: 1 });
      }
    }
    const topCabanas = Array.from(cabanaCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const conceptCounts = new Map<string, number>();
    for (const r of reservations) {
      const cName = r.concept?.name ?? "Konseptsiz";
      conceptCounts.set(cName, (conceptCounts.get(cName) ?? 0) + 1);
    }
    const topConcepts = Array.from(conceptCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([concept, count]) => ({ concept, count }));

    return {
      type: ReportType.PERFORMANCE,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        summary: {
          totalReservations,
          cancelRate,
          modificationRate,
          avgApprovalHours,
          avgCheckInHours,
          modifications,
          cancellations,
        },
        period: {
          start: (filters.startDate ?? new Date("2024-01-01"))
            .toISOString()
            .slice(0, 10),
          end: (filters.endDate ?? new Date()).toISOString().slice(0, 10),
        },
        topCabanas,
        topConcepts,
      },
    };
  }

  // ── FnB ────────────────────────────────────────────────────────────────────

  private async fnbReport(
    filters: SmartReportFilters,
  ): Promise<ReportResult> {
    const warnings: string[] = [];
    const groupBy = filters.groupBy ?? ReportGroupBy.MONTHLY;

    const dateFilter: Record<string, unknown> = {};
    if (filters.startDate || filters.endDate) {
      dateFilter.createdAt = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const orders = await prisma.fnbOrder.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...dateFilter,
      },
      select: {
        id: true,
        cabanaId: true,
        createdAt: true,
        cabana: { select: { name: true } },
        items: {
          select: {
            productId: true,
            quantity: true,
            unitPrice: true,
            product: {
              select: {
                name: true,
                group: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (orders.length === 0)
      warnings.push("Bu dönemde FnB siparişi bulunamadı.");

    const productSales = new Map<
      string,
      { name: string; group: string; quantity: number; revenue: number }
    >();
    const cabanaSales = new Map<
      string,
      { name: string; orders: number; revenue: number }
    >();
    const groupSales = new Map<string, { quantity: number; revenue: number }>();
    const periodBuckets = new Map<
      string,
      { orders: number; revenue: number }
    >();

    let totalRevenue = 0;
    let totalItems = 0;

    for (const order of orders) {
      const pk = periodKey(order.createdAt, groupBy);
      const pBucket = periodBuckets.get(pk) ?? { orders: 0, revenue: 0 };
      pBucket.orders += 1;

      let orderTotal = 0;
      for (const item of order.items) {
        const lineTotal = Number(item.unitPrice) * item.quantity;
        orderTotal += lineTotal;
        totalItems += item.quantity;

        const ps = productSales.get(item.productId) ?? {
          name: item.product.name,
          group: item.product.group?.name ?? "Diğer",
          quantity: 0,
          revenue: 0,
        };
        ps.quantity += item.quantity;
        ps.revenue += lineTotal;
        productSales.set(item.productId, ps);

        const gName = item.product.group?.name ?? "Diğer";
        const gs = groupSales.get(gName) ?? { quantity: 0, revenue: 0 };
        gs.quantity += item.quantity;
        gs.revenue += lineTotal;
        groupSales.set(gName, gs);
      }

      totalRevenue += orderTotal;
      pBucket.revenue += orderTotal;
      periodBuckets.set(pk, pBucket);

      const cs = cabanaSales.get(order.cabanaId) ?? {
        name: order.cabana.name,
        orders: 0,
        revenue: 0,
      };
      cs.orders += 1;
      cs.revenue += orderTotal;
      cabanaSales.set(order.cabanaId, cs);
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);

    const byCabana = Array.from(cabanaSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const byGroup = Array.from(groupSales.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([group, v]) => ({
        group,
        quantity: v.quantity,
        revenue: Math.round(v.revenue * 100) / 100,
      }));

    const breakdown = Array.from(periodBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, b]) => ({
        period,
        orders: b.orders,
        revenue: Math.round(b.revenue * 100) / 100,
      }));

    return {
      type: ReportType.FNB,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        summary: {
          totalOrders: orders.length,
          totalItems,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgOrderAmount:
            orders.length > 0
              ? Math.round((totalRevenue / orders.length) * 100) / 100
              : 0,
        },
        period: {
          start: (filters.startDate ?? new Date("2024-01-01"))
            .toISOString()
            .slice(0, 10),
          end: (filters.endDate ?? new Date()).toISOString().slice(0, 10),
        },
        breakdown,
        topProducts: topProducts.map((p) => ({
          name: p.name,
          group: p.group,
          quantity: p.quantity,
          revenue: Math.round(p.revenue * 100) / 100,
        })),
        byCabana: byCabana.map((c) => ({
          cabana: c.name,
          orders: c.orders,
          revenue: Math.round(c.revenue * 100) / 100,
        })),
        byGroup,
      },
    };
  }

  // ── Guest ──────────────────────────────────────────────────────────────────

  private async guestReport(
    filters: SmartReportFilters,
  ): Promise<ReportResult> {
    const warnings: string[] = [];
    const where = this.buildReservationWhere(filters);

    const [guests, reservations] = await Promise.all([
      prisma.guest.findMany({
        select: {
          id: true,
          name: true,
          vipLevel: true,
          totalVisits: true,
          lastVisitAt: true,
          createdAt: true,
        },
      }),
      prisma.reservation.findMany({
        where: {
          ...where,
          guestId: { not: null },
          status: { in: ["APPROVED", "CHECKED_IN", "CHECKED_OUT"] },
        },
        select: {
          guestId: true,
          totalPrice: true,
          startDate: true,
        },
      }),
    ]);

    if (guests.length === 0) warnings.push("Misafir kaydı bulunamadı.");

    const vipDist = new Map<string, number>();
    for (const g of guests) {
      vipDist.set(g.vipLevel, (vipDist.get(g.vipLevel) ?? 0) + 1);
    }

    const guestSpend = new Map<
      string,
      { totalSpend: number; reservationCount: number }
    >();
    for (const r of reservations) {
      if (!r.guestId) continue;
      const gs = guestSpend.get(r.guestId) ?? {
        totalSpend: 0,
        reservationCount: 0,
      };
      gs.totalSpend += Number(r.totalPrice ?? 0);
      gs.reservationCount += 1;
      guestSpend.set(r.guestId, gs);
    }

    const guestMap = new Map(guests.map((g) => [g.id, g]));

    const topGuests = Array.from(guestSpend.entries())
      .sort(([, a], [, b]) => b.reservationCount - a.reservationCount)
      .slice(0, 20)
      .map(([guestId, data]) => {
        const g = guestMap.get(guestId);
        return {
          name: g?.name ?? "Bilinmiyor",
          vipLevel: g?.vipLevel ?? "STANDARD",
          reservationCount: data.reservationCount,
          totalSpend: Math.round(data.totalSpend * 100) / 100,
        };
      });

    const periodStart = filters.startDate ?? new Date("2024-01-01");
    const newGuests = guests.filter((g) => g.createdAt >= periodStart).length;
    const returningGuests = guests.filter(
      (g) => g.totalVisits > 1 && g.createdAt < periodStart,
    ).length;

    const totalSpendAll = Array.from(guestSpend.values()).reduce(
      (s, g) => s + g.totalSpend,
      0,
    );
    const guestsWithSpend = guestSpend.size;
    const avgSpendPerGuest =
      guestsWithSpend > 0
        ? Math.round((totalSpendAll / guestsWithSpend) * 100) / 100
        : 0;

    return {
      type: ReportType.GUEST,
      generatedAt: new Date().toISOString(),
      warnings,
      data: {
        summary: {
          totalGuests: guests.length,
          newGuests,
          returningGuests,
          avgSpendPerGuest,
        },
        period: {
          start: periodStart.toISOString().slice(0, 10),
          end: (filters.endDate ?? new Date()).toISOString().slice(0, 10),
        },
        vipDistribution: Array.from(vipDist.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([level, count]) => ({ level, count })),
        topGuests,
      },
    };
  }

  // ── Cost Analysis (legacy) ─────────────────────────────────────────────────

  private async costAnalysisReport(
    filters: SmartReportFilters,
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
      (s: number, e) => s + Number(e.product.purchasePrice) * e.quantity,
      0,
    );
    const totalSale = extras.reduce(
      (s: number, e) => s + Number(e.unitPrice) * e.quantity,
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

  // ── Request Stats (legacy) ─────────────────────────────────────────────────

  private async requestStatsReport(
    filters: SmartReportFilters,
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

  // ── Where builder ──────────────────────────────────────────────────────────

  private buildReservationWhere(filters: SmartReportFilters) {
    const where: Record<string, unknown> = {};
    if (filters.startDate || filters.endDate) {
      where.startDate = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }
    if (filters.classId) where.cabana = { classId: filters.classId };
    if (filters.conceptId) where.conceptId = filters.conceptId;
    return where;
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  async exportPDF(result: ReportResult): Promise<Buffer> {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();

      const LABEL_COLORS: Record<string, string> = {
        OCCUPANCY: "Doluluk Raporu",
        REVENUE: "Gelir Raporu",
        PERFORMANCE: "Performans Raporu",
        FNB: "F&B Raporu",
        GUEST: "Misafir Raporu",
        COST_ANALYSIS: "Maliyet Analizi",
        REQUEST_STATS: "Talep İstatistikleri",
      };
      const title = LABEL_COLORS[result.type] ?? result.type;

      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, pw, 32, "F");
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(18);
      doc.text(`Royal Cabana — ${title}`, 14, 20);
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `Oluşturulma: ${new Date(result.generatedAt).toLocaleString("tr-TR")}`,
        14,
        28,
      );
      doc.setTextColor(0, 0, 0);

      let y = 40;

      if (result.warnings.length > 0) {
        doc.setFillColor(255, 243, 205);
        doc.rect(14, y - 4, pw - 28, result.warnings.length * 7 + 6, "F");
        doc.setFontSize(8);
        doc.setTextColor(180, 100, 0);
        result.warnings.forEach((w, i) => {
          doc.text(`⚠ ${w}`, 18, y + i * 7 + 2);
        });
        doc.setTextColor(0, 0, 0);
        y += result.warnings.length * 7 + 12;
      }

      const data = result.data as Record<string, unknown>;

      const drawSummaryTable = (
        obj: Record<string, unknown>,
        sectionTitle: string,
      ) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text(sectionTitle, 14, y);
        y += 4;
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.5);
        doc.line(14, y, pw - 14, y);
        y += 6;

        const entries = Object.entries(obj);
        const colW = (pw - 28) / 2;
        doc.setFontSize(9);

        for (const [key, val] of entries) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          const isEven = entries.indexOf([key, val] as never) % 2 === 0;
          if (isEven) {
            doc.setFillColor(248, 248, 248);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(14, y - 4, pw - 28, 8, "F");

          doc.setTextColor(80, 80, 80);
          doc.text(String(key), 16, y);
          doc.setTextColor(20, 20, 20);
          const valStr =
            typeof val === "number"
              ? val.toLocaleString("tr-TR", { maximumFractionDigits: 2 })
              : String(val ?? "-");
          doc.text(valStr, 16 + colW, y);
          y += 8;
        }
        y += 6;
      };

      const drawArrayTable = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arr: Record<string, any>[],
        sectionTitle: string,
      ) => {
        if (!arr.length) return;
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text(sectionTitle, 14, y);
        y += 4;
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.5);
        doc.line(14, y, pw - 14, y);
        y += 6;

        const cols = Object.keys(arr[0]);
        const tableW = pw - 28;
        const colWidth = tableW / cols.length;

        doc.setFillColor(30, 30, 30);
        doc.rect(14, y - 4, tableW, 8, "F");
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        cols.forEach((c, i) => {
          doc.text(
            String(c).substring(0, 18),
            16 + i * colWidth,
            y,
          );
        });
        y += 8;

        doc.setFontSize(7);
        doc.setTextColor(30, 30, 30);
        for (let r = 0; r < Math.min(arr.length, 80); r++) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          if (r % 2 === 0) {
            doc.setFillColor(248, 248, 248);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(14, y - 4, tableW, 7, "F");

          cols.forEach((c, i) => {
            const v = arr[r][c];
            const s =
              typeof v === "number"
                ? v.toLocaleString("tr-TR", { maximumFractionDigits: 2 })
                : String(v ?? "-").substring(0, 22);
            doc.text(s, 16 + i * colWidth, y);
          });
          y += 7;
        }
        y += 6;
      };

      if (data.summary && typeof data.summary === "object") {
        drawSummaryTable(
          data.summary as Record<string, unknown>,
          "Özet",
        );
      }

      for (const [key, val] of Object.entries(data)) {
        if (key === "summary" || key === "period") continue;
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
          drawArrayTable(val as Record<string, unknown>[], key);
        } else if (
          typeof val === "object" &&
          val !== null &&
          !Array.isArray(val)
        ) {
          drawSummaryTable(val as Record<string, unknown>, key);
        }
      }

      if (data.period && typeof data.period === "object") {
        const p = data.period as Record<string, string>;
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(
          `Dönem: ${p.start ?? ""} — ${p.end ?? ""}`,
          14,
          y,
        );
      }

      return Buffer.from(doc.output("arraybuffer"));
    } catch (error) {
      throw new DatabaseError("PDF dışa aktarılamadı", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async exportExcel(result: ReportResult): Promise<Buffer> {
    try {
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
        : Array.isArray(result.data.breakdown)
          ? (result.data.breakdown as unknown[]).map((r) => flatten(r))
          : [flatten(result.data)];

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, result.type);

      return Buffer.from(
        XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
      );
    } catch (error) {
      throw new DatabaseError("Excel dışa aktarılamadı", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const reportEngine = new ReportEngine();
