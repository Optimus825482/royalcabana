"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ReservationStatus } from "@/types";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Pencil,
  Sparkles,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ReservationItem {
  id: string;
  cabanaId: string;
  guestName: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  notes?: string;
  totalPrice?: number;
  createdAt: string;
  cabana: { id: string; name: string };
  statusHistory: Array<{
    toStatus: string;
    changedBy: string;
    createdAt: string;
    reason?: string;
  }>;
}

interface ReservationListResponse {
  reservations: ReservationItem[];
  total: number;
}

const STATUS_CONFIG: Record<
  ReservationStatus,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }
> = {
  [ReservationStatus.PENDING]: {
    label: "Bekliyor",
    Icon: Clock,
    badge: "bg-yellow-950/60 border-yellow-700/40 text-yellow-400",
  },
  [ReservationStatus.APPROVED]: {
    label: "Onaylı",
    Icon: CheckCircle2,
    badge: "bg-green-950/60 border-green-700/40 text-green-400",
  },
  [ReservationStatus.REJECTED]: {
    label: "Reddedildi",
    Icon: XCircle,
    badge: "bg-red-950/50 border-red-800/40 text-red-400",
  },
  [ReservationStatus.CANCELLED]: {
    label: "İptal",
    Icon: Ban,
    badge: "bg-neutral-800 border-neutral-700 text-neutral-500",
  },
  [ReservationStatus.MODIFICATION_PENDING]: {
    label: "Değişiklik Bekliyor",
    Icon: Pencil,
    badge: "bg-orange-950/50 border-orange-800/40 text-orange-400",
  },
  [ReservationStatus.EXTRA_PENDING]: {
    label: "Ek Konsept Bekliyor",
    Icon: Sparkles,
    badge: "bg-purple-950/50 border-purple-800/40 text-purple-400",
  },
};

const ALL_STATUSES = Object.values(ReservationStatus);

async function fetchMyReservations(): Promise<ReservationListResponse> {
  const res = await fetch("/api/reservations?limit=100");
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  return res.json();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function CasinoReservationsPage() {
  useSession({ required: true });

  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-reservations"],
    queryFn: fetchMyReservations,
  });

  const reservations = data?.reservations ?? [];

  const filtered = useMemo(() => {
    if (!statusFilter) return reservations;
    return reservations.filter((r) => r.status === statusFilter);
  }, [reservations, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reservations) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  }, [reservations]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-500 text-sm">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="bg-neutral-900 border border-red-800/40 rounded-xl px-8 py-6 text-center max-w-sm">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">Rezervasyonlar yüklenemedi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-amber-400 flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Rezervasyonlarım
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Toplam {reservations.length} rezervasyon
          </p>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-neutral-500" />
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              statusFilter === ""
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-neutral-800/50 border-neutral-700/50 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Tümü ({reservations.length})
          </button>
          {ALL_STATUSES.map((s) => {
            const count = statusCounts[s] ?? 0;
            if (count === 0) return null;
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  statusFilter === s
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : "bg-neutral-800/50 border-neutral-700/50 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Reservation list */}
        {filtered.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center">
            <CalendarDays className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              {statusFilter
                ? "Bu filtreye uygun rezervasyon bulunamadı."
                : "Henüz rezervasyonunuz bulunmuyor."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const cfg = STATUS_CONFIG[r.status];
              const StatusIcon = cfg.Icon;
              const isExpanded = expandedId === r.id;
              const nights = daysBetween(r.startDate, r.endDate);

              return (
                <div
                  key={r.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors"
                >
                  {/* Main row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="w-full text-left px-4 py-4 flex items-center gap-3"
                  >
                    <StatusIcon
                      className={`w-5 h-5 shrink-0 ${cfg.badge.includes("text-") ? cfg.badge.split(" ").find((c: string) => c.startsWith("text-")) : "text-neutral-400"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-neutral-100 text-sm">
                          {r.guestName}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                        <span>{r.cabana.name}</span>
                        <span>·</span>
                        <span>
                          {formatDate(r.startDate)} — {formatDate(r.endDate)}
                        </span>
                        <span>·</span>
                        <span>{nights} gece</span>
                      </div>
                    </div>
                    {r.totalPrice != null && (
                      <span className="text-sm font-semibold text-amber-400 shrink-0">
                        {r.totalPrice.toLocaleString("tr-TR")} ₺
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-neutral-800">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                        <div>
                          <span className="text-neutral-500 block mb-0.5">
                            Kabana
                          </span>
                          <span className="text-neutral-200">
                            {r.cabana.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block mb-0.5">
                            Başlangıç
                          </span>
                          <span className="text-neutral-200">
                            {formatDate(r.startDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block mb-0.5">
                            Bitiş
                          </span>
                          <span className="text-neutral-200">
                            {formatDate(r.endDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block mb-0.5">
                            Oluşturulma
                          </span>
                          <span className="text-neutral-200">
                            {formatDate(r.createdAt)}
                          </span>
                        </div>
                      </div>
                      {r.notes && (
                        <div className="mt-3 text-xs">
                          <span className="text-neutral-500">Notlar: </span>
                          <span className="text-neutral-300">{r.notes}</span>
                        </div>
                      )}
                      {r.statusHistory.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-neutral-500 block mb-2">
                            Durum Geçmişi
                          </span>
                          <div className="space-y-1.5">
                            {r.statusHistory.map((h, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs bg-neutral-800/60 rounded-lg px-3 py-2"
                              >
                                <span className="text-neutral-300">
                                  {h.toStatus}
                                </span>
                                <span className="text-neutral-600">
                                  {formatDate(h.createdAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
