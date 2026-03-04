"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Percent, Clock, CalendarCheck, X, ArrowRight } from "lucide-react";
import WeatherCard from "@/components/shared/WeatherCard";

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

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
        />
      ))}
    </div>
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
    <div className="text-neutral-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-yellow-400">
            Admin Dashboard
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Genel bakış ve istatistikler
          </p>
        </div>

        {isError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
            İstatistikler yüklenirken hata oluştu.
          </div>
        )}

        {/* KPI Cards */}
        {isLoading ? (
          <KpiSkeleton />
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Doluluk Oranı */}
                <Link
                  href="/admin/reservations"
                  className="group bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 hover:border-amber-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer"
                >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Percent className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">
                    Doluluk
                  </span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400/0 group-hover:text-amber-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
                </div>
                <p className="text-3xl font-bold text-amber-400">
                  %{stats.occupancyRate.toFixed(1)}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                    {stats.reservedCabanas}/{stats.totalCabanas} Cabana
                </p>
                </Link>

              {/* Bekleyen Talepler */}
                <Link
                  href="/admin/requests"
                  className="group bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 hover:border-orange-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer"
                >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-xs text-orange-400 font-medium uppercase tracking-wider">
                    Bekleyen
                  </span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange-400/0 group-hover:text-orange-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
                </div>
                <p className="text-3xl font-bold text-orange-400">
                  {stats.pendingRequests}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Onay bekliyor</p>
                </Link>

              {/* Bu Ay Onaylanan */}
                <Link
                  href="/admin/reservations?status=APPROVED"
                  className="group bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 hover:border-green-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/10 cursor-pointer"
                >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-xs text-green-400 font-medium uppercase tracking-wider">
                    Onaylanan
                  </span>
                    <ArrowRight className="w-3.5 h-3.5 text-green-400/0 group-hover:text-green-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
                </div>
                <p className="text-3xl font-bold text-green-400">
                  {stats.approvedThisMonth}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Bu ay</p>
                </Link>

              {/* Bu Ay Reddedilen */}
                <Link
                  href="/admin/reservations?status=REJECTED"
                  className="group bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 hover:border-red-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/10 cursor-pointer"
                >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-xs text-red-400 font-medium uppercase tracking-wider">
                    Reddedilen
                  </span>
                    <ArrowRight className="w-3.5 h-3.5 text-red-400/0 group-hover:text-red-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
                </div>
                <p className="text-3xl font-bold text-red-400">
                  {stats.rejectedThisMonth}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Bu ay</p>
                </Link>
            </div>

              {/* Cabana Durum + Weather */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Cabana Durum Dağılımı */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-neutral-300 mb-4">
                    Cabana Durum Dağılımı
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm text-neutral-300">Müsait</span>
                    </div>
                    <span className="text-lg font-bold text-green-400">
                      {stats.availableCabanas}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm text-neutral-300">Rezerve</span>
                    </div>
                    <span className="text-lg font-bold text-red-400">
                      {stats.reservedCabanas}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-neutral-500" />
                      <span className="text-sm text-neutral-300">Kapalı</span>
                    </div>
                    <span className="text-lg font-bold text-neutral-400">
                      {stats.closedCabanas}
                    </span>
                  </div>
                </div>
                <Link
                  href="/admin/requests"
                  className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                >
                  Talepleri Görüntüle
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Weather Card */}
              <WeatherCard />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
