"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  ArrowUpDown,
  Eye,
  X,
  RefreshCw,
} from "lucide-react";
import { ReservationStatus } from "@/types";
import {
  formatPrice,
  fetchSystemCurrency,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from "@/lib/currency";
import PermissionGate from "@/components/shared/PermissionGate";
import {
  successBtnCls,
  dangerBtnCls,
  dangerSoftBtnCls,
  infoBtnCls,
} from "@/components/shared/FormComponents";
import { useSSE } from "@/hooks/useSSE";
import { SSE_EVENTS } from "@/lib/sse-events";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReservationListItem {
  id: string;
  guestName: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  totalPrice: string | number | null;
  notes: string | null;
  rejectionReason: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  createdAt: string;
  updatedAt: string;
  cabana: { id: string; name: string };
  user: { id: string; username: string; email: string };
  _count?: {
    statusHistory: number;
    modifications: number;
    cancellations: number;
    extraConcepts: number;
    extraItems: number;
  };
}

interface ReservationDetail extends ReservationListItem {
  statusHistory?: StatusHistoryItem[];
  modifications?: {
    id: string;
    status: string;
    newStartDate?: string;
    newEndDate?: string;
    newGuestName?: string;
  }[];
  cancellations?: { id: string; status: string; reason?: string }[];
  extraConcepts?: { id: string; status: string; items?: unknown }[];
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

interface ReservationListResponse {
  reservations: ReservationListItem[];
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  PENDING: {
    label: "Beklemede",
    bg: "bg-yellow-500/15",
    text: "text-yellow-300",
    dot: "bg-yellow-400",
  },
  APPROVED: {
    label: "Onaylı",
    bg: "bg-green-500/15",
    text: "text-green-300",
    dot: "bg-green-400",
  },
  REJECTED: {
    label: "Reddedildi",
    bg: "bg-red-500/15",
    text: "text-red-300",
    dot: "bg-red-400",
  },
  CANCELLED: {
    label: "İptal",
    bg: "bg-neutral-500/15",
    text: "text-neutral-400",
    dot: "bg-neutral-500",
  },
  CHECKED_IN: {
    label: "Check-in",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    dot: "bg-blue-400",
  },
  CHECKED_OUT: {
    label: "Check-out",
    bg: "bg-indigo-500/15",
    text: "text-indigo-300",
    dot: "bg-indigo-400",
  },
  MODIFICATION_PENDING: {
    label: "Değişiklik Bekleniyor",
    bg: "bg-orange-500/15",
    text: "text-orange-300",
    dot: "bg-orange-400",
  },
  EXTRA_PENDING: {
    label: "Ek Talep Bekleniyor",
    bg: "bg-pink-500/15",
    text: "text-pink-300",
    dot: "bg-pink-400",
  },
};

const FILTER_TABS = [
  { value: "", label: "Tümü" },
  { value: "PENDING", label: "Beklemede" },
  { value: "APPROVED", label: "Onaylı" },
  { value: "CHECKED_IN", label: "Check-in" },
  { value: "CHECKED_OUT", label: "Check-out" },
  { value: "REJECTED", label: "Reddedildi" },
  { value: "CANCELLED", label: "İptal" },
  { value: "MODIFICATION_PENDING", label: "Değişiklik" },
  { value: "EXTRA_PENDING", label: "Ek Talep" },
];

const PAGE_SIZE = 20;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayCount(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchReservationList(
  page: number,
  statusFilter: string,
  search: string,
): Promise<ReservationListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (statusFilter) params.set("status", statusFilter);
  if (search) params.set("search", search);

  const res = await fetch(`/api/reservations?${params}`);
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  const data = await res.json();
  const resolved = data.data ?? data;
  return {
    reservations: resolved.reservations ?? [],
    total: resolved.total ?? 0,
  };
}

async function fetchReservationDetailApi(
  id: string,
): Promise<ReservationDetail> {
  const res = await fetch(`/api/reservations/${id}`);
  if (!res.ok) throw new Error("Detay yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatusTimeline({ items }: { items: StatusHistoryItem[] }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-neutral-500 italic">
        Durum geçmişi bulunamadı.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((h, i) => (
        <div key={h.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-2.5 h-2.5 rounded-full mt-1 ${
                STATUS_CONFIG[h.toStatus]?.dot ?? "bg-neutral-500"
              }`}
            />
            {i < items.length - 1 && (
              <div className="w-px flex-1 bg-neutral-700 mt-1" />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {h.fromStatus && (
                <>
                  <StatusBadge status={h.fromStatus} />
                  <span className="text-neutral-600 text-xs">→</span>
                </>
              )}
              <StatusBadge status={h.toStatus} />
            </div>
            {h.reason && (
              <p className="text-xs text-neutral-400 mt-1">{h.reason}</p>
            )}
            <p className="text-[10px] text-neutral-600 mt-1">
              {formatDateTime(h.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  reservation,
  onClose,
  onAction,
  actionLoading,
  currency,
}: {
  reservation: ReservationDetail;
  onClose: () => void;
  onAction: (
    action: string,
    id: string,
    data?: Record<string, unknown>,
  ) => void;
  actionLoading: boolean;
  currency: CurrencyCode;
}) {
  const [approvePrice, setApprovePrice] = useState(
    reservation.totalPrice ? String(reservation.totalPrice) : "",
  );
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const days = getDayCount(reservation.startDate, reservation.endDate);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">
            Rezervasyon Detayı
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            ID: {reservation.id.slice(0, 12)}…
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Detayı kapat"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-800 active:bg-neutral-700 transition-colors text-neutral-400 hover:text-neutral-200 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto rc-scrollbar">
        {/* Status */}
        <div className="px-5 py-4 border-b border-neutral-800">
          <StatusBadge status={reservation.status} />
        </div>

        {/* Info Grid */}
        <div className="px-5 py-4 border-b border-neutral-800 grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <User className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Misafir
              </p>
              <p className="text-sm text-neutral-200">
                {reservation.guestName}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Cabana
              </p>
              <p className="text-sm text-neutral-200">
                {reservation.cabana.name}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Tarih ({days} gün)
              </p>
              <p className="text-sm text-neutral-200">
                {formatDate(reservation.startDate)} –{" "}
                {formatDate(reservation.endDate)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <DollarSign className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Toplam Fiyat
              </p>
              <p className="text-sm text-neutral-200">
                {reservation.totalPrice
                  ? formatPrice(reservation.totalPrice, currency)
                  : "Belirlenmedi"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <User className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Oluşturan
              </p>
              <p className="text-sm text-neutral-200">
                {reservation.user.username}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Oluşturulma
              </p>
              <p className="text-sm text-neutral-200">
                {formatDateTime(reservation.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Check-in / Check-out info */}
        {(reservation.checkInAt || reservation.checkOutAt) && (
          <div className="px-5 py-4 border-b border-neutral-800 flex gap-6">
            {reservation.checkInAt && (
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-[10px] text-neutral-500">Check-in</p>
                  <p className="text-xs text-neutral-300">
                    {formatDateTime(reservation.checkInAt)}
                  </p>
                </div>
              </div>
            )}
            {reservation.checkOutAt && (
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-[10px] text-neutral-500">Check-out</p>
                  <p className="text-xs text-neutral-300">
                    {formatDateTime(reservation.checkOutAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {reservation.notes && (
          <div className="px-5 py-4 border-b border-neutral-800">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-1">
              Notlar
            </p>
            <p className="text-sm text-neutral-300">{reservation.notes}</p>
          </div>
        )}

        {/* Rejection reason */}
        {reservation.rejectionReason && (
          <div className="px-5 py-4 border-b border-neutral-800 bg-red-500/5">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-1">
              Red Sebebi
            </p>
            <p className="text-sm text-red-300">
              {reservation.rejectionReason}
            </p>
          </div>
        )}

        {/* Sub-requests */}
        {((reservation.modifications?.length ?? 0) > 0 ||
          (reservation.cancellations?.length ?? 0) > 0 ||
          (reservation.extraConcepts?.length ?? 0) > 0) && (
          <div className="px-5 py-4 border-b border-neutral-800">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">
              Alt Talepler
            </p>
            {(reservation.modifications?.length ?? 0) > 0 && (
              <p className="text-xs text-orange-300 mb-1">
                📝 {reservation.modifications!.length} değişiklik talebi
              </p>
            )}
            {(reservation.cancellations?.length ?? 0) > 0 && (
              <p className="text-xs text-red-300 mb-1">
                ❌ {reservation.cancellations!.length} iptal talebi
              </p>
            )}
            {(reservation.extraConcepts?.length ?? 0) > 0 && (
              <p className="text-xs text-pink-300">
                ➕ {reservation.extraConcepts!.length} ek konsept talebi
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {reservation.status === "PENDING" && (
          <PermissionGate permission="reservation.update">
            <div className="px-5 py-4 border-b border-neutral-800 space-y-3">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                İşlemler
              </p>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-neutral-400 mb-1 block">
                    Toplam Fiyat Belirle
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={approvePrice}
                    onChange={(e) => setApprovePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={() =>
                    onAction("approve", reservation.id, {
                      totalPrice: parseFloat(approvePrice) || 0,
                    })
                  }
                  disabled={actionLoading || !approvePrice}
                  className={successBtnCls + " min-h-[48px] flex items-center justify-center gap-2 rounded-xl touch-manipulation"}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Onayla
                </button>
              </div>
              {!showReject ? (
                <button
                  onClick={() => setShowReject(true)}
                  className={
                    "w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl touch-manipulation " +
                    dangerSoftBtnCls
                  }
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  Reddet
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none"
                    rows={2}
                    placeholder="Red sebebi..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        onAction("reject", reservation.id, {
                          reason: rejectReason,
                        })
                      }
                      disabled={actionLoading || !rejectReason.trim()}
                      className={"flex-1 min-h-[48px] rounded-xl touch-manipulation " + dangerBtnCls}
                    >
                      Reddet
                    </button>
                    <button
                      onClick={() => {
                        setShowReject(false);
                        setRejectReason("");
                      }}
                      className="min-h-[48px] px-4 py-2.5 bg-neutral-800 text-neutral-400 text-sm rounded-xl hover:text-neutral-200 active:bg-neutral-700 transition-colors touch-manipulation"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </PermissionGate>
        )}

        {reservation.status === "APPROVED" && (
          <PermissionGate permission="reservation.update">
            <div className="px-5 py-4 border-b border-neutral-800">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">
                İşlemler
              </p>
              <button
                onClick={() => onAction("check-in", reservation.id)}
                disabled={actionLoading}
                className={
                  "w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl touch-manipulation " + infoBtnCls
                }
              >
                <LogIn className="w-4 h-4 shrink-0" />
                Check-in Yap
              </button>
            </div>
          </PermissionGate>
        )}

        {reservation.status === "CHECKED_IN" && (
          <PermissionGate permission="reservation.update">
            <div className="px-5 py-4 border-b border-neutral-800">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">
                İşlemler
              </p>
              <button
                onClick={() => onAction("check-out", reservation.id)}
                disabled={actionLoading}
                className="w-full min-h-[48px] px-4 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 touch-manipulation"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Check-out Yap
              </button>
            </div>
          </PermissionGate>
        )}

        {/* Status History */}
        <div className="px-5 py-4">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-3">
            Durum Geçmişi
          </p>
          <StatusTimeline items={reservation.statusHistory ?? []} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminReservationsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Bildirimden tıklanınca gelen ?reservationId= ile detayı aç
  useEffect(() => {
    const id = searchParams.get("reservationId");
    if (id) setSelectedId(id);
  }, [searchParams]);
  const [sortField, setSortField] = useState<"createdAt" | "startDate">(
    "createdAt",
  );
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-reservations", page, statusFilter, search],
    queryFn: () => fetchReservationList(page, statusFilter, search),
  });

  const reservations = data?.reservations ?? [];
  const total = data?.total ?? 0;

  const { data: selectedDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-reservation-detail", selectedId],
    queryFn: () => fetchReservationDetailApi(selectedId!),
    enabled: !!selectedId,
  });

  // SSE: invalidate on reservation updates
  const invalidateRef = useRef(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
    if (selectedId) {
      queryClient.invalidateQueries({
        queryKey: ["admin-reservation-detail", selectedId],
      });
    }
  });
  invalidateRef.current = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
    if (selectedId) {
      queryClient.invalidateQueries({
        queryKey: ["admin-reservation-detail", selectedId],
      });
    }
  };

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
      invalidateRef.current();
    }
  }, []);

  useSSE({ onEvent: handleSSEEvent as (event: string, data: unknown) => void });

  // Debounced search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        setSearch(value);
        setPage(1);
      }, 400);
    },
    [],
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const sorted = useMemo(() => {
    const arr = [...reservations];
    arr.sort((a, b) => {
      const dateA = new Date(a[sortField]).getTime();
      const dateB = new Date(b[sortField]).getTime();
      return dateB - dateA;
    });
    return arr;
  }, [reservations, sortField]);

  // Action mutation with optimistic updates
  const actionMutation = useMutation({
    mutationFn: async ({
      action,
      id,
      body,
    }: {
      action: string;
      id: string;
      body?: Record<string, unknown>;
    }) => {
      const urlMap: Record<string, string> = {
        approve: `/api/reservations/${id}/approve`,
        reject: `/api/reservations/${id}/reject`,
        "check-in": `/api/reservations/${id}/check-in`,
        "check-out": `/api/reservations/${id}/check-out`,
      };
      const url = urlMap[action];
      if (!url) throw new Error("Geçersiz işlem");

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body && { body: JSON.stringify(body) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "İşlem başarısız.");
      }
      return { action };
    },
    onMutate: async ({ action, id }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-reservations"] });
      const previousData = queryClient.getQueriesData<ReservationListResponse>({
        queryKey: ["admin-reservations"],
      });

      const statusMap: Record<string, string> = {
        approve: "APPROVED",
        reject: "REJECTED",
        "check-in": "CHECKED_IN",
        "check-out": "CHECKED_OUT",
      };
      const newStatus = statusMap[action];
      if (newStatus) {
        queryClient.setQueriesData<ReservationListResponse>(
          { queryKey: ["admin-reservations"] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              reservations: old.reservations.map((r) =>
                r.id === id ? { ...r, status: newStatus as ReservationStatus } : r,
              ),
            };
          },
        );
      }

      return { previousData };
    },
    onSuccess: (result) => {
      const labels: Record<string, string> = {
        approve: "Rezervasyon onaylandı.",
        reject: "Rezervasyon reddedildi.",
        "check-in": "Check-in başarılı.",
        "check-out": "Check-out başarılı.",
      };
      setMessage({
        text: labels[result.action] ?? "İşlem başarılı.",
        type: "success",
      });
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reservation-detail"] });
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        for (const [key, value] of context.previousData) {
          queryClient.setQueryData(key, value);
        }
      }
      setMessage({
        text: error instanceof Error ? error.message : "İşlem başarısız.",
        type: "error",
      });
    },
  });

  const handleAction = useCallback(
    (action: string, id: string, data?: Record<string, unknown>) => {
      actionMutation.mutate({ action, id, body: data });
    },
    [actionMutation],
  );

  // Auto-dismiss messages
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (message && !msgTimerRef.current) {
    msgTimerRef.current = setTimeout(() => {
      setMessage(null);
      msgTimerRef.current = null;
    }, 4000);
  }
  if (!message && msgTimerRef.current) {
    clearTimeout(msgTimerRef.current);
    msgTimerRef.current = null;
  }

  const loading = isLoading;

  return (
    <div className="text-neutral-100 flex flex-col h-full">
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Rezervasyonlar</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Toplam {total} rezervasyon
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <div
              className={`text-sm px-4 py-2 rounded-lg ${
                message.type === "success"
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              {message.text}
            </div>
          )}
          <button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["admin-reservations"],
              })
            }
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200"
            title="Yenile"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-neutral-800 space-y-3">
        {/* Search + Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Misafir adı veya Cabana ara..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-800/60 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={() =>
              setSortField((f) =>
                f === "createdAt" ? "startDate" : "createdAt",
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800/60 border border-neutral-700 rounded-lg text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortField === "createdAt"
              ? "Oluşturma Tarihi"
              : "Başlangıç Tarihi"}
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
                setSelectedId(null);
              }}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-amber-500 text-neutral-950"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Table / List */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            selectedDetail || detailLoading ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Table Header (desktop) */}
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_2fr_1fr_1.2fr_80px] gap-3 px-5 py-2.5 border-b border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-wider">
            <span>Misafir</span>
            <span>Cabana</span>
            <span>Tarih</span>
            <span>Fiyat</span>
            <span>Durum</span>
            <span className="text-center">Detay</span>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto rc-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-neutral-500 animate-spin" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-neutral-500 text-sm">
                <Filter className="w-8 h-8 mb-2 opacity-30" />
                Rezervasyon bulunamadı.
              </div>
            ) : (
              sorted.map((r) => {
                const days = getDayCount(r.startDate, r.endDate);
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left min-h-[48px] px-4 sm:px-5 py-3.5 border-b border-neutral-800/60 hover:bg-neutral-800/40 active:bg-neutral-800/60 transition-colors touch-manipulation ${
                      selectedId === r.id ? "bg-neutral-800/60" : ""
                    }`}
                  >
                    {/* Mobile layout */}
                    <div className="md:hidden space-y-1.5">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-neutral-100">
                          {r.guestName}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-xs text-neutral-400">
                        {r.cabana.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span>
                          {formatDate(r.startDate)} – {formatDate(r.endDate)}
                        </span>
                        <span className="text-neutral-600">({days} gün)</span>
                      </div>
                      {r.totalPrice && (
                        <p className="text-xs text-emerald-400">
                          {formatPrice(r.totalPrice, currency)}
                        </p>
                      )}
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-[2fr_1.5fr_2fr_1fr_1.2fr_80px] gap-3 items-center">
                      <div>
                        <p className="text-sm font-medium text-neutral-100 truncate">
                          {r.guestName}
                        </p>
                        <p className="text-[10px] text-neutral-600 mt-0.5">
                          {r.user.username}
                        </p>
                      </div>
                      <p className="text-sm text-neutral-300 truncate">
                        {r.cabana.name}
                      </p>
                      <div>
                        <p className="text-sm text-neutral-300">
                          {formatDate(r.startDate)} – {formatDate(r.endDate)}
                        </p>
                        <p className="text-[10px] text-neutral-600">
                          {days} gün
                        </p>
                      </div>
                      <p className="text-sm text-emerald-400">
                        {r.totalPrice
                          ? formatPrice(r.totalPrice, currency)
                          : "—"}
                      </p>
                      <StatusBadge status={r.status} />
                      <div className="flex justify-center">
                        <Eye className="w-4 h-4 text-neutral-600" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                Sayfa {page}/{totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Önceki sayfa"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-400 touch-manipulation"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Sonraki sayfa"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-400 touch-manipulation"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Sidebar */}
        <div
          className={`absolute inset-0 lg:relative lg:inset-auto lg:w-[480px] lg:border-l border-neutral-800 bg-neutral-950 lg:bg-transparent overflow-hidden ${
            selectedDetail || detailLoading
              ? "flex flex-col"
              : "hidden lg:flex lg:flex-col"
          }`}
        >
          {detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-5 h-5 text-neutral-500 animate-spin" />
            </div>
          ) : selectedDetail ? (
            <DetailPanel
              reservation={selectedDetail}
              onClose={() => setSelectedId(null)}
              onAction={handleAction}
              actionLoading={actionMutation.isPending}
              currency={currency}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
              Detay görmek için bir rezervasyon seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
