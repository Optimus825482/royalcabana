"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronRight, FileCode2 } from "lucide-react";

// ── Types ──

interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  roles: string[];
}

interface ApiGroup {
  name: string;
  endpoints: ApiEndpoint[];
}

// ── Data ──

const API_GROUPS: ApiGroup[] = [
  {
    name: "Kimlik Doğrulama",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/login",
        description: "Kullanıcı girişi",
        roles: ["Herkese Açık"],
      },
      {
        method: "POST",
        path: "/api/auth/logout",
        description: "Oturum kapatma",
        roles: ["Tüm Roller"],
      },
      {
        method: "GET",
        path: "/api/auth/session",
        description: "Aktif oturum bilgisi",
        roles: ["Tüm Roller"],
      },
    ],
  },
  {
    name: "Kabanalar",
    endpoints: [
      {
        method: "GET",
        path: "/api/cabanas",
        description: "Tüm kabanaları listele",
        roles: ["Tüm Roller"],
      },
      {
        method: "POST",
        path: "/api/cabanas",
        description: "Yeni kabana oluştur",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "GET",
        path: "/api/cabanas/[id]",
        description: "Kabana detayı",
        roles: ["Tüm Roller"],
      },
      {
        method: "PATCH",
        path: "/api/cabanas/[id]",
        description: "Kabana güncelle",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "DELETE",
        path: "/api/cabanas/[id]",
        description: "Kabana sil",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "GET",
        path: "/api/cabanas/[id]/qr",
        description: "Kabana QR kodu URL'si",
        roles: ["SYSTEM_ADMIN", "ADMIN"],
      },
    ],
  },
  {
    name: "Kabana Sınıfları",
    endpoints: [
      {
        method: "GET",
        path: "/api/cabana-classes",
        description: "Tüm sınıfları listele",
        roles: ["Tüm Roller"],
      },
      {
        method: "POST",
        path: "/api/cabana-classes",
        description: "Yeni sınıf oluştur",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "PATCH",
        path: "/api/cabana-classes/[id]",
        description: "Sınıf güncelle",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "DELETE",
        path: "/api/cabana-classes/[id]",
        description: "Sınıf sil",
        roles: ["SYSTEM_ADMIN"],
      },
    ],
  },
  {
    name: "Konseptler",
    endpoints: [
      {
        method: "GET",
        path: "/api/concepts",
        description: "Tüm konseptleri listele",
        roles: ["Tüm Roller"],
      },
      {
        method: "POST",
        path: "/api/concepts",
        description: "Yeni konsept oluştur",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "PATCH",
        path: "/api/concepts/[id]",
        description: "Konsept güncelle",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "DELETE",
        path: "/api/concepts/[id]",
        description: "Konsept sil",
        roles: ["SYSTEM_ADMIN"],
      },
    ],
  },
  {
    name: "Rezervasyonlar",
    endpoints: [
      {
        method: "GET",
        path: "/api/reservations",
        description: "Rezervasyonları listele (filtreli)",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "POST",
        path: "/api/reservations",
        description: "Yeni rezervasyon talebi",
        roles: ["CASINO_USER"],
      },
      {
        method: "GET",
        path: "/api/reservations/[id]",
        description: "Rezervasyon detayı",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "PATCH",
        path: "/api/reservations/[id]",
        description: "Rezervasyon güncelle",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "POST",
        path: "/api/reservations/[id]/approve",
        description: "Rezervasyon onayla",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "POST",
        path: "/api/reservations/[id]/reject",
        description: "Rezervasyon reddet",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "POST",
        path: "/api/reservations/[id]/check-in",
        description: "Check-in yap",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "POST",
        path: "/api/reservations/[id]/check-out",
        description: "Check-out yap",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "POST",
        path: "/api/reservations/[id]/modify",
        description: "Değişiklik talebi",
        roles: ["CASINO_USER"],
      },
      {
        method: "POST",
        path: "/api/reservations/[id]/cancel",
        description: "İptal talebi",
        roles: ["CASINO_USER"],
      },
      {
        method: "POST",
        path: "/api/reservations/[id]/extra-concept",
        description: "Ekstra konsept talebi",
        roles: ["CASINO_USER"],
      },
    ],
  },
  {
    name: "Ürünler",
    endpoints: [
      {
        method: "GET",
        path: "/api/products",
        description: "Tüm ürünleri listele",
        roles: ["Tüm Roller"],
      },
      {
        method: "POST",
        path: "/api/products",
        description: "Yeni ürün oluştur",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "PATCH",
        path: "/api/products/[id]",
        description: "Ürün güncelle",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        method: "DELETE",
        path: "/api/products/[id]",
        description: "Ürün sil",
        roles: ["SYSTEM_ADMIN"],
      },
    ],
  },
  {
    name: "Misafirler",
    endpoints: [
      {
        method: "GET",
        path: "/api/guests",
        description: "Misafir listesi",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "POST",
        path: "/api/guests",
        description: "Yeni misafir ekle",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "GET",
        path: "/api/guests/[id]",
        description: "Misafir detayı",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "PATCH",
        path: "/api/guests/[id]",
        description: "Misafir güncelle",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "DELETE",
        path: "/api/guests/[id]",
        description: "Misafir sil",
        roles: ["SYSTEM_ADMIN"],
      },
    ],
  },
  {
    name: "F&B Siparişler",
    endpoints: [
      {
        method: "GET",
        path: "/api/fnb/orders",
        description: "Sipariş listesi",
        roles: ["ADMIN", "SYSTEM_ADMIN", "FNB_USER"],
      },
      {
        method: "POST",
        path: "/api/fnb/orders",
        description: "Yeni sipariş oluştur",
        roles: ["FNB_USER"],
      },
      {
        method: "GET",
        path: "/api/fnb/orders/[id]",
        description: "Sipariş detayı",
        roles: ["ADMIN", "SYSTEM_ADMIN", "FNB_USER"],
      },
      {
        method: "PATCH",
        path: "/api/fnb/orders/[id]",
        description: "Sipariş durumu güncelle",
        roles: ["FNB_USER"],
      },
    ],
  },
  {
    name: "Fiyatlandırma",
    endpoints: [
      {
        method: "GET",
        path: "/api/pricing/ranges",
        description: "Sezonluk fiyat aralıkları",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "POST",
        path: "/api/pricing/ranges",
        description: "Fiyat aralığı oluştur",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "DELETE",
        path: "/api/pricing/ranges/[id]",
        description: "Fiyat aralığı sil",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
    ],
  },
  {
    name: "Personel",
    endpoints: [
      {
        method: "GET",
        path: "/api/staff",
        description: "Personel listesi",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "POST",
        path: "/api/staff",
        description: "Yeni personel ekle",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "PATCH",
        path: "/api/staff/[id]",
        description: "Personel güncelle",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "DELETE",
        path: "/api/staff/[id]",
        description: "Personel sil",
        roles: ["SYSTEM_ADMIN"],
      },
    ],
  },
  {
    name: "Bildirimler",
    endpoints: [
      {
        method: "GET",
        path: "/api/notifications",
        description: "Bildirim listesi",
        roles: ["Tüm Roller"],
      },
      {
        method: "PATCH",
        path: "/api/notifications/[id]/read",
        description: "Bildirimi okundu işaretle",
        roles: ["Tüm Roller"],
      },
      {
        method: "POST",
        path: "/api/notifications/read-all",
        description: "Tümünü okundu işaretle",
        roles: ["Tüm Roller"],
      },
    ],
  },
  {
    name: "Raporlar",
    endpoints: [
      {
        method: "GET",
        path: "/api/reports/occupancy",
        description: "Doluluk raporu",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "GET",
        path: "/api/reports/revenue",
        description: "Gelir raporu",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "GET",
        path: "/api/casino/stats",
        description: "Casino istatistikleri",
        roles: ["CASINO_USER"],
      },
    ],
  },
  {
    name: "Hava Durumu",
    endpoints: [
      {
        method: "GET",
        path: "/api/weather",
        description: "Güncel hava durumu (30dk cache)",
        roles: ["Tüm Roller"],
      },
    ],
  },
  {
    name: "Değerlendirmeler",
    endpoints: [
      {
        method: "GET",
        path: "/api/reviews",
        description: "Değerlendirme listesi",
        roles: ["ADMIN", "SYSTEM_ADMIN", "CASINO_USER"],
      },
      {
        method: "POST",
        path: "/api/reviews",
        description: "Yeni değerlendirme",
        roles: ["CASINO_USER"],
      },
      {
        method: "PATCH",
        path: "/api/reviews/[id]",
        description: "Değerlendirme güncelle",
        roles: ["CASINO_USER"],
      },
      {
        method: "DELETE",
        path: "/api/reviews/[id]",
        description: "Değerlendirme sil",
        roles: ["CASINO_USER", "ADMIN", "SYSTEM_ADMIN"],
      },
    ],
  },
  {
    name: "Sistem Ayarları",
    endpoints: [
      {
        method: "GET",
        path: "/api/system/cancellation-policy",
        description: "İptal politikası",
        roles: ["ADMIN", "SYSTEM_ADMIN"],
      },
      {
        method: "PATCH",
        path: "/api/system/cancellation-policy",
        description: "İptal politikası güncelle",
        roles: ["SYSTEM_ADMIN"],
      },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
};

// ── Component ──

export default function ApiDocsPage() {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(API_GROUPS.map((g) => g.name)),
  );

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const lowerSearch = search.toLowerCase();
  const filteredGroups = API_GROUPS.map((group) => ({
    ...group,
    endpoints: group.endpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(lowerSearch) ||
        ep.description.toLowerCase().includes(lowerSearch) ||
        ep.method.toLowerCase().includes(lowerSearch) ||
        ep.roles.some((r) => r.toLowerCase().includes(lowerSearch)),
    ),
  })).filter((g) => g.endpoints.length > 0);

  const totalEndpoints = API_GROUPS.reduce(
    (sum, g) => sum + g.endpoints.length,
    0,
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <FileCode2 className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-semibold text-amber-400">
              API Dokümantasyonu
            </h1>
          </div>
          <p className="text-sm text-neutral-400">
            {API_GROUPS.length} kategori · {totalEndpoints} endpoint
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Endpoint, açıklama veya rol ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 focus:border-amber-600 text-neutral-100 rounded-lg pl-10 pr-4 py-3 text-sm outline-none transition-colors placeholder:text-neutral-600"
          />
        </div>

        {/* Groups */}
        <div className="space-y-2">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.name);
            return (
              <div
                key={group.name}
                className="rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full min-h-[44px] flex items-center justify-between px-4 py-3 hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    )}
                    <span className="text-sm font-medium text-neutral-100">
                      {group.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      ({group.endpoints.length})
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-neutral-800">
                    {group.endpoints.map((ep, idx) => (
                      <div
                        key={`${ep.method}-${ep.path}-${idx}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors"
                      >
                        <span
                          className={`inline-flex items-center justify-center w-16 shrink-0 text-[10px] font-bold px-2 py-1 rounded border ${METHOD_COLORS[ep.method]}`}
                        >
                          {ep.method}
                        </span>
                        <code className="text-xs text-neutral-300 font-mono flex-1 min-w-0 truncate">
                          {ep.path}
                        </code>
                        <span className="text-xs text-neutral-500 sm:w-48 shrink-0">
                          {ep.description}
                        </span>
                        <div className="flex flex-wrap gap-1 sm:w-48 shrink-0">
                          {ep.roles.map((role) => (
                            <span
                              key={role}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredGroups.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">
              Eşleşen endpoint bulunamadı.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
