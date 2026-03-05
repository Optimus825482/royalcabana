"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Percent, Clock, CalendarCheck, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import WeatherCard from "@/components/shared/WeatherCard";
import { Card, CardContent } from "@/components/molecules/Card";
import { ListPageTemplate } from "@/components/templates";
import { SkeletonCardGrid } from "@/components/atoms/Skeleton";

interface AdminStats {
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

const accents = {
  success: "bg-[var(--rc-success)]/20 text-[var(--rc-success)]",
  warning: "bg-[var(--rc-warning)]/20 text-[var(--rc-warning)]",
  danger: "bg-[var(--rc-danger)]/20 text-[var(--rc-danger)]",
  info: "bg-[var(--rc-info)]/20 text-[var(--rc-info)]",
  gold: "bg-[var(--rc-gold)]/20 text-[var(--rc-gold)]",
} as const;

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub: string;
  accent: keyof typeof accents;
}) {
  const accentClass = accents[accent];
  return (
    <Link href={href} className="block group">
      <Card className="p-5 h-full transition-all hover:scale-[1.01]">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                accentClass,
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-wider",
                accentClass as string,
              )}
            >
              {label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-[var(--rc-text-muted)] group-hover:text-[var(--rc-gold)] group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className={cn("text-3xl font-bold", accentClass)}>{value}</p>
          <p className="text-xs text-[var(--rc-text-muted)] mt-1">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Veri alınamadı");
      const payload: ApiEnvelope<AdminStats> = await res.json();
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
      title="Admin Paneli"
      subtitle="Genel bakış ve istatistikler"
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
                href="/admin/reservations"
                icon={Percent}
                label="Doluluk"
                value={`%${stats.occupancyRate.toFixed(1)}`}
                sub={`${stats.reservedCabanas}/${stats.totalCabanas} Cabana`}
                accent="gold"
              />
              <KpiCard
                href="/admin/requests"
                icon={Clock}
                label="Bekleyen"
                value={stats.pendingRequests}
                sub="Onay bekliyor"
                accent="warning"
              />
              <KpiCard
                href="/admin/reservations?status=APPROVED"
                icon={CalendarCheck}
                label="Onaylanan"
                value={stats.approvedThisMonth}
                sub="Bu ay"
                accent="success"
              />
              <KpiCard
                href="/admin/reservations?status=REJECTED"
                icon={X}
                label="Reddedilen"
                value={stats.rejectedThisMonth}
                sub="Bu ay"
                accent="danger"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
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
                  href="/admin/requests"
                  className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 text-sm font-medium text-[var(--rc-gold)] bg-[var(--rc-gold)]/10 hover:bg-[var(--rc-gold)]/20 rounded-lg transition-colors min-h-[44px]"
                >
                  Talepleri Görüntüle
                  <ArrowRight className="w-4 h-4" />
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
