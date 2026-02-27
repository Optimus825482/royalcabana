"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import WeatherWidget from "@/components/shared/WeatherWidget";
import {
  Users,
  Layers,
  Package,
  Map,
  Settings,
  DollarSign,
  Lightbulb,
  User as UserIcon,
  ScrollText,
  Shield,
  CalendarOff,
  UserCog,
  Warehouse,
  QrCode,
  FileCode,
  BarChart3,
  CalendarCheck,
  Clock,
  TrendingUp,
  UserCheck,
  Package as PackageIcon,
  Percent,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MenuItem = {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
};

type MenuGroup = {
  title: string;
  Icon: LucideIcon;
  color: string;
  items: MenuItem[];
};

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

/* ------------------------------------------------------------------ */
/*  KPI card config                                                    */
/* ------------------------------------------------------------------ */

interface KpiCard {
  key: keyof SystemStats;
  label: string;
  Icon: LucideIcon;
  color: string; // tailwind text color
  bg: string; // tailwind bg for icon wrapper
  format?: "percent";
}

const KPI_CARDS: KpiCard[] = [
  {
    key: "occupancyRate",
    label: "Doluluk Oranı",
    Icon: Percent,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    format: "percent",
  },
  {
    key: "pendingRequests",
    label: "Bekleyen Talepler",
    Icon: Clock,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    key: "approvedThisMonth",
    label: "Bu Ay Onaylanan",
    Icon: CalendarCheck,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    key: "checkedInToday",
    label: "Bugün Check-in",
    Icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "activeUsers",
    label: "Aktif Kullanıcılar",
    Icon: UserCheck,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    key: "totalStaff",
    label: "Toplam Personel",
    Icon: PackageIcon,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
  },
];

/* ------------------------------------------------------------------ */
/*  Menu data (unchanged)                                              */
/* ------------------------------------------------------------------ */

const MENU_GROUPS: MenuGroup[] = [
  {
    title: "Tanımlar",
    Icon: Layers,
    color: "text-blue-400",
    items: [
      {
        href: "/system-admin/classes",
        label: "Kabana Sınıfları",
        description: "Sınıf tanımlarını yönet",
        Icon: Layers,
      },
      {
        href: "/system-admin/concepts",
        label: "Konseptler",
        description: "Konsept ve ürün paketlerini yönet",
        Icon: Lightbulb,
      },
      {
        href: "/system-admin/products",
        label: "Ürünler",
        description: "Ürün ve grup tanımlamalarını yönet",
        Icon: Package,
      },
      {
        href: "/system-admin/products/stock",
        label: "Stok Takibi",
        description: "Ürün stok miktarlarını ve minimum stok uyarılarını yönet",
        Icon: Warehouse,
      },
      {
        href: "/system-admin/task-definitions",
        label: "Görev Tanımları",
        description: "Personele atanacak görev şablonlarını tanımla ve yönet",
        Icon: ClipboardList,
      },
    ],
  },
  {
    title: "Fiyatlandırma",
    Icon: DollarSign,
    color: "text-emerald-400",
    items: [
      {
        href: "/system-admin/products/pricing",
        label: "Fiyat İşlemleri",
        description: "Toplu fiyat güncelleme, içe aktarma ve fiyat geçmişi",
        Icon: DollarSign,
      },
      {
        href: "/system-admin/cancellation-policy",
        label: "İptal Politikası",
        description: "Rezervasyon iptal kurallarını ve ceza oranlarını yönet",
        Icon: Shield,
      },
    ],
  },
  {
    title: "Kullanıcılar",
    Icon: Users,
    color: "text-amber-400",
    items: [
      {
        href: "/system-admin/users",
        label: "Kullanıcı Yönetimi",
        description: "Kullanıcıları görüntüle, ekle ve düzenle",
        Icon: Users,
      },
      {
        href: "/system-admin/guests",
        label: "Misafir Yönetimi",
        description: "Misafir veritabanını yönet, VIP ve kara liste takibi",
        Icon: UserIcon,
      },
      {
        href: "/system-admin/staff",
        label: "Personel Yönetimi",
        description: "Personel, görev atamaları ve iş takibini yönet",
        Icon: UserCog,
      },
    ],
  },
  {
    title: "Sistem",
    Icon: Settings,
    color: "text-purple-400",
    items: [
      {
        href: "/system-admin/system-control",
        label: "Sistem Kontrolü",
        description: "Sistem ayarlarını ve konfigürasyonu yönet",
        Icon: Settings,
      },
      {
        href: "/system-admin/blackout-dates",
        label: "Kapalı Tarihler",
        description: "Kabana kapalı tarihlerini ve bakım dönemlerini yönet",
        Icon: CalendarOff,
      },
      {
        href: "/system-admin/qr-codes",
        label: "QR Kodlar",
        description: "Kabana QR kodlarını oluştur ve yönet",
        Icon: QrCode,
      },
      {
        href: "/system-admin/audit-trail",
        label: "Audit Log",
        description: "Sistem işlem geçmişini görüntüle",
        Icon: ScrollText,
      },
      {
        href: "/system-admin/api-docs",
        label: "API Dokümantasyonu",
        description:
          "Sistem API endpoint'lerini ve kullanım kılavuzunu görüntüle",
        Icon: FileCode,
      },
    ],
  },
];

const STANDALONE_ITEMS: MenuItem[] = [
  {
    href: "/system-admin/map",
    label: "Kabana Haritası",
    description: "Kabanaları harita üzerinde yönet",
    Icon: Map,
  },
  {
    href: "/reports",
    label: "Raporlar",
    description: "Doluluk, gelir ve talep istatistiklerini görüntüle",
    Icon: BarChart3,
  },
];

/* ------------------------------------------------------------------ */
/*  KPI skeleton loader                                                */
/* ------------------------------------------------------------------ */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-16 rounded bg-neutral-800" />
              <div className="h-3 w-24 rounded bg-neutral-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function formatKpiValue(value: number, format?: "percent") {
  if (format === "percent") return `%${value}`;
  return value.toLocaleString("tr-TR");
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function SystemAdminDashboard() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ["system-admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/system-admin/stats");
      if (!res.ok) throw new Error("Stats fetch failed");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-yellow-400">
              Sistem Yönetimi
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Yönetmek istediğiniz modülü seçin
            </p>
          </div>
          <div className="hidden sm:block">
            <WeatherWidget />
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-8">
          {isLoading || !stats ? (
            <KpiSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {KPI_CARDS.map((card) => (
                <div
                  key={card.key}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 transition-colors hover:border-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-lg ${card.bg} flex items-center justify-center`}
                    >
                      <card.Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-neutral-100 leading-tight">
                        {formatKpiValue(stats[card.key], card.format)}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">
                        {card.label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grouped sections */}
        <div className="space-y-6 mb-6">
          {MENU_GROUPS.map((group) => (
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
                    className="flex items-start gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-yellow-700/50 hover:bg-neutral-800/60 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                      <item.Icon className="w-4.5 h-4.5 text-neutral-400 group-hover:text-yellow-400 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm text-neutral-100 group-hover:text-yellow-400 transition-colors">
                        {item.label}
                      </span>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Standalone items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STANDALONE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-yellow-700/50 hover:bg-neutral-800/60 transition-all active:scale-[0.98] group"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                <item.Icon className="w-4.5 h-4.5 text-neutral-400 group-hover:text-yellow-400 transition-colors" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-sm text-neutral-100 group-hover:text-yellow-400 transition-colors">
                  {item.label}
                </span>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
