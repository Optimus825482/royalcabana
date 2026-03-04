"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReservationStatus } from "@/types";
import {
  formatPrice,
  currencySymbol,
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import PermissionGate from "@/components/shared/PermissionGate";
import { useSSE } from "@/hooks/useSSE";
import { SSE_EVENTS } from "@/lib/sse-events";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

interface ModificationRequest {
  id: string;
  status: string;
  newStartDate?: string | null;
  newEndDate?: string | null;
  newGuestName?: string | null;
  newCabanaId?: string | null;
  rejectionReason?: string | null;
}

interface CancellationRequest {
  id: string;
  status: string;
  reason: string;
  rejectionReason?: string | null;
}

interface ExtraConceptRequest {
  id: string;
  status: string;
  items: string; // JSON string
  rejectionReason?: string | null;
}

interface ReservationListItem {
  id: string;
  guestName: string;
  guestId?: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  status: ReservationStatus;
  totalPrice: number | null;
  rejectionReason: string | null;
  createdAt: string;
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

interface ExtraRequestItem {
  id: string;
  type: "PRODUCT" | "CUSTOM";
  productId: string | null;
  customName: string | null;
  customDesc: string | null;
  quantity: number;
  unitPrice: number | string | null;
  status: string;
  rejectionReason: string | null;
  pricedBy: string | null;
  pricedAt: string | null;
  product?: { id: string; name: string; salePrice: number | string } | null;
}

interface Reservation extends ReservationListItem {
  guest?: {
    id: string;
    name: string;
    vipLevel: string;
    totalVisits: number;
    lastVisitAt: string | null;
    phone: string | null;
  } | null;
  statusHistory: StatusHistoryEntry[];
  modifications?: ModificationRequest[];
  cancellations?: CancellationRequest[];
  extraConcepts?: ExtraConceptRequest[];
  extraItems?: unknown[];
  conceptId?: string | null;
  customRequests?: string | null;
  customRequestPriced?: boolean;
  customRequestPrice?: number | string | null;
  extraItems_json?: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "Bekliyor",
  [ReservationStatus.APPROVED]: "Onaylandı",
  [ReservationStatus.REJECTED]: "Reddedildi",
  [ReservationStatus.CANCELLED]: "İptal",
  [ReservationStatus.MODIFICATION_PENDING]: "Değişiklik Bekliyor",
  [ReservationStatus.EXTRA_PENDING]: "Ek Konsept Bekliyor",
  [ReservationStatus.CHECKED_IN]: "Giriş Yapıldı",
  [ReservationStatus.CHECKED_OUT]: "Çıkış Yapıldı",
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]:
    "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  [ReservationStatus.APPROVED]:
    "bg-green-500/20 text-green-300 border border-green-500/30",
  [ReservationStatus.REJECTED]:
    "bg-red-500/20 text-red-300 border border-red-500/30",
  [ReservationStatus.CANCELLED]:
    "bg-neutral-500/20 text-neutral-400 border border-neutral-500/30",
  [ReservationStatus.MODIFICATION_PENDING]:
    "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  [ReservationStatus.EXTRA_PENDING]:
    "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  [ReservationStatus.CHECKED_IN]:
    "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  [ReservationStatus.CHECKED_OUT]:
    "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { label: "Tümü", value: "" },
  { label: "Bekleyen", value: ReservationStatus.PENDING },
  { label: "Onaylanan", value: ReservationStatus.APPROVED },
  { label: "Reddedilen", value: ReservationStatus.REJECTED },
  { label: "İptal", value: ReservationStatus.CANCELLED },
];

async function fetchRequestsList(
  filter: string,
): Promise<{ reservations: ReservationListItem[]; total: number }> {
  const params = new URLSearchParams({ limit: "50" });
  if (filter) params.set("status", filter);
  const res = await fetch(`/api/reservations?${params}`);
  if (!res.ok) throw new Error("Talepler yüklenirken hata oluştu.");
  const json = await res.json();
  return json.data ?? json;
}

async function fetchReservationDetail(id: string): Promise<Reservation> {
  const res = await fetch(`/api/reservations/${id}`);
  if (!res.ok) throw new Error("Rezervasyon detayı yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap + ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    // Focus textarea on mount
    const textarea = modalRef.current?.querySelector("textarea");
    textarea?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-neutral-900 border border-neutral-700 rounded-t-xl sm:rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto rc-scrollbar"
      >
        <h3
          id="reject-modal-title"
          className="text-lg font-semibold text-neutral-100 mb-4"
        >
          Red Nedeni
        </h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Red nedenini yazın..."
          rows={4}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-base sm:text-sm text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none focus:border-amber-500"
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 min-h-[44px] text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="px-4 py-2 min-h-[44px] text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? "Reddediliyor..." : "Reddet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  reservation,
  onApprove,
  onReject,
  actionLoading,
  currency,
  onRefresh,
}: {
  reservation: Reservation;
  onApprove: (id: string, price: number) => void;
  onReject: (id: string) => void;
  actionLoading: boolean;
  currency: CurrencyCode;
  onRefresh: () => void;
}) {
  const [totalPrice, setTotalPrice] = useState(
    reservation.totalPrice ? String(reservation.totalPrice) : "",
  );
  const [subActionLoading, setSubActionLoading] = useState<string | null>(null);
  const [subRejectTarget, setSubRejectTarget] = useState<{
    type: "modification" | "cancellation" | "extraConcept" | "extraRequest";
    id: string;
  } | null>(null);
  const [subRejectReason, setSubRejectReason] = useState("");
  const [extraRequestPriceInputs, setExtraRequestPriceInputs] = useState<Record<string, string>>({});

  const { data: extraRequestsData, refetch: refetchExtraRequests } = useQuery({
    queryKey: ["extra-requests", reservation.id],
    queryFn: async () => {
      const res = await fetch(`/api/reservations/${reservation.id}/extra-requests`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as ExtraRequestItem[];
    },
  });

  const extraRequests = extraRequestsData ?? [];

  // Guest history via TanStack Query (cached per guestId)
  const { data: guestHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["guest-history", reservation.guestId],
    queryFn: async () => {
      const res = await fetch(`/api/guests/${reservation.guestId}/history`);
      if (!res.ok) return null;
      const json = await res.json();
      return (
        (json?.data as {
          summary: {
            totalVisits: number;
            totalSpent: number;
            favoriteCabana: string | null;
            favoriteConcept: string | null;
          };
          reservations: Array<{
            id: string;
            cabanaName: string;
            conceptName: string | null;
            startDate: string;
            endDate: string;
            days: number;
            status: string;
            totalPrice: number | null;
            hasExtras: boolean;
          }>;
        }) ?? null
      );
    },
    enabled: !!reservation.guestId,
  });

  useEffect(() => {
    void Promise.resolve().then(() =>
      setTotalPrice(
        reservation.totalPrice ? String(reservation.totalPrice) : "",
      ),
    );
  }, [reservation.id, reservation.totalPrice]);

  const isPending = reservation.status === ReservationStatus.PENDING;

  async function handleSubAction(
    type: "modifications" | "cancellations" | "extra-concepts",
    requestId: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ) {
    setSubActionLoading(requestId);
    try {
      const body: Record<string, string> = { action };
      if (action === "reject" && rejectionReason) {
        body.rejectionReason = rejectionReason;
      }
      const res = await fetch(
        `/api/reservations/${reservation.id}/${type}/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        onRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "İşlem başarısız oldu. Lütfen tekrar deneyin.");
      }
    } catch {
      alert("Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.");
    } finally {
      setSubActionLoading(null);
      setSubRejectTarget(null);
      setSubRejectReason("");
    }
  }

  async function handleExtraRequestAction(
    requestId: string,
    action: "approve" | "reject" | "price",
    extra?: { unitPrice?: number; rejectionReason?: string },
  ) {
    setSubActionLoading(requestId);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "reject" && extra?.rejectionReason) {
        body.rejectionReason = extra.rejectionReason;
      }
      if (action === "price" && extra?.unitPrice !== undefined) {
        body.unitPrice = extra.unitPrice;
      }
      const res = await fetch(
        `/api/reservations/${reservation.id}/extra-requests/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        refetchExtraRequests();
        onRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "İşlem başarısız oldu.");
      }
    } catch {
      alert("Sunucuya bağlanılamadı.");
    } finally {
      setSubActionLoading(null);
      setSubRejectTarget(null);
      setSubRejectReason("");
    }
  }

  function parseExtraConceptItems(
    jsonStr: string,
  ): { name: string; quantity: number; unitPrice: number }[] {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  }

  const pendingModifications =
    reservation.modifications?.filter((m) => m.status === "PENDING") ?? [];
  const otherModifications =
    reservation.modifications?.filter((m) => m.status !== "PENDING") ?? [];
  const pendingCancellations =
    reservation.cancellations?.filter((c) => c.status === "PENDING") ?? [];
  const otherCancellations =
    reservation.cancellations?.filter((c) => c.status !== "PENDING") ?? [];
  const pendingExtraConcepts =
    reservation.extraConcepts?.filter((e) => e.status === "PENDING") ?? [];
  const otherExtraConcepts =
    reservation.extraConcepts?.filter((e) => e.status !== "PENDING") ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto rc-scrollbar">
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              {reservation.guestName}
            </h2>
            <p className="text-sm text-neutral-400">
              {reservation.cabana.name}
            </p>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        {/* Guest History Card */}
        {reservation.guestId && (
          <div className="mb-4">
            {historyLoading ? (
              <p className="text-xs text-neutral-500 animate-pulse">
                Misafir geçmişi yükleniyor...
              </p>
            ) : guestHistory && guestHistory.reservations.length > 0 ? (
              <div className="rounded-lg border border-amber-700/20 bg-amber-950/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-amber-700/15 flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-400">
                    Misafir Geçmişi
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {guestHistory.summary.totalVisits} ziyaret ·{" "}
                    {guestHistory.summary.totalSpent.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </span>
                </div>
                {guestHistory.summary.favoriteCabana && (
                  <div className="px-3 py-1.5 text-[10px] text-neutral-400">
                    Favori:{" "}
                    <span className="text-neutral-200">
                      {guestHistory.summary.favoriteCabana}
                    </span>
                    {guestHistory.summary.favoriteConcept && (
                      <span className="ml-2">
                        ·{" "}
                        <span className="text-amber-300">
                          {guestHistory.summary.favoriteConcept}
                        </span>
                      </span>
                    )}
                  </div>
                )}
                <div className="px-3 pb-2 space-y-1">
                  {guestHistory.reservations
                    .filter((h) => h.id !== reservation.id)
                    .slice(0, 3)
                    .map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between text-[10px] bg-neutral-800/30 rounded px-2 py-1.5"
                      >
                        <div>
                          <span className="text-neutral-300">
                            {h.cabanaName}
                          </span>
                          <span className="text-neutral-600 ml-1">
                            · {h.days} gün
                          </span>
                          {h.conceptName && (
                            <span className="text-amber-400/60 ml-1">
                              · {h.conceptName}
                            </span>
                          )}
                          {h.hasExtras && (
                            <span className="text-blue-400/60 ml-1">
                              +ilave
                            </span>
                          )}
                        </div>
                        <span className="text-neutral-500">
                          {new Date(h.startDate).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {reservation.guest && !reservation.guestId && null}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-neutral-500">Başlangıç</span>
            <p className="text-neutral-200 font-medium">
              {formatDate(reservation.startDate)}
            </p>
          </div>
          <div>
            <span className="text-neutral-500">Bitiş</span>
            <p className="text-neutral-200 font-medium">
              {formatDate(reservation.endDate)}
            </p>
          </div>
          <div>
            <span className="text-neutral-500">Talep Eden</span>
            <p className="text-neutral-200">{reservation.user.username}</p>
          </div>
          <div>
            <span className="text-neutral-500">Oluşturulma</span>
            <p className="text-neutral-200">
              {formatDate(reservation.createdAt)}
            </p>
          </div>
          {reservation.totalPrice !== null && (
            <div className="col-span-2">
              <span className="text-neutral-500">Toplam Fiyat</span>
              <p className="text-amber-400 font-semibold text-base">
                {formatPrice(reservation.totalPrice, currency)}
              </p>
            </div>
          )}
          {reservation.rejectionReason && (
            <div className="col-span-2">
              <span className="text-neutral-500">Red Nedeni</span>
              <p className="text-red-400 text-sm">
                {reservation.rejectionReason}
              </p>
            </div>
          )}
          {reservation.notes && (
            <div className="col-span-2">
              <span className="text-neutral-500">Notlar</span>
              <p className="text-neutral-300 text-sm">{reservation.notes}</p>
            </div>
          )}
          {reservation.customRequests && (
            <div className="col-span-2">
              <span className="text-neutral-500">Liste Dışı Talep</span>
              <p className="text-orange-300 text-sm">
                {reservation.customRequests}
              </p>
              {!reservation.customRequestPriced && (
                <span className="text-[10px] text-orange-400 mt-0.5 block">
                  ⚠ Henüz fiyatlandırılmamış
                </span>
              )}
              {reservation.customRequestPriced &&
                reservation.customRequestPrice != null && (
                  <span className="text-[10px] text-green-400 mt-0.5 block">
                    ✓ Fiyatlandırıldı:{" "}
                    {parseFloat(
                      String(reservation.customRequestPrice),
                    ).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </span>
                )}
            </div>
          )}
          {reservation.extraItems_json != null &&
            Array.isArray(
              typeof reservation.extraItems_json === "string"
                ? JSON.parse(reservation.extraItems_json)
                : reservation.extraItems_json,
            ) && (
              <div className="col-span-2">
                <span className="text-neutral-500">
                  Ekstra Ürünler (Talep ile)
                </span>
                <div className="mt-1 space-y-0.5">
                  {(
                    (typeof reservation.extraItems_json === "string"
                      ? JSON.parse(reservation.extraItems_json)
                      : reservation.extraItems_json) as Array<{
                      productId: string;
                      quantity: number;
                      productName?: string;
                    }>
                  ).map((item, i) => (
                    <p key={i} className="text-xs text-neutral-300">
                      {item.productName ?? item.productId} × {item.quantity}
                    </p>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Onay/Red Aksiyonları */}
      {isPending && (
        <PermissionGate permission="reservation.update">
          <div className="p-6 border-b border-neutral-800">
            <h3 className="text-sm font-medium text-neutral-300 mb-3">
              Fiyat Belirle ve Onayla
            </h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-neutral-500 mb-1 block">
                  Toplam Fiyat ({currencySymbol(currency)})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-base sm:text-sm text-neutral-100 focus:outline-none focus:border-amber-500 min-h-[44px]"
                />
              </div>
              <button
                onClick={() => {
                  const price = parseFloat(totalPrice);
                  if (!isNaN(price) && price >= 0) {
                    onApprove(reservation.id, price);
                  }
                }}
                disabled={
                  !totalPrice || isNaN(parseFloat(totalPrice)) || actionLoading
                }
                className="px-4 py-2 min-h-[44px] bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {actionLoading ? "..." : "Onayla"}
              </button>
              <button
                onClick={() => onReject(reservation.id)}
                disabled={actionLoading}
                className="px-4 py-2 min-h-[44px] bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Reddet
              </button>
            </div>
            {reservation.customRequests && !reservation.customRequestPriced && (
              <div className="mt-3 p-3 rounded-lg border border-orange-500/20 bg-orange-950/10">
                <p className="text-xs text-orange-300 mb-2">
                  Liste Dışı Talep:{" "}
                  <span className="text-neutral-200">
                    {reservation.customRequests}
                  </span>
                </p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-neutral-500 mb-1 block">
                      Talep Fiyatı ({currencySymbol(currency)})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      id={`custom-price-${reservation.id}`}
                      placeholder="0.00"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-orange-500 min-h-[44px]"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const input = document.getElementById(
                        `custom-price-${reservation.id}`,
                      ) as HTMLInputElement;
                      const price = parseFloat(input?.value ?? "0");
                      if (isNaN(price) || price < 0) return;
                      try {
                        const res = await fetch(
                          `/api/reservations/${reservation.id}/custom-request-price`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ price }),
                          },
                        );
                        if (res.ok) {
                          onRefresh();
                        } else {
                          const errData = await res.json().catch(() => ({}));
                          alert(
                            errData.error || "Fiyatlandırma başarısız oldu.",
                          );
                        }
                      } catch {
                        alert("Sunucuya bağlanılamadı.");
                      }
                    }}
                    className="px-3 py-2 min-h-[44px] text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Fiyatlandır
                  </button>
                </div>
              </div>
            )}
          </div>
        </PermissionGate>
      )}

      {/* Durum Geçmişi */}
      {reservation.statusHistory.length > 0 && (
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Durum Geçmişi
          </h3>
          <div className="space-y-2">
            {reservation.statusHistory.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <span className="text-neutral-400">
                    {h.fromStatus
                      ? `${STATUS_LABELS[h.fromStatus as ReservationStatus] ?? h.fromStatus} → `
                      : ""}
                    <span className="text-neutral-200 font-medium">
                      {STATUS_LABELS[h.toStatus as ReservationStatus] ??
                        h.toStatus}
                    </span>
                  </span>
                  {h.reason && (
                    <p className="text-neutral-500 mt-0.5">{h.reason}</p>
                  )}
                  <p className="text-neutral-600 mt-0.5">
                    {formatDate(h.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Değişiklik Talepleri */}
      {(reservation.modifications?.length ?? 0) > 0 && (
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Değişiklik Talepleri ({reservation.modifications?.length})
          </h3>
          <div className="space-y-3">
            {pendingModifications.map((mod) => (
              <div
                key={mod.id}
                className="bg-neutral-800/60 border border-orange-500/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium">
                    Bekliyor
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {mod.newStartDate && (
                    <div>
                      <span className="text-neutral-500">Yeni Başlangıç</span>
                      <p className="text-neutral-200">
                        {formatDate(mod.newStartDate)}
                      </p>
                    </div>
                  )}
                  {mod.newEndDate && (
                    <div>
                      <span className="text-neutral-500">Yeni Bitiş</span>
                      <p className="text-neutral-200">
                        {formatDate(mod.newEndDate)}
                      </p>
                    </div>
                  )}
                  {mod.newGuestName && (
                    <div className="col-span-2">
                      <span className="text-neutral-500">Yeni Misafir Adı</span>
                      <p className="text-neutral-200">{mod.newGuestName}</p>
                    </div>
                  )}
                  {mod.newCabanaId && (
                    <div className="col-span-2">
                      <span className="text-neutral-500">Yeni Cabana</span>
                      <p className="text-neutral-200">{mod.newCabanaId}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      handleSubAction("modifications", mod.id, "approve")
                    }
                    disabled={subActionLoading === mod.id}
                    className="px-3 py-1.5 min-h-[36px] text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {subActionLoading === mod.id ? "..." : "Onayla"}
                  </button>
                  <button
                    onClick={() =>
                      setSubRejectTarget({ type: "modification", id: mod.id })
                    }
                    disabled={subActionLoading === mod.id}
                    className="px-3 py-1.5 min-h-[36px] text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
            {otherModifications.map((mod) => (
              <div
                key={mod.id}
                className="bg-neutral-800/30 border border-neutral-700/40 rounded-lg p-4 opacity-60"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      mod.status === "APPROVED"
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {mod.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {mod.newStartDate && (
                    <div>
                      <span className="text-neutral-500">Yeni Başlangıç</span>
                      <p className="text-neutral-400">
                        {formatDate(mod.newStartDate)}
                      </p>
                    </div>
                  )}
                  {mod.newEndDate && (
                    <div>
                      <span className="text-neutral-500">Yeni Bitiş</span>
                      <p className="text-neutral-400">
                        {formatDate(mod.newEndDate)}
                      </p>
                    </div>
                  )}
                  {mod.newGuestName && (
                    <div className="col-span-2">
                      <span className="text-neutral-500">Yeni Misafir Adı</span>
                      <p className="text-neutral-400">{mod.newGuestName}</p>
                    </div>
                  )}
                </div>
                {mod.rejectionReason && (
                  <p className="text-xs text-red-400 mt-2">
                    Red: {mod.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İptal Talepleri */}
      {(reservation.cancellations?.length ?? 0) > 0 && (
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            İptal Talepleri ({reservation.cancellations?.length})
          </h3>
          <div className="space-y-3">
            {pendingCancellations.map((canc) => (
              <div
                key={canc.id}
                className="bg-neutral-800/60 border border-red-500/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-medium">
                    Bekliyor
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-neutral-500">İptal Nedeni</span>
                  <p className="text-neutral-200 mt-0.5">{canc.reason}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      handleSubAction("cancellations", canc.id, "approve")
                    }
                    disabled={subActionLoading === canc.id}
                    className="px-3 py-1.5 min-h-[36px] text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {subActionLoading === canc.id ? "..." : "Onayla"}
                  </button>
                  <button
                    onClick={() =>
                      setSubRejectTarget({ type: "cancellation", id: canc.id })
                    }
                    disabled={subActionLoading === canc.id}
                    className="px-3 py-1.5 min-h-[36px] text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
            {otherCancellations.map((canc) => (
              <div
                key={canc.id}
                className="bg-neutral-800/30 border border-neutral-700/40 rounded-lg p-4 opacity-60"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      canc.status === "APPROVED"
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {canc.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">{canc.reason}</p>
                {canc.rejectionReason && (
                  <p className="text-xs text-red-400 mt-1">
                    Red: {canc.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ek Konsept Talepleri */}
      {(reservation.extraConcepts?.length ?? 0) > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Ek Konsept Talepleri ({reservation.extraConcepts?.length})
          </h3>
          <div className="space-y-3">
            {pendingExtraConcepts.map((ec) => {
              const items = parseExtraConceptItems(ec.items);
              return (
                <div
                  key={ec.id}
                  className="bg-neutral-800/60 border border-blue-500/20 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                      Bekliyor
                    </span>
                  </div>
                  {items.length > 0 && (
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-neutral-300">
                            {item.name}{" "}
                            <span className="text-neutral-600">
                              ×{item.quantity}
                            </span>
                          </span>
                          {item.unitPrice != null && (
                            <span className="text-neutral-400">
                              {formatPrice(
                                item.unitPrice * item.quantity,
                                currency,
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() =>
                        handleSubAction("extra-concepts", ec.id, "approve")
                      }
                      disabled={subActionLoading === ec.id}
                      className="px-3 py-1.5 min-h-[36px] text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      {subActionLoading === ec.id ? "..." : "Onayla"}
                    </button>
                    <button
                      onClick={() =>
                        setSubRejectTarget({ type: "extraConcept", id: ec.id })
                      }
                      disabled={subActionLoading === ec.id}
                      className="px-3 py-1.5 min-h-[36px] text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              );
            })}
            {otherExtraConcepts.map((ec) => {
              const items = parseExtraConceptItems(ec.items);
              return (
                <div
                  key={ec.id}
                  className="bg-neutral-800/30 border border-neutral-700/40 rounded-lg p-4 opacity-60"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ec.status === "APPROVED"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {ec.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}
                    </span>
                  </div>
                  {items.length > 0 && (
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-neutral-400">
                            {item.name} ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ec.rejectionReason && (
                    <p className="text-xs text-red-400 mt-2">
                      Red: {ec.rejectionReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ekstra Talepler (ReservationExtraRequest) */}
      {extraRequests.length > 0 && (
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-neutral-300">
              Ekstra Talepler ({extraRequests.length})
            </h3>
            {extraRequests.filter((er) => er.status === "PENDING").length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-medium">
                {extraRequests.filter((er) => er.status === "PENDING").length} bekliyor
              </span>
            )}
          </div>
          <div className="space-y-3">
            {extraRequests.map((er) => {
              const isPendingExtra = er.status === "PENDING";
              const isApprovedExtra = er.status === "APPROVED";
              const isRejectedExtra = er.status === "REJECTED";
              const isCustom = er.type === "CUSTOM";
              const displayName = isCustom
                ? (er.customName ?? "Özel Talep")
                : (er.product?.name ?? "Ürün");
              const hasPrice = er.unitPrice != null;
              const priceVal = hasPrice ? parseFloat(String(er.unitPrice)) : 0;

              return (
                <div
                  key={er.id}
                  className={`rounded-lg p-4 space-y-2 ${
                    isPendingExtra
                      ? "bg-neutral-800/60 border border-yellow-500/20"
                      : isApprovedExtra
                        ? "bg-neutral-800/30 border border-green-500/20"
                        : "bg-neutral-800/30 border border-red-500/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider ${
                          isCustom
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {isCustom ? "Özel" : "Ürün"}
                      </span>
                      <span className="text-sm text-neutral-100 font-medium">
                        {displayName}
                      </span>
                      <span className="text-xs text-neutral-600">
                        ×{er.quantity}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isPendingExtra
                          ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                          : isApprovedExtra
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {isPendingExtra
                        ? "Bekliyor"
                        : isApprovedExtra
                          ? "Onaylandı"
                          : "Reddedildi"}
                    </span>
                  </div>

                  {isCustom && er.customDesc && (
                    <p className="text-xs text-neutral-400">
                      {er.customDesc}
                    </p>
                  )}

                  {hasPrice && (
                    <div className="text-xs text-neutral-300">
                      Birim Fiyat:{" "}
                      <span className="text-amber-400 font-medium">
                        {priceVal.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {currencySymbol(currency)}
                      </span>
                      <span className="text-neutral-500 ml-2">
                        Toplam:{" "}
                        {(priceVal * er.quantity).toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {currencySymbol(currency)}
                      </span>
                    </div>
                  )}

                  {isRejectedExtra && er.rejectionReason && (
                    <p className="text-xs text-red-400">
                      Red: {er.rejectionReason}
                    </p>
                  )}

                  {/* Actions for PENDING extra requests */}
                  {isPendingExtra && (
                    <div className="flex items-end gap-2 pt-2">
                      {isCustom && !hasPrice && (
                        <div className="flex-1">
                          <label className="text-[10px] text-neutral-500 mb-1 block">
                            Birim Fiyat ({currencySymbol(currency)})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={extraRequestPriceInputs[er.id] ?? ""}
                            onChange={(e) =>
                              setExtraRequestPriceInputs((prev) => ({
                                ...prev,
                                [er.id]: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-orange-500 min-h-[36px]"
                          />
                        </div>
                      )}
                      {isCustom && !hasPrice && (
                        <button
                          onClick={() => {
                            const price = parseFloat(
                              extraRequestPriceInputs[er.id] ?? "0",
                            );
                            if (isNaN(price) || price < 0) return;
                            handleExtraRequestAction(er.id, "price", {
                              unitPrice: price,
                            });
                          }}
                          disabled={subActionLoading === er.id}
                          className="px-3 py-2 min-h-[36px] text-xs bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          Fiyatlandır
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleExtraRequestAction(er.id, "approve")
                        }
                        disabled={subActionLoading === er.id}
                        className="px-3 py-2 min-h-[36px] text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                      >
                        {subActionLoading === er.id ? "..." : "Onayla"}
                      </button>
                      <button
                        onClick={() =>
                          setSubRejectTarget({
                            type: "extraRequest",
                            id: er.id,
                          })
                        }
                        disabled={subActionLoading === er.id}
                        className="px-3 py-2 min-h-[36px] text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                      >
                        Reddet
                      </button>
                    </div>
                  )}

                  {/* Price action for APPROVED custom extras without price */}
                  {isApprovedExtra && isCustom && !hasPrice && (
                    <div className="flex items-end gap-2 pt-2 border-t border-neutral-700/30">
                      <div className="flex-1">
                        <label className="text-[10px] text-orange-400 mb-1 block">
                          Fiyatlandırma bekleniyor
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={extraRequestPriceInputs[er.id] ?? ""}
                          onChange={(e) =>
                            setExtraRequestPriceInputs((prev) => ({
                              ...prev,
                              [er.id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-orange-500 min-h-[36px]"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const price = parseFloat(
                            extraRequestPriceInputs[er.id] ?? "0",
                          );
                          if (isNaN(price) || price < 0) return;
                          handleExtraRequestAction(er.id, "price", {
                            unitPrice: price,
                          });
                        }}
                        disabled={subActionLoading === er.id}
                        className="px-3 py-2 min-h-[36px] text-xs bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                      >
                        Fiyatlandır
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-request Reject Modal */}
      {subRejectTarget && (
        <div className="p-6 border-t border-neutral-700 bg-neutral-900/80">
          <h4 className="text-sm font-medium text-neutral-300 mb-2">
            Red Nedeni
          </h4>
          <textarea
            value={subRejectReason}
            onChange={(e) => setSubRejectReason(e.target.value)}
            placeholder="Red nedenini yazın..."
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none focus:border-amber-500 mb-3"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setSubRejectTarget(null);
                setSubRejectReason("");
              }}
              className="px-3 py-1.5 min-h-[36px] text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (!subRejectReason.trim()) return;
                if (subRejectTarget.type === "extraRequest") {
                  handleExtraRequestAction(
                    subRejectTarget.id,
                    "reject",
                    { rejectionReason: subRejectReason.trim() },
                  );
                  return;
                }
                const typeMap = {
                  modification: "modifications",
                  cancellation: "cancellations",
                  extraConcept: "extra-concepts",
                } as const;
                handleSubAction(
                  typeMap[subRejectTarget.type],
                  subRejectTarget.id,
                  "reject",
                  subRejectReason.trim(),
                );
              }}
              disabled={!subRejectReason.trim() || subActionLoading !== null}
              className="px-3 py-1.5 min-h-[36px] text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              Reddet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const {
    data: requestData,
    isLoading: loading,
    isError: requestIsError,
    error: requestError,
  } = useQuery({
    queryKey: ["admin-requests", filter],
    queryFn: () => fetchRequestsList(filter),
  });

  const reservations = requestData?.reservations ?? [];
  const total = requestData?.total ?? 0;

  const {
    data: selected,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: ["reservation-detail", selectedId],
    queryFn: () => fetchReservationDetail(selectedId!),
    enabled: !!selectedId,
  });

  // SSE: auto-refresh when another user updates a reservation
  const invalidateRef = useRef(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
  });

  const handleSSEEvent = useCallback((event: string) => {
    if (event === SSE_EVENTS.RESERVATION_UPDATED) {
      invalidateRef.current();
    }
  }, []);

  useSSE({ onEvent: handleSSEEvent as (event: string, data: unknown) => void });

  const handleApprove = async (id: string, price: number) => {
    const previous = queryClient.getQueriesData({
      queryKey: ["admin-requests"],
    });
    // Optimistic update: remove the reservation from all cached lists
    queryClient.setQueriesData(
      { queryKey: ["admin-requests"] },
      (old: unknown) => {
        const data = old as
          | { reservations?: ReservationListItem[]; total?: number }
          | undefined;
        if (!data?.reservations) return old;
        const nextReservations = data.reservations.filter((r) => r.id !== id);
        const nextTotal =
          typeof data.total === "number" ? Math.max(0, data.total - 1) : data.total;
        return { ...data, reservations: nextReservations, total: nextTotal };
      },
    );

    setActionLoading(true);
    setMessage(null);
    let res: Response | null = null;
    try {
      res = await fetch(`/api/reservations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPrice: price }),
      });
    } catch {
      res = null;
    }
    setActionLoading(false);
    if (res?.ok) {
      setMessage({ text: "Rezervasyon onaylandı.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-detail"] });
      setSelectedId(null);
    } else {
      // rollback
      for (const [key, data] of previous) queryClient.setQueryData(key, data);
      const data = res ? await res.json().catch(() => null) : null;
      setMessage({
        text: (data as { error?: string } | null)?.error ?? "Onaylama başarısız.",
        type: "error",
      });
    }
  };

  const handleReject = async (id: string, reason: string) => {
    const previous = queryClient.getQueriesData({
      queryKey: ["admin-requests"],
    });
    // Optimistic update: remove the reservation from all cached lists
    queryClient.setQueriesData(
      { queryKey: ["admin-requests"] },
      (old: unknown) => {
        const data = old as
          | { reservations?: ReservationListItem[]; total?: number }
          | undefined;
        if (!data?.reservations) return old;
        const nextReservations = data.reservations.filter((r) => r.id !== id);
        const nextTotal =
          typeof data.total === "number" ? Math.max(0, data.total - 1) : data.total;
        return { ...data, reservations: nextReservations, total: nextTotal };
      },
    );

    setActionLoading(true);
    setMessage(null);
    let res: Response | null = null;
    try {
      res = await fetch(`/api/reservations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch {
      res = null;
    }
    setActionLoading(false);
    setRejectTarget(null);
    if (res?.ok) {
      setMessage({ text: "Rezervasyon reddedildi.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-detail"] });
      setSelectedId(null);
    } else {
      // rollback
      for (const [key, data] of previous) queryClient.setQueryData(key, data);
      const data = res ? await res.json().catch(() => null) : null;
      setMessage({
        text: (data as { error?: string } | null)?.error ?? "Reddetme başarısız.",
        type: "error",
      });
    }
  };

  return (
    <div className="text-neutral-100 flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Talep Yönetimi</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Toplam {total} talep
          </p>
        </div>
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
      </div>

      {/* Error */}
      {requestIsError && (
        <div className="px-4 sm:px-6 pt-3">
          <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
            {(requestError as Error)?.message ??
              "Talepler yüklenirken bir hata oluştu."}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sol Panel — Liste */}
        <div
          className={`w-full md:w-96 border-r border-neutral-800 flex flex-col ${selectedId ? "hidden md:flex" : "flex"}`}
        >
          {/* Filtreler */}
          <div className="px-4 py-3 border-b border-neutral-800 flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setFilter(opt.value);
                  setSelectedId(null);
                }}
                aria-pressed={filter === opt.value}
                className={`px-3 py-1 min-h-[44px] text-xs rounded-full font-medium transition-colors ${
                  filter === opt.value
                    ? "bg-amber-500 text-neutral-950"
                    : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto rc-scrollbar">
            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="px-4 py-4 border-b border-neutral-800/60 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="h-4 w-32 bg-neutral-800 rounded" />
                      <div className="h-5 w-16 bg-neutral-800 rounded-full" />
                    </div>
                    <div className="h-3 w-24 bg-neutral-800/60 rounded mb-1.5" />
                    <div className="h-3 w-40 bg-neutral-800/40 rounded" />
                  </div>
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-neutral-500 text-sm">
                Talep bulunamadı.
              </div>
            ) : (
              reservations.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-4 py-4 border-b border-neutral-800/60 hover:bg-neutral-800/50 transition-colors ${
                    selectedId === r.id ? "bg-neutral-800" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-neutral-100 truncate">
                      {r.guestName}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-neutral-400 mb-1">
                    {r.cabana.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(r.startDate)} — {formatDate(r.endDate)}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {formatDate(r.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Sağ Panel — Detay */}
        <div
          className={`absolute inset-0 md:relative md:inset-auto flex-1 overflow-hidden bg-neutral-950 md:bg-transparent ${selectedId ? "flex flex-col" : "hidden md:flex md:flex-col"}`}
        >
          {detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selected ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
                <button
                  onClick={() => setSelectedId(null)}
                  className="min-h-[44px] px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  ← Listeye Dön
                </button>
              </div>
              <DetailPanel
                reservation={selected}
                onApprove={handleApprove}
                onReject={(id) => setRejectTarget(id)}
                actionLoading={actionLoading}
                currency={currency}
                onRefresh={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["admin-requests"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["reservation-detail", selectedId],
                  });
                }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
              Detay görmek için bir talep seçin.
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={(reason) => handleReject(rejectTarget, reason)}
          onCancel={() => setRejectTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
