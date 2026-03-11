"use client";

import { useQuery } from "@tanstack/react-query";
import { Percent, Clock, CalendarCheck, X } from "lucide-react";
import Link from "next/link";
import WeatherCard from "@/components/shared/WeatherCard";
import { KpiCard } from "@/components/shared/KpiCard";
import { Card, CardContent } from "@/components/molecules/Card";
import { ListPageTemplate } from "@/components/templates";
import { SkeletonCardGrid } from "@/components/atoms/Skeleton";

interface CasinoAdminStats {
  totalCabanas: number;
  availableCabanas: number;
  reservedCabanas: number;
  closedCabanas: number;
  occupancyRate: number;
  pendingRequests: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: Partial<T>;
  error?: string;
}

export default function CasinoAdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<CasinoAdminStats>({
    queryKey: ["casino-admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/casino-admin/stats");
      if (!res.ok) throw new Error("Veri alınamadı");
      const payload: ApiEnvelope<CasinoAdminStats> = await res.json();
      return {
        totalCabanas: payload.data?.totalCabanas ?? 0,
        availableCabanas: payload.data?.availableCabanas ?? 0,
        reservedCabanas: payload.data?.reservedCabanas ?? 0,
        closedCabanas: payload.data?.closedCabanas ?? 0,
        occupancyRate: payload.data?.occupancyRate ?? 0,
        pendingRequests: payload.data?.pendingRequests ?? 0,
        approvedThisMonth: payload.data?.approvedThisMonth ?? 0,
        rejectedThisMonth: payload.data?.rejectedThisMonth ?? 0,
      };
    },
  });

  return (
    <ListPageTemplate
      title="Casino Admin Paneli"
      subtitle="Cabana ve rezervasyon özeti"
    >
      <div className="space-y-6">
        {isError && (
          <div className="px-4 py-3 rounded-lg bg-[var(--rc-danger)]/10 border border-[var(--rc-danger)]/30 text-[var(--rc-danger)] text-sm">
            İstatistikler yüklenirken hata oluştu.
          </div>
        )}

        {isLoading || !stats ? (
          <SkeletonCardGrid count={8} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                href="/casino-admin/reservations"
                icon={Percent}
                label="Doluluk"
                value={`%${stats.occupancyRate.toFixed(1)}`}
                sub={`${stats.reservedCabanas}/${stats.totalCabanas} Cabana`}
                accent="gold"
              />
              <KpiCard
                href="/casino-admin/requests"
                icon={Clock}
                label="Bekleyen"
                value={stats.pendingRequests}
                sub="Onay bekliyor"
                accent="warning"
              />
              <KpiCard
                href="/casino-admin/reservations?status=APPROVED"
                icon={CalendarCheck}
                label="Onaylanan"
                value={stats.approvedThisMonth}
                sub="Bu ay"
                accent="success"
              />
              <KpiCard
                href="/casino-admin/reservations?status=REJECTED"
                icon={X}
                label="Reddedilen"
                value={stats.rejectedThisMonth}
                sub="Bu ay"
                accent="danger"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5 border border-neutral-700/50">
                <h2 className="text-sm font-semibold text-[var(--rc-text-primary)] mb-4">
                  Cabana Durum Dağılımı
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[var(--rc-success)]" />
                      <span className="text-sm text-[var(--rc-text-secondary)]">
                        Müsait
                      </span>
                    </div>
                    <span className="text-lg font-bold text-[var(--rc-success)]">
                      {stats.availableCabanas}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[var(--rc-danger)]" />
                      <span className="text-sm text-[var(--rc-text-secondary)]">
                        Rezerve
                      </span>
                    </div>
                    <span className="text-lg font-bold text-[var(--rc-danger)]">
                      {stats.reservedCabanas}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[var(--rc-text-muted)]" />
                      <span className="text-sm text-[var(--rc-text-secondary)]">
                        Kapalı
                      </span>
                    </div>
                    <span className="text-lg font-bold text-[var(--rc-text-muted)]">
                      {stats.closedCabanas}
                    </span>
                  </div>
                </div>
                <Link
                  href="/casino-admin/requests"
                  className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 text-sm font-medium text-[var(--rc-gold)] bg-[var(--rc-gold)]/15 hover:bg-[var(--rc-gold)]/25 rounded-lg transition-colors min-h-[44px] border border-[var(--rc-gold)]/30"
                >
                  Talepleri Görüntüle
                  <span className="w-4 h-4 inline-flex items-center justify-center">→</span>
                </Link>
              </Card>
              <WeatherCard />
            </div>
          </>
        )}
      </div>
    </ListPageTemplate>
  );
}
