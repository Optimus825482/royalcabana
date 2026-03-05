"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSSE } from "@/hooks/useSSE";
import { SSE_EVENTS } from "@/lib/sse-events";
import { ReservationStatus } from "@/types";
import {
  formatPrice,
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Pencil,
  Sparkles,
  LogIn,
  LogOut,
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
  _count?: {
    statusHistory: number;
    modifications: number;
    cancellations: number;
    extraConcepts: number;
    extraItems: number;
  };
}

interface ReservationDetail extends ReservationItem {
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
  [ReservationStatus.CHECKED_IN]: {
    label: "Giriş Yapıldı",
    Icon: LogIn,
    badge: "bg-teal-950/50 border-teal-700/40 text-teal-400",
  },
  [ReservationStatus.CHECKED_OUT]: {
    label: "Çıkış Yapıldı",
    Icon: LogOut,
    badge: "bg-slate-800 border-slate-700 text-slate-400",
  },
};

const ALL_STATUSES = Object.values(ReservationStatus);

async function fetchMyReservations(): Promise<ReservationListResponse> {
  const res = await fetch("/api/reservations?limit=100");
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
}

async function fetchReservationDetail(id: string): Promise<ReservationDetail> {
  const res = await fetch(`/api/reservations/${id}`);
  if (!res.ok) throw new Error("Detay yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<ReservationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Bildirimden tıklanınca gelen ?reservationId= ile detayı aç
  useEffect(() => {
    const id = searchParams.get("reservationId");
    if (!id) return;
    setExpandedId(id);
    setDetailLoading(true);
    fetchReservationDetail(id)
      .then((detail) => setExpandedDetail(detail))
      .catch(() => setExpandedDetail(null))
      .finally(() => setDetailLoading(false));
  }, [searchParams]);
  const [editingReservation, setEditingReservation] =
    useState<ReservationItem | null>(null);
  const [editForm, setEditForm] = useState({
    guestName: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-reservations"],
    queryFn: fetchMyReservations,
  });

  const handleSSEEvent = useCallback((event: string) => {
    if (
      event === SSE_EVENTS.RESERVATION_UPDATED ||
      event === SSE_EVENTS.RESERVATION_CREATED ||
      event === SSE_EVENTS.RESERVATION_APPROVED ||
      event === SSE_EVENTS.RESERVATION_REJECTED ||
      event === SSE_EVENTS.RESERVATION_CANCELLED ||
      event === SSE_EVENTS.RESERVATION_CHECKED_IN ||
      event === SSE_EVENTS.RESERVATION_CHECKED_OUT
    ) {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    }
  }, [queryClient]);

  useSSE({ onEvent: handleSSEEvent as (event: string, data: unknown) => void });

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

  function openEditModal(reservation: ReservationItem) {
    setEditingReservation(reservation);
    setEditForm({
      guestName: reservation.guestName,
      startDate: reservation.startDate.split("T")[0],
      endDate: reservation.endDate.split("T")[0],
      notes: reservation.notes ?? "",
    });
    setEditError("");
  }

  async function handlePendingUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingReservation) return;

    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(
        `/api/reservations/${editingReservation.id}/pending-update`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: editForm.guestName,
            startDate: editForm.startDate,
            endDate: editForm.endDate,
            notes: editForm.notes.trim() ? editForm.notes : null,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Rezervasyon talebi güncellenemedi.");
      }

      setEditingReservation(null);
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "Rezervasyon talebi güncellenemedi.",
      );
    } finally {
      setEditLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-500 text-sm">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center">
        <div className="bg-neutral-900 border border-red-800/40 rounded-xl px-8 py-6 text-center max-w-sm">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">
            {(error as Error)?.message ?? "Rezervasyonlar yüklenemedi."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center">
        <div className="bg-neutral-900 border border-red-800/40 rounded-xl px-8 py-6 text-center max-w-sm">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">Rezervasyonlar yüklenemedi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
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

        {/* Status filter chips — touch-friendly */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
          <button
            onClick={() => setStatusFilter("")}
            className={`min-h-[44px] px-4 py-2.5 text-sm rounded-xl border transition-colors touch-manipulation active:scale-[0.98] ${
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
                className={`min-h-[44px] px-4 py-2.5 text-sm rounded-xl border transition-colors touch-manipulation active:scale-[0.98] ${
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
                    onClick={async () => {
                      if (isExpanded) {
                        setExpandedId(null);
                        setExpandedDetail(null);
                      } else {
                        setExpandedId(r.id);
                        setDetailLoading(true);
                        try {
                          const detail = await fetchReservationDetail(r.id);
                          setExpandedDetail(detail);
                        } catch {
                          setExpandedDetail(null);
                        }
                        setDetailLoading(false);
                      }
                    }}
                    className="w-full text-left px-4 py-4 min-h-[48px] flex items-center gap-3 touch-manipulation active:bg-neutral-800/50"
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
                        {formatPrice(r.totalPrice!, currency)}
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
                            Cabana
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
                      {r.status === ReservationStatus.PENDING && (
                        <div className="mt-3 pt-3 border-t border-neutral-800">
                          <button
                            onClick={() => openEditModal(r)}
                            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-600/20 border border-amber-700/30 text-amber-300 text-sm hover:bg-amber-600/30 active:bg-amber-600/40 transition-colors touch-manipulation"
                          >
                            <Pencil className="w-4 h-4 shrink-0" />
                            Talebi Güncelle
                          </button>
                        </div>
                      )}
                      {detailLoading && expandedId === r.id ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                          <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          Durum geçmişi yükleniyor...
                        </div>
                      ) : expandedDetail && expandedDetail.id === r.id && expandedDetail.statusHistory.length > 0 ? (
                        <div className="mt-3">
                          <span className="text-xs text-neutral-500 block mb-2">
                            Durum Geçmişi
                          </span>
                          <div className="space-y-1.5">
                            {expandedDetail.statusHistory.map((h, i) => (
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
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingReservation && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setEditingReservation(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle for mobile */}
            <div className="flex justify-center pt-2 pb-0 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
              <h2 className="text-base font-semibold text-amber-400">
                Bekleyen Talebi Güncelle
              </h2>
              <button
                onClick={() => setEditingReservation(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-800 active:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors touch-manipulation"
                aria-label="Kapat"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePendingUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Misafir Adı
                </label>
                <input
                  type="text"
                  minLength={2}
                  required
                  value={editForm.guestName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      guestName: e.target.value,
                    }))
                  }
                  title="Misafir adı"
                  className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 text-base focus:outline-none focus:border-amber-500 touch-manipulation"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    Başlangıç
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.startDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    title="Başlangıç tarihi"
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 text-base focus:outline-none focus:border-amber-500 touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    Bitiş
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.endDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    title="Bitiş tarihi"
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 text-base focus:outline-none focus:border-amber-500 touch-manipulation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Notlar
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  title="Rezervasyon notları"
                  placeholder="Opsiyonel not"
                  className="w-full min-h-24 px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-100 resize-none focus:outline-none focus:border-amber-500"
                />
              </div>

              {editError && (
                <div className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReservation(null)}
                  className="min-h-[48px] px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 text-sm touch-manipulation"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="min-h-[48px] px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 text-neutral-950 font-semibold text-sm touch-manipulation"
                >
                  {editLoading ? "Kaydediliyor..." : "Güncelle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
