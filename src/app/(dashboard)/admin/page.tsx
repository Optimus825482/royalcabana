"use client";

import { useEffect, useState } from "react";

interface AdminStats {
  totalCabanas: number;
  availableCabanas: number;
  reservedCabanas: number;
  closedCabanas: number;
  occupancyRate: number;
  pendingRequests: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-neutral-800 rounded w-1/2 mb-4" />
      <div className="h-10 bg-neutral-800 rounded w-2/3 mb-2" />
      <div className="h-3 bg-neutral-800 rounded w-3/4" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Veri alınamadı");
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError("İstatistikler yüklenirken hata oluştu.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <h1 className="text-2xl font-bold text-amber-400 mb-8">
        Admin Dashboard
      </h1>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Ana metrik kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : stats ? (
          <>
            {/* Doluluk Oranı */}
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                Doluluk Oranı
              </p>
              <p className="text-4xl font-bold text-amber-400 mb-1">
                %{stats.occupancyRate.toFixed(1)}
              </p>
              <p className="text-xs text-neutral-500">
                {stats.reservedCabanas} kabana rezerve / {stats.totalCabanas}{" "}
                toplam
              </p>
            </div>

            {/* Bekleyen Talepler */}
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                Bekleyen Talepler
              </p>
              <p className="text-4xl font-bold text-orange-400 mb-1">
                {stats.pendingRequests}
              </p>
              <p className="text-xs text-neutral-500">Onay bekliyor</p>
            </div>

            {/* Bu Ay Onaylanan */}
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                Bu Ay Onaylanan
              </p>
              <p className="text-4xl font-bold text-green-400 mb-1">
                {stats.approvedThisMonth}
              </p>
              <p className="text-xs text-neutral-500">Rezervasyon onaylandı</p>
            </div>

            {/* Toplam Gelir */}
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                Toplam Gelir
              </p>
              <p className="text-3xl font-bold text-amber-300 mb-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-xs text-neutral-500">
                Bu ay: {formatCurrency(stats.revenueThisMonth)}
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Detay kartları */}
      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Kabana Durum Dağılımı */}
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <p className="text-sm font-semibold text-neutral-300 mb-4">
              Kabana Durum Dağılımı
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm text-neutral-300">Müsait</span>
                </div>
                <span className="text-sm font-semibold text-neutral-100">
                  {stats.availableCabanas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="text-sm text-neutral-300">Rezerve</span>
                </div>
                <span className="text-sm font-semibold text-neutral-100">
                  {stats.reservedCabanas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-500 inline-block" />
                  <span className="text-sm text-neutral-300">Kapalı</span>
                </div>
                <span className="text-sm font-semibold text-neutral-100">
                  {stats.closedCabanas}
                </span>
              </div>
            </div>
          </div>

          {/* Bu Ay Reddedilen */}
          <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <p className="text-sm font-semibold text-neutral-300 mb-4">
              Bu Ay Reddedilen Talepler
            </p>
            <p className="text-4xl font-bold text-red-400 mb-1">
              {stats.rejectedThisMonth}
            </p>
            <p className="text-xs text-neutral-500">Reddedilen rezervasyon</p>
          </div>
        </div>
      )}
    </div>
  );
}
