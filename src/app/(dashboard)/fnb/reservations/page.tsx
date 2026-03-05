"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSSE } from "@/hooks/useSSE";
import { SSE_EVENTS } from "@/lib/sse-events";
import {
  LogIn,
  LogOut,
  Clock,
  MapPin,
  User,
  Calendar,
  Search,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Timer,
  Sunrise,
  Filter,
} from "lucide-react";
import ReservationDetailModal, {
  type ReservationDetailData,
} from "@/components/calendar/ReservationDetailModal";
import {
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import { SkeletonCard } from "@/components/atoms/Skeleton";

// ── Types ──

interface TodayReservation {
  id: string;
  cabanaId: string;
  guestName: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
  totalPrice: number | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  conceptId: string | null;
  cabana: {
    id: string;
    name: string;
    cabanaClass?: { id: string; name: string } | null;
  };
  concept?: { id: string; name: string } | null;
  user?: { id: string; username: string };
  guest?: { id: string; name: string; vipLevel: string } | null;
  statusHistory: Array<{
    toStatus: string;
    changedBy: string;
    createdAt: string;
    reason?: string;
  }>;
  _count?: {
    statusHistory: number;
    modifications: number;
    cancellations: number;
    extraConcepts: number;
    extraItems: number;
    extraRequests: number;
  };
}

// ── Constants ──

type FilterKey = "ALL" | "APPROVED" | "CHECKED_IN" | "CHECKED_OUT";

const FILTER_TABS: { key: FilterKey; label: string; icon: typeof Clock }[] = [
  { key: "ALL", label: "Tümü", icon: Calendar },
  { key: "APPROVED", label: "Bekliyor", icon: Timer },
  { key: "CHECKED_IN", label: "Giriş Yapıldı", icon: LogIn },
  { key: "CHECKED_OUT", label: "Çıkış Yapıldı", icon: LogOut },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  APPROVED: { label: "Giriş Bekliyor", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", dot: "bg-amber-400" },
  CHECKED_IN: { label: "Giriş Yapıldı", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/25", dot: "bg-teal-400" },
  CHECKED_OUT: { label: "Çıkış Yapıldı", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/25", dot: "bg-slate-400" },
  PENDING: { label: "Onay Bekliyor", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", dot: "bg-yellow-400" },
  REJECTED: { label: "Reddedildi", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", dot: "bg-red-400" },
  CANCELLED: { label: "İptal", color: "text-neutral-400", bg: "bg-neutral-500/10", border: "border-neutral-500/25", dot: "bg-neutral-500" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, color: "text-neutral-400", bg: "bg-neutral-500/10", border: "border-neutral-500/25", dot: "bg-neutral-500" };
}

// ── Fetcher ──

async function fetchTodayReservations(): Promise<TodayReservation[]> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const statuses = ["APPROVED", "CHECKED_IN", "CHECKED_OUT"];
  const results = await Promise.all(
    statuses.map((s) =>
      fetch(`/api/reservations?status=${s}&limit=100`)
        .then((r) => r.json())
        .then((json) => {
          const data = json.data ?? json;
          return Array.isArray(data.reservations) ? data.reservations : [];
        })
        .catch(() => [])
    )
  );

  const all: TodayReservation[] = results.flat();

  return all.filter((r) => {
    const start = r.startDate.split("T")[0];
    const end = r.endDate.split("T")[0];
    return start <= todayStr && end >= todayStr;
  });
}

// ── Summary Stats ──

function ReservationStats({ reservations }: { reservations: TodayReservation[] }) {
  const stats = useMemo(() => {
    let approved = 0, checkedIn = 0, checkedOut = 0;
    for (const r of reservations) {
      if (r.status === "APPROVED") approved++;
      else if (r.status === "CHECKED_IN") checkedIn++;
      else if (r.status === "CHECKED_OUT") checkedOut++;
    }
    return { total: reservations.length, approved, checkedIn, checkedOut };
  }, [reservations]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Toplam" value={stats.total} color="text-neutral-100" icon={Calendar} />
      <StatCard label="Giriş Bekliyor" value={stats.approved} color="text-amber-400" icon={Timer} />
      <StatCard label="Aktif (Giriş)" value={stats.checkedIn} color="text-teal-400" icon={LogIn} />
      <StatCard label="Çıkış Yapıldı" value={stats.checkedOut} color="text-slate-400" icon={LogOut} />
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: typeof Clock }) {
  return (
    <div className="bg-neutral-900/80 border border-neutral-800/60 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color} opacity-60`} />
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color} tabular-nums`}>{value}</p>
    </div>
  );
}

// ── Reservation Card ──

function ReservationCard({
  reservation,
  onSelect,
  onQuickAction,
  isActioning,
}: {
  reservation: TodayReservation;
  onSelect: () => void;
  onQuickAction: (id: string, action: "check-in" | "check-out") => void;
  isActioning: boolean;
}) {
  const cfg = getStatusConfig(reservation.status);
  const isApproved = reservation.status === "APPROVED";
  const isCheckedIn = reservation.status === "CHECKED_IN";
  const isCheckedOut = reservation.status === "CHECKED_OUT";
  const vipLevel = reservation.guest?.vipLevel;
  const isVip = vipLevel && vipLevel !== "STANDARD";

  return (
    <div
      className={`group relative bg-neutral-900/80 border rounded-xl overflow-hidden transition-all duration-200 hover:border-neutral-600/60 active:bg-neutral-800/80 cursor-pointer touch-manipulation ${
        isCheckedIn ? "border-teal-500/25" : isApproved ? "border-amber-500/20" : "border-neutral-800/60"
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(); }}
    >
      {/* Status bar */}
      <div className={`h-0.5 ${isCheckedIn ? "bg-teal-500" : isApproved ? "bg-amber-500" : isCheckedOut ? "bg-slate-500" : "bg-neutral-700"}`} />

      <div className="p-4">
        {/* Header: Cabana + Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isCheckedIn ? "bg-teal-500/15" : "bg-amber-500/15"}`}>
              <MapPin className={`w-4 h-4 ${isCheckedIn ? "text-teal-400" : "text-amber-400"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-100 truncate">
                {reservation.cabana.name}
              </p>
              {reservation.cabana.cabanaClass && (
                <p className="text-[10px] text-neutral-600">{reservation.cabana.cabanaClass.name}</p>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${isCheckedIn ? "animate-pulse" : ""}`} />
            {cfg.label}
          </span>
        </div>

        {/* Guest info */}
        <div className="flex items-center gap-2 mb-2">
          <User className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
          <span className="text-xs text-neutral-300 truncate">{reservation.guestName}</span>
          {isVip && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-600/15 text-amber-300 border border-amber-600/20 font-medium flex-shrink-0">
              VIP {vipLevel}
            </span>
          )}
        </div>

        {/* Check-in time if available */}
        {reservation.checkInAt && (
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
            <span className="text-[11px] text-neutral-500">
              Giriş: {new Date(reservation.checkInAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {reservation.checkOutAt && (
              <span className="text-[11px] text-neutral-500">
                · Çıkış: {new Date(reservation.checkOutAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}

        {/* Concept */}
        {reservation.concept && (
          <div className="flex items-center gap-2 mb-3">
            <Sunrise className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
            <span className="text-[11px] text-neutral-500">{reservation.concept.name}</span>
          </div>
        )}

        {/* Notes preview */}
        {reservation.notes && (
          <p className="text-[10px] text-neutral-600 truncate mb-3 pl-5">
            {reservation.notes}
          </p>
        )}

        {/* Quick Actions — thumb-zone, 48px targets */}
        <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {isApproved && (
            <button
              onClick={() => onQuickAction(reservation.id, "check-in")}
              disabled={isActioning}
              className="flex-1 min-h-[48px] flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white transition-colors touch-manipulation"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              Check-in
            </button>
          )}
          {isCheckedIn && (
            <button
              onClick={() => onQuickAction(reservation.id, "check-out")}
              disabled={isActioning}
              className="flex-1 min-h-[48px] flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl bg-slate-600 hover:bg-slate-500 active:bg-slate-700 disabled:opacity-50 text-white transition-colors touch-manipulation"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Check-out
            </button>
          )}
          {isCheckedOut && (
            <div className="flex items-center gap-2 px-3 py-2.5 min-h-[48px] text-sm text-slate-400 items-center">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Tamamlandı
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="min-h-[48px] flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-300 rounded-xl hover:bg-neutral-800 active:bg-neutral-700 transition-colors touch-manipulation"
          >
            Detay <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton (design system token-based) ──

function ReservationsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} className="h-52 min-h-0" />
      ))}
    </div>
  );
}

// ── Main Page ──

export default function FnbReservationsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetailData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Bildirimden tıklanınca gelen ?reservationId= ile detayı aç
  useEffect(() => {
    const id = searchParams.get("reservationId");
    if (!id) return;
    fetch(`/api/reservations/${id}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((json) => setSelectedReservation(json.data ?? json))
      .catch(() => {});
  }, [searchParams]);

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const { data: reservations = [], isLoading, isError } = useQuery({
    queryKey: ["fnb-today-reservations"],
    queryFn: fetchTodayReservations,
    refetchInterval: 30_000,
  });

  const handleSSE = useCallback(
    (event: string) => {
      if (
        event === SSE_EVENTS.RESERVATION_UPDATED ||
        event === SSE_EVENTS.RESERVATION_CHECKED_IN ||
        event === SSE_EVENTS.RESERVATION_CHECKED_OUT ||
        event === SSE_EVENTS.RESERVATION_CREATED
      ) {
        queryClient.invalidateQueries({ queryKey: ["fnb-today-reservations"] });
      }
    },
    [queryClient],
  );
  useSSE({ onEvent: handleSSE as (event: string, data: unknown) => void });

  const filtered = useMemo(() => {
    let list = reservations;
    if (filter !== "ALL") list = list.filter((r) => r.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.guestName.toLowerCase().includes(q) ||
          r.cabana.name.toLowerCase().includes(q),
      );
    }
    // Sort: APPROVED first, then CHECKED_IN, then CHECKED_OUT
    const order: Record<string, number> = { APPROVED: 0, CHECKED_IN: 1, CHECKED_OUT: 2 };
    return [...list].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [reservations, filter, searchQuery]);

  const handleQuickAction = useCallback(async (id: string, action: "check-in" | "check-out") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["fnb-today-reservations"] });
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }, [queryClient]);

  const handleSelectReservation = useCallback(async (r: TodayReservation) => {
    try {
      const res = await fetch(`/api/reservations/${r.id}`);
      if (res.ok) {
        const json = await res.json();
        const detail = json.data ?? json;
        setSelectedReservation(detail);
      }
    } catch {
      // fallback: use the card data
      setSelectedReservation({
        id: r.id,
        cabanaId: r.cabanaId,
        guestName: r.guestName,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status as ReservationDetailData["status"],
        notes: r.notes ?? undefined,
        totalPrice: r.totalPrice ?? undefined,
        conceptId: r.conceptId,
        concept: r.concept ?? null,
        cabana: r.cabana,
        user: r.user,
        statusHistory: r.statusHistory ?? [],
      });
    }
  }, []);

  const todayStr = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-100 tracking-tight">Günün Rezervasyonları</h1>
            <p className="text-xs text-neutral-500 mt-0.5 capitalize">{todayStr}</p>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Misafir veya cabana ara..."
              className="w-full sm:w-64 min-h-[44px] pl-9 pr-3 py-2.5 text-base sm:text-sm bg-neutral-900/60 border border-neutral-800/60 rounded-xl text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500/40 transition-all touch-manipulation"
            />
          </div>
        </div>

        {/* Stats */}
        {!isLoading && !isError && <ReservationStats reservations={reservations} />}

        {/* Filter Tabs — touch-friendly */}
        <div className="flex flex-wrap items-center gap-2 bg-neutral-900/50 border border-neutral-800/40 rounded-xl p-2">
          <Filter className="w-4 h-4 text-neutral-600 flex-shrink-0" />
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key;
            const cfg = tab.key !== "ALL" ? STATUS_CONFIG[tab.key] : null;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-xl transition-all touch-manipulation active:scale-[0.98] ${
                  active
                    ? cfg
                      ? `${cfg.bg} ${cfg.color} ${cfg.border} border`
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {isLoading && <ReservationsSkeleton />}

        {/* Error */}
        {isError && (
          <div className="text-center py-12">
            <XCircle className="w-10 h-10 text-red-500/40 mx-auto mb-2" />
            <p className="text-sm text-red-400">Rezervasyonlar yüklenirken hata oluştu.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-neutral-800 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">
              {filter !== "ALL"
                ? `"${FILTER_TABS.find((t) => t.key === filter)?.label}" durumunda rezervasyon bulunamadı.`
                : searchQuery
                  ? "Aramayla eşleşen rezervasyon bulunamadı."
                  : "Bugün için aktif rezervasyon bulunmuyor."}
            </p>
          </div>
        )}

        {/* Reservation cards */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onSelect={() => handleSelectReservation(r)}
                onQuickAction={handleQuickAction}
                isActioning={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onAction={() => {
            queryClient.invalidateQueries({ queryKey: ["fnb-today-reservations"] });
            setSelectedReservation(null);
          }}
          currency={currency}
          showActions={true}
        />
      )}
    </div>
  );
}
