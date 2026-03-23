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
import { KpiCard } from "@/components/shared/KpiCard";
import { Card } from "@/components/molecules/Card";
import { SkeletonCardGrid } from "@/components/atoms/Skeleton";
import { ListPageTemplate } from "@/components/templates";

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
    <ListPageTemplate
      title="Sistem Yönetimi"
      subtitle="Genel bakış ve istatistikler"
    >
      <div className="space-y-6">
        {isLoading || !stats ? (
          <SkeletonCardGrid count={8} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              href="/system-admin/map"
              icon={Percent}
              label="Doluluk"
              value={`%${stats.occupancyRate}`}
              sub={`${stats.reservedCabanas}/${stats.totalCabanas} Cabana`}
              accent="success"
            />
            <KpiCard
              href="/system-admin/requests"
              icon={Clock}
              label="Bekleyen"
              value={stats.pendingRequests}
              sub="Onay bekliyor"
              accent="warning"
            />
            <KpiCard
              href="/system-admin/reservations?status=APPROVED"
              icon={CalendarCheck}
              label="Bu Ay"
              value={stats.approvedThisMonth}
              sub="Onaylanan"
              accent="success"
            />
            <KpiCard
              href="/system-admin/calendar"
              icon={TrendingUp}
              label="Bugün"
              value={stats.checkedInToday}
              sub="Check-in"
              accent="info"
            />
            <KpiCard
              href="/system-admin/users"
              icon={UserCheck}
              label="Aktif"
              value={stats.activeUsers}
              sub={`/${stats.totalUsers} kullanıcı`}
              accent="purple"
            />
            <KpiCard
              href="/system-admin/staff"
              icon={Users}
              label="Personel"
              value={stats.totalStaff}
              sub="Toplam"
              accent="info"
            />
            <KpiCard
              href="/system-admin/products"
              icon={Package}
              label="Ürünler"
              value={stats.activeProducts}
              sub={`/${stats.totalProducts} aktif`}
              accent="purple"
            />
            <KpiCard
              href="/system-admin/map"
              icon={MapPin}
              label="Cabanalar"
              value={stats.totalCabanas}
              sub={`${stats.availableCabanas} müsait`}
              accent="gold"
            />
          </div>
        )}

        {!isLoading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 border border-neutral-700/50">
              <h2 className="text-sm font-semibold text-[var(--rc-text-primary)] mb-4">
                Cabana Durum Dağılımı
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--rc-success)]" />
                    <span className="text-sm text-[var(--rc-text-secondary)]">Müsait</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--rc-success)]">
                    {stats.availableCabanas}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--rc-danger)]" />
                    <span className="text-sm text-[var(--rc-text-secondary)]">Rezerve</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--rc-danger)]">
                    {stats.reservedCabanas}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--rc-text-muted)]" />
                    <span className="text-sm text-[var(--rc-text-secondary)]">Kapalı</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--rc-text-muted)]">
                    {stats.closedCabanas}
                  </span>
                </div>
              </div>
              <Link
                href="/system-admin/map"
                className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 text-sm font-medium text-[var(--rc-gold)] bg-[var(--rc-gold)]/15 hover:bg-[var(--rc-gold)]/25 rounded-lg transition-colors min-h-[44px] border border-[var(--rc-gold)]/30"
              >
                Haritayı Görüntüle
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Card>
            <WeatherCard />
          </div>
        )}
      </div>
    </ListPageTemplate>
  );
}
