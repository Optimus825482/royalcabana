"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Percent,
  Clock,
  CalendarCheck,
  TrendingUp,
  UserCheck,
  Users,
  Package,
  MapPin,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import WeatherCard from "@/components/shared/WeatherCard";

interface SystemStats {
  totalCabanas: number;
  availableCabanas: number;
  reservedCabanas: number;
  closedCabanas: number;
  occupancyRate: number;
  totalUsers: number;
  activeUsers: number;
  totalGuests: number;
  totalProducts: number;
  activeProducts: number;
  totalReservations: number;
  pendingRequests: number;
  approvedThisMonth: number;
  checkedInToday: number;
  totalStaff: number;
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-28 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
        />
      ))}
    </div>
  );
}

export default function SystemAdminDashboard() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ["system-admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/system-admin/stats");
      if (!res.ok) throw new Error("Stats fetch failed");
      const json = await res.json();
      return json.data ?? json;
    },
  });

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-yellow-400">
            Sistem Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Genel bakış ve istatistikler
          </p>
        </div>

        {/* KPI Cards */}
        {isLoading || !stats ? (
          <KpiSkeleton />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Doluluk Oranı */}
            <Link
              href="/system-admin/map"
              className="group bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
                  Doluluk
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400/0 group-hover:text-emerald-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
              </div>
              <p className="text-3xl font-bold text-emerald-400">
                %{stats.occupancyRate}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {stats.reservedCabanas}/{stats.totalCabanas} Cabana
              </p>
            </Link>

            {/* Bekleyen Talepler */}
            <Link
              href="/system-admin/reservations?status=PENDING"
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
              href="/system-admin/reservations?status=APPROVED"
              className="group bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 hover:border-green-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-xs text-green-400 font-medium uppercase tracking-wider">
                  Bu Ay
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-green-400/0 group-hover:text-green-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
              </div>
              <p className="text-3xl font-bold text-green-400">
                {stats.approvedThisMonth}
              </p>
              <p className="text-xs text-neutral-500 mt-1">Onaylanan</p>
            </Link>

            {/* Bugün Check-in */}
            <Link
              href="/system-admin/calendar"
              className="group bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 hover:border-blue-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">
                  Bugün
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400/0 group-hover:text-blue-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
              </div>
              <p className="text-3xl font-bold text-blue-400">
                {stats.checkedInToday}
              </p>
              <p className="text-xs text-neutral-500 mt-1">Check-in</p>
            </Link>

            {/* Aktif Kullanıcılar */}
            <Link
              href="/system-admin/users"
              className="group bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 hover:border-purple-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs text-purple-400 font-medium uppercase tracking-wider">
                  Aktif
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400/0 group-hover:text-purple-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
              </div>
              <p className="text-3xl font-bold text-purple-400">
                {stats.activeUsers}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                /{stats.totalUsers} kullanıcı
              </p>
            </Link>

            {/* Toplam Personel */}
            <Link
              href="/system-admin/staff"
              className="group bg-gradient-to-br from-teal-500/20 to-teal-500/5 border border-teal-500/30 hover:border-teal-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-teal-400" />
                </div>
                <span className="text-xs text-teal-400 font-medium uppercase tracking-wider">
                  Personel
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-teal-400/0 group-hover:text-teal-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
              </div>
              <p className="text-3xl font-bold text-teal-400">
                {stats.totalStaff}
              </p>
              <p className="text-xs text-neutral-500 mt-1">Toplam</p>
            </Link>

            {/* Aktif Ürünler */}
            <Link
              href="/system-admin/products"
              className="group bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/30 hover:border-pink-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-pink-400" />
                </div>
                <span className="text-xs text-pink-400 font-medium uppercase tracking-wider">
                  Ürünler
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-pink-400/0 group-hover:text-pink-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
              </div>
              <p className="text-3xl font-bold text-pink-400">
                {stats.activeProducts}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                /{stats.totalProducts} aktif
              </p>
            </Link>

            {/* Toplam Cabanalar */}
            <Link
              href="/system-admin/map"
              className="group bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 hover:border-amber-400/60 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">
                  Cabanalar
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400/0 group-hover:text-amber-400/80 ml-auto transition-all group-hover:translate-x-0.5" />
              </div>
              <p className="text-3xl font-bold text-amber-400">
                {stats.totalCabanas}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {stats.availableCabanas} müsait
              </p>
            </Link>
          </div>
        )}

        {/* Cabana Durum Dağılımı */}
        {!isLoading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                href="/system-admin/map"
                className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
              >
                Haritayı Görüntüle
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Weather Card */}
            <WeatherCard />
          </div>
        )}
      </div>
    </div>
  );
}
