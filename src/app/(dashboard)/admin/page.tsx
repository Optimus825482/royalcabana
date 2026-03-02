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
      return res.json();
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
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Percent className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">
                    Doluluk
                  </span>
                </div>
                <p className="text-3xl font-bold text-amber-400">
                  %{stats.occupancyRate.toFixed(1)}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {stats.reservedCabanas}/{stats.totalCabanas} kabana
                </p>
              </div>

              {/* Bekleyen Talepler */}
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-xs text-orange-400 font-medium uppercase tracking-wider">
                    Bekleyen
                  </span>
                </div>
                <p className="text-3xl font-bold text-orange-400">
                  {stats.pendingRequests}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Onay bekliyor</p>
              </div>

              {/* Bu Ay Onaylanan */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-xs text-green-400 font-medium uppercase tracking-wider">
                    Onaylanan
                  </span>
                </div>
                <p className="text-3xl font-bold text-green-400">
                  {stats.approvedThisMonth}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Bu ay</p>
              </div>

              {/* Bu Ay Reddedilen */}
              <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-xs text-red-400 font-medium uppercase tracking-wider">
                    Reddedilen
                  </span>
                </div>
                <p className="text-3xl font-bold text-red-400">
                  {stats.rejectedThisMonth}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Bu ay</p>
              </div>
            </div>

            {/* Kabana Durum + Weather */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Kabana Durum Dağılımı */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-neutral-300 mb-4">
                  Kabana Durum Dağılımı
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
