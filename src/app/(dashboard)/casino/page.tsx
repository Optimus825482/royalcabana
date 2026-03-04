"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  ArrowRight,
  Percent,
  Users,
  MapPin,
  Calendar,
} from "lucide-react";
import WeatherCard from "@/components/shared/WeatherCard";
import PermissionGate from "@/components/shared/PermissionGate";

interface UpcomingReservation {
  id: string;
  cabanaName: string;
  guestName: string;
  startDate: string;
  endDate: string;
}

interface CasinoStats {
  activeReservations: number;
  pendingRequests: number;
  upcomingReservations: UpcomingReservation[];
  totalReservations: number;
  thisMonthReservations: number;
  occupancyRate?: number;
  totalCabanas?: number;
  availableCabanas?: number;
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

const formatDateRange = (start: string, end: string) => {
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
};

export default function CasinoDashboard() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<CasinoStats>({
    queryKey: ["casino-stats"],
    queryFn: async () => {
      const res = await fetch("/api/casino/stats");
      if (!res.ok) throw new Error("Stats fetch failed");
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const upcoming = Array.isArray(stats?.upcomingReservations)
    ? stats.upcomingReservations
    : [];
  const safeStats: CasinoStats = {
    activeReservations: stats?.activeReservations ?? 0,
    pendingRequests: stats?.pendingRequests ?? 0,
    upcomingReservations: upcoming,
    totalReservations: stats?.totalReservations ?? 0,
    thisMonthReservations: stats?.thisMonthReservations ?? 0,
    occupancyRate: stats?.occupancyRate,
    totalCabanas: stats?.totalCabanas,
    availableCabanas: stats?.availableCabanas,
  };

  return (
    <PermissionGate
      permission="reservation.view"
      fallback={
        <div className="flex items-center justify-center h-64 text-neutral-400">
          Bu sayfaya erişim yetkiniz bulunmamaktadır.
        </div>
      }
    >
      <div className="text-neutral-100 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-yellow-400">
              Casino Paneli
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Rezervasyon durumunuz ve istatistikler
            </p>
          </div>

          {/* KPI Cards */}
          {isLoading ? (
            <KpiSkeleton />
          ) : isError ? (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              İstatistikler yüklenirken hata oluştu.
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Aktif Rezervasyonlar */}
                    <Link
                      href="/casino/reservations?status=ACTIVE"
                      className="group bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <CalendarCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
                          Aktif
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400/0 group-hover:text-emerald-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
                      </div>
                      <p className="text-3xl font-bold text-emerald-400">
                        {safeStats.activeReservations}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">Rezervasyon</p>
                    </Link>

                    {/* Bekleyen Talepler */}
                    <Link
                      href="/casino/reservations?status=PENDING"
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
                        {safeStats.pendingRequests}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">Onay bekliyor</p>
                    </Link>

                    {/* Bu Ay */}
                    <Link
                      href="/casino/calendar"
                      className="group bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 hover:border-blue-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">
                          Bu Ay
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400/0 group-hover:text-blue-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
                      </div>
                      <p className="text-3xl font-bold text-blue-400">
                        {safeStats.thisMonthReservations}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">Rezervasyon</p>
                    </Link>

                    {/* Toplam */}
                    <Link
                      href="/casino/reservations"
                      className="group bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 hover:border-purple-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-xs text-purple-400 font-medium uppercase tracking-wider">
                          Toplam
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400/0 group-hover:text-purple-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
                      </div>
                      <p className="text-3xl font-bold text-purple-400">
                        {safeStats.totalReservations}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">Rezervasyon</p>
                    </Link>
                  </div>

                  {/* Upcoming Reservations + Weather */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Yaklaşan Rezervasyonlar */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                        <h2 className="text-sm font-semibold text-neutral-300">
                          Yaklaşan Rezervasyonlar (7 Gün)
                        </h2>
                        <Link
                          href="/casino/reservations"
                          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          Tümü <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                      {safeStats.upcomingReservations.length > 0 ? (
                        <ul className="divide-y divide-neutral-800">
                          {safeStats.upcomingReservations.slice(0, 5).map((r) => (
                            <li key={r.id}>
                              <Link
                                href={`/casino/reservations/${r.id}`}
                                className="flex items-center justify-between px-5 py-3 hover:bg-neutral-800/40 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-neutral-100 truncate">
                                    {r.cabanaName}
                                  </p>
                                  <p className="text-xs text-neutral-500 truncate">
                                    {r.guestName}
                                  </p>
                                </div>
                                <span
                                  className="text-xs text-neutral-400 shrink-0 ml-3"
                                  suppressHydrationWarning
                                >
                                  {formatDateRange(r.startDate, r.endDate)}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-5 py-8 text-center">
                          <Calendar className="w-10 h-10 text-neutral-700 mx-auto mb-2" />
                          <p className="text-sm text-neutral-500">
                            Yaklaşan rezervasyon yok
                          </p>
                        </div>
                      )}
                      <div className="px-5 py-3 border-t border-neutral-800">
                        <Link
                          href="/casino/calendar"
                          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                        >
                          Takvimi Görüntüle
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                {/* Weather Card */}
                <WeatherCard />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </PermissionGate>
  );
}
