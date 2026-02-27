"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Map,
  CalendarDays,
  BookOpen,
  Cuboid,
  BarChart3,
  CalendarCheck,
  Clock,
  TrendingUp,
  ArrowRight,
  ListOrdered,
  Repeat,
  Star,
} from "lucide-react";
import WeatherWidget from "@/components/shared/WeatherWidget";

// ── Types ──

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
}

interface ModuleConfig {
  reviews: { enabled: boolean };
}

// ── Constants ──

type MenuItemDef = {
  href: string;
  label: string;
  description: string;
  Icon: typeof Map;
  color: string;
  bgColor: string;
};

type MenuGroupDef = {
  title: string;
  Icon: typeof Map;
  color: string;
  items: MenuItemDef[];
};

const STATIC_GROUPS: MenuGroupDef[] = [
  {
    title: "Keşfet",
    Icon: Map,
    color: "text-emerald-400",
    items: [
      {
        href: "/casino/map",
        label: "Kabana Haritası",
        description: "Kabanaları görüntüle ve rezervasyon talebi oluştur",
        Icon: Map,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
      },
      {
        href: "/casino/calendar",
        label: "Takvim",
        description: "Rezervasyon takvimini görüntüle ve yönet",
        Icon: CalendarDays,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
      },
      {
        href: "/casino/view",
        label: "3D Görünüm",
        description: "Kabanaları 2D/3D haritada görüntüle",
        Icon: Cuboid,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
      },
    ],
  },
  {
    title: "Rezervasyonlar",
    Icon: BookOpen,
    color: "text-amber-400",
    items: [
      {
        href: "/casino/reservations",
        label: "Rezervasyonlarım",
        description: "Mevcut rezervasyonlarını görüntüle ve yönet",
        Icon: BookOpen,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
      },
      {
        href: "/casino/waitlist",
        label: "Bekleme Listesi",
        description: "Dolu kabanalar için bekleme listesine kayıt ol",
        Icon: ListOrdered,
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
      },
      {
        href: "/casino/recurring",
        label: "Tekrarlayan Rezervasyonlar",
        description: "Haftalık veya aylık tekrarlayan rezervasyonlarını yönet",
        Icon: Repeat,
        color: "text-teal-400",
        bgColor: "bg-teal-500/10",
      },
    ],
  },
];

const EXPERIENCE_GROUP: MenuGroupDef = {
  title: "Deneyim",
  Icon: Star,
  color: "text-yellow-400",
  items: [
    {
      href: "/casino/reviews",
      label: "Değerlendirmeler",
      description: "Geçmiş rezervasyonlarını değerlendir ve puanla",
      Icon: Star,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
  ],
};

const STANDALONE_MENU: MenuItemDef[] = [
  {
    href: "/reports",
    label: "Raporlar",
    description: "Doluluk, gelir ve talep istatistiklerini görüntüle",
    Icon: BarChart3,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
];

const KPI_CARDS: ReadonlyArray<{
  key: keyof Pick<
    CasinoStats,
    "activeReservations" | "pendingRequests" | "thisMonthReservations"
  >;
  label: string;
  Icon: typeof CalendarCheck;
  color: string;
  borderColor: string;
  bgIcon: string;
}> = [
  {
    key: "activeReservations",
    label: "Aktif Rezervasyonlar",
    Icon: CalendarCheck,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgIcon: "bg-emerald-500/10",
  },
  {
    key: "pendingRequests",
    label: "Bekleyen Talepler",
    Icon: Clock,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgIcon: "bg-amber-500/10",
  },
  {
    key: "thisMonthReservations",
    label: "Bu Ay",
    Icon: TrendingUp,
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgIcon: "bg-blue-500/10",
  },
];

const formatDateRange = (start: string, end: string) => {
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
};

// ── Skeleton ──

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse"
        />
      ))}
    </div>
  );
}

// ── Component ──

export default function CasinoDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<CasinoStats>({
    queryKey: ["casino-stats"],
    queryFn: async () => {
      const res = await fetch("/api/casino/stats");
      if (!res.ok) throw new Error("Stats fetch failed");
      return res.json();
    },
  });

  const { data: moduleConfig } = useQuery<ModuleConfig>({
    queryKey: ["module-config"],
    queryFn: async () => {
      const res = await fetch("/api/system/modules");
      if (!res.ok) throw new Error("Module config fetch failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  // Build menu groups based on module config — useMemo for stable reference
  const menuGroups = useMemo(() => {
    const groups = [...STATIC_GROUPS];
    if (!mounted || !moduleConfig) return groups;

    const expItems = EXPERIENCE_GROUP.items.filter((item) => {
      if (item.href === "/casino/reviews") return moduleConfig.reviews.enabled;
      return true;
    });

    if (expItems.length > 0) {
      groups.push({ ...EXPERIENCE_GROUP, items: expItems });
    }
    return groups;
  }, [mounted, moduleConfig]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-yellow-400">
              Casino Paneli
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Rezervasyon durumunuz ve hızlı erişim
            </p>
          </div>
          <div className="hidden sm:block shrink-0">
            <WeatherWidget />
          </div>
        </div>

        {/* KPI Cards */}
        {isLoading && <KpiSkeleton />}

        {!isLoading && !isError && stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {KPI_CARDS.map((card) => {
                const value = stats[card.key] as number;
                return (
                  <div
                    key={card.key}
                    className={`flex items-center gap-3 p-4 rounded-lg bg-neutral-900 border ${card.borderColor} transition-colors hover:bg-neutral-800/60`}
                  >
                    <div
                      className={`w-10 h-10 shrink-0 rounded-lg ${card.bgIcon} flex items-center justify-center`}
                    >
                      <card.Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-400 truncate">
                        {card.label}
                      </p>
                      <p className={`text-lg font-semibold ${card.color}`}>
                        {value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upcoming Reservations */}
            {stats.upcomingReservations.length > 0 && (
              <div className="mb-6 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                  <h2 className="text-sm font-medium text-neutral-200">
                    Yaklaşan Rezervasyonlar (7 Gün)
                  </h2>
                  <Link
                    href="/casino/reservations"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Tümü <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <ul className="divide-y divide-neutral-800">
                  {stats.upcomingReservations.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/casino/reservations/${r.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-neutral-800/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-100 truncate">
                            {r.cabanaName}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
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
              </div>
            )}
          </>
        )}

        {/* Menu Cards - Grouped */}
        <div className="space-y-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-3">
                <group.Icon className={`w-5 h-5 ${group.color}`} />
                <h2
                  className={`text-sm font-semibold ${group.color} uppercase tracking-wider`}
                >
                  {group.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col gap-3 p-5 min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl hover:border-yellow-700/50 hover:bg-neutral-800/60 transition-all active:scale-[0.98] group"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}
                    >
                      <item.Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="font-medium text-neutral-100 group-hover:text-yellow-400 transition-colors">
                      {item.label}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {item.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Standalone items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STANDALONE_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col gap-3 p-5 min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl hover:border-yellow-700/50 hover:bg-neutral-800/60 transition-all active:scale-[0.98] group"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}
                >
                  <item.Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="font-medium text-neutral-100 group-hover:text-yellow-400 transition-colors">
                  {item.label}
                </span>
                <span className="text-xs text-neutral-400">
                  {item.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
