"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReservationStatus, Role } from "@/types";
import {
  formatPrice,
  currencySymbol,
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import { cn } from "@/lib/utils";
import PermissionGate from "@/components/shared/PermissionGate";
import { useSSE } from "@/hooks/useSSE";
import { SSE_EVENTS } from "@/lib/sse-events";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { DataRow } from "@/components/molecules/DataRow";
import { ListPageTemplate } from "@/components/templates";
import { SkeletonCard } from "@/components/atoms/Skeleton";
import { Spinner } from "@/components/atoms/Spinner";

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
  cabana: {
    id: string;
    name: string;
    minibarType?: {
      id: string;
      name: string;
      products?: Array<{
        product: { id: string; name: string; salePrice: number | string };
        quantity: number;
      }>;
    } | null;
  };
  user: { id: string; username: string; email: string };
  _count?: {
    statusHistory: number;
    modifications: number;
    cancellations: number;
    extraConcepts: number;
    extraItems: number;
    extraRequests?: number;
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
  concept?: {
    id: string;
    name: string;
    description?: string;
    serviceFee?: number | string;
    products?: Array<{
      product: { id: string; name: string; salePrice: number | string };
      quantity: number;
    }>;
  } | null;
  minibarType?: {
    id: string;
    name: string;
    products?: Array<{
      product: { id: string; name: string; salePrice: number | string };
      quantity: number;
    }>;
  } | null;
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

/** Map reservation status to design-system Badge variant (token-based). */
const STATUS_BADGE_VARIANT: Record<
  ReservationStatus,
  "warning" | "success" | "danger" | "secondary" | "info" | "default"
> = {
  [ReservationStatus.PENDING]: "warning",
  [ReservationStatus.APPROVED]: "success",
  [ReservationStatus.REJECTED]: "danger",
  [ReservationStatus.CANCELLED]: "secondary",
  [ReservationStatus.MODIFICATION_PENDING]: "warning",
  [ReservationStatus.EXTRA_PENDING]: "info",
  [ReservationStatus.CHECKED_IN]: "success",
  [ReservationStatus.CHECKED_OUT]: "default",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Status Badge (design system token-based) ───────────────────────────────────

function StatusBadge({ status }: { status: ReservationStatus }) {
  const variant = STATUS_BADGE_VARIANT[status];
  return (
    <Badge variant={variant} className="text-xs">
      {STATUS_LABELS[status]}
    </Badge>
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
        className="bg-[var(--rc-card)] border border-[var(--rc-surface-border)] rounded-t-xl sm:rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto rc-scrollbar"
      >
        <h3
          id="reject-modal-title"
          className="text-lg font-semibold text-[var(--rc-text-primary)] mb-4"
        >
          Red Nedeni
        </h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Red nedenini yazın..."
          rows={4}
          className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg px-4 py-3 text-base sm:text-sm text-[var(--rc-text-primary)] placeholder:text-[var(--rc-placeholder)] resize-none focus:outline-none focus:border-[var(--rc-gold)] min-h-[44px]"
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 min-h-[44px] text-sm text-[var(--rc-text-secondary)] hover:text-[var(--rc-text-primary)] transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="px-4 py-2 min-h-[44px] text-sm bg-[var(--rc-danger)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
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
  const [extraRequestPriceInputs, setExtraRequestPriceInputs] = useState<
    Record<string, string>
  >({});

  const { data: extraRequestsData, refetch: refetchExtraRequests } = useQuery({
    queryKey: ["extra-requests", reservation.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/reservations/${reservation.id}/extra-requests`,
      );
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
    void Promise.resolve().then(() => {
      if (reservation.totalPrice) {
        setTotalPrice(String(reservation.totalPrice));
      } else {
        // Auto-calculate from concept + minibar products
        let calc = 0;
        if (reservation.concept?.products) {
          for (const cp of reservation.concept.products) {
            const p =
              typeof cp.product.salePrice === "string"
                ? parseFloat(cp.product.salePrice)
                : cp.product.salePrice;
            calc += p * cp.quantity;
          }
          if (reservation.concept.serviceFee != null) {
            calc += parseFloat(String(reservation.concept.serviceFee));
          }
        }
        if (reservation.minibarType?.products) {
          for (const mp of reservation.minibarType.products) {
            const p =
              typeof mp.product.salePrice === "string"
                ? parseFloat(mp.product.salePrice)
                : mp.product.salePrice;
            calc += p * mp.quantity;
          }
        }
        setTotalPrice(calc > 0 ? String(calc) : "");
      }
    });
  }, [
    reservation.id,
    reservation.totalPrice,
    reservation.concept,
    reservation.minibarType,
  ]);

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
      {/* Talep özeti — başlık ve temel bilgiler */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--rc-text-primary)]">
              {reservation.guestName}
            </h2>
            <p className="text-sm text-[var(--rc-text-secondary)] mt-0.5">
              {reservation.cabana.name}
            </p>
          </div>
          <StatusBadge status={reservation.status} />
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Misafir geçmişi */}
          {reservation.guestId && (
            <>
              {historyLoading ? (
                <p className="text-xs text-[var(--rc-text-muted)] animate-pulse">
                  Misafir geçmişi yükleniyor...
                </p>
              ) : guestHistory && guestHistory.reservations.length > 0 ? (
                <Card className="border-[var(--rc-gold)]/20 bg-[var(--rc-gold)]/5">
                  <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                    <span className="text-xs font-medium text-[var(--rc-gold)]">
                      Misafir Geçmişi
                    </span>
                    <span className="text-[10px] text-[var(--rc-text-muted)]">
                      {guestHistory.summary.totalVisits} ziyaret ·{" "}
                      {guestHistory.summary.totalSpent.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ₺
                    </span>
                  </CardHeader>
                  <CardContent className="py-2 px-3 pt-0">
                    {guestHistory.summary.favoriteCabana && (
                      <div className="text-[10px] text-[var(--rc-text-secondary)] mb-2">
                        Favori:{" "}
                        <span className="text-[var(--rc-text-primary)]">
                          {guestHistory.summary.favoriteCabana}
                        </span>
                        {guestHistory.summary.favoriteConcept && (
                          <span className="ml-2">
                            · <span className="text-[var(--rc-gold)]">{guestHistory.summary.favoriteConcept}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      {guestHistory.reservations
                        .filter((h) => h.id !== reservation.id)
                        .slice(0, 3)
                        .map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between text-[10px] bg-[var(--rc-surface-elevated)] rounded px-2 py-1.5"
                          >
                            <div>
                              <span className="text-[var(--rc-text-primary)]">{h.cabanaName}</span>
                              <span className="text-[var(--rc-text-muted)] ml-1">· {h.days} gün</span>
                              {h.conceptName && (
                                <span className="text-[var(--rc-gold)]/80 ml-1">· {h.conceptName}</span>
                              )}
                              {h.hasExtras && (
                                <span className="text-[var(--rc-info)]/80 ml-1">+ilave</span>
                              )}
                            </div>
                            <span className="text-[var(--rc-text-muted)]">
                              {new Date(h.startDate).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          {/* Temel alanlar — net etiket + değer */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <DataRow label="Başlangıç" value={formatDate(reservation.startDate)} />
            <DataRow label="Bitiş" value={formatDate(reservation.endDate)} />
            <DataRow label="Talep eden" value={reservation.user.username} />
            <DataRow label="Oluşturulma" value={formatDate(reservation.createdAt)} />
          </div>
          {reservation.totalPrice !== null && (
            <div className="pt-1 border-t border-[var(--rc-border-subtle)]">
              <p className="text-xs text-[var(--rc-text-muted)] mb-0.5">Toplam fiyat</p>
              <p className="text-base font-semibold text-[var(--rc-gold)]">
                {formatPrice(reservation.totalPrice, currency)}
              </p>
            </div>
          )}
          {reservation.rejectionReason && (
            <div className="rounded-lg bg-[var(--rc-danger)]/10 border border-[var(--rc-danger)]/20 p-3">
              <p className="text-xs font-medium text-[var(--rc-danger)] mb-0.5">Red nedeni</p>
              <p className="text-sm text-[var(--rc-text-primary)]">{reservation.rejectionReason}</p>
            </div>
          )}
          {reservation.notes && (
            <div>
              <p className="text-xs text-[var(--rc-text-muted)] mb-0.5">Notlar</p>
              <p className="text-sm text-[var(--rc-text-primary)]">{reservation.notes}</p>
            </div>
          )}
          {reservation.customRequests && (
            <div className="rounded-lg bg-[var(--rc-warning)]/10 border border-[var(--rc-warning)]/20 p-3">
              <p className="text-xs font-medium text-[var(--rc-warning)] mb-0.5">Liste dışı talep</p>
              <p className="text-sm text-[var(--rc-text-primary)]">{reservation.customRequests}</p>
              {!reservation.customRequestPriced && (
                <span className="text-[10px] text-[var(--rc-warning)] mt-1 block">
                  Henüz fiyatlandırılmamış
                </span>
              )}
              {reservation.customRequestPriced && reservation.customRequestPrice != null && (
                <span className="text-[10px] text-[var(--rc-success)] mt-1 block">
                  Fiyatlandırıldı:{" "}
                  {parseFloat(String(reservation.customRequestPrice)).toLocaleString("tr-TR", {
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
              <div>
                <p className="text-xs text-[var(--rc-text-muted)] mb-1">Ekstra ürünler (talep ile)</p>
                <div className="space-y-0.5">
                  {(
                    (typeof reservation.extraItems_json === "string"
                      ? JSON.parse(reservation.extraItems_json)
                      : reservation.extraItems_json) as Array<{
                      productId: string;
                      quantity: number;
                      productName?: string;
                    }>
                  ).map((item, i) => (
                    <p key={i} className="text-xs text-[var(--rc-text-primary)]">
                      {item.productName ?? item.productId} × {item.quantity}
                    </p>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Fiyat kırılımı */}
      {(reservation.concept?.products?.length ||
        reservation.minibarType?.products?.length) && (
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-2">
            <CardTitle>Fiyat kırılımı</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
          <div className="space-y-3">
            {reservation.concept?.products && reservation.concept.products.length > 0 && (
              <div>
                <p className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-1.5">
                  {reservation.concept.name} (Konsept)
                </p>
                <div className="space-y-1">
                  {reservation.concept.products.map((cp, i) => {
                    const price = typeof cp.product.salePrice === "string" ? parseFloat(cp.product.salePrice) : cp.product.salePrice;
                    return (
                      <div key={i} className="flex justify-between text-xs bg-[var(--rc-surface-elevated)] rounded px-3 py-1.5">
                        <span className="text-[var(--rc-text-primary)]">{cp.product.name} <span className="text-[var(--rc-text-muted)]">×{cp.quantity}</span></span>
                        <span className="tabular-nums text-[var(--rc-text-secondary)]">{formatPrice(price * cp.quantity, currency)}</span>
                      </div>
                    );
                  })}
                  {reservation.concept.serviceFee != null && parseFloat(String(reservation.concept.serviceFee)) > 0 && (
                    <div className="flex justify-between text-xs bg-[var(--rc-surface-elevated)] rounded px-3 py-1.5">
                      <span className="text-[var(--rc-text-primary)]">Hizmet bedeli</span>
                      <span className="tabular-nums text-[var(--rc-text-secondary)]">{formatPrice(parseFloat(String(reservation.concept.serviceFee)), currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {reservation.minibarType?.products && reservation.minibarType.products.length > 0 && (
              <div>
                <p className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-1.5">
                  {reservation.minibarType.name} (Minibar)
                </p>
                <div className="space-y-1">
                  {reservation.minibarType.products.map((mp, i) => {
                    const price = typeof mp.product.salePrice === "string" ? parseFloat(mp.product.salePrice) : mp.product.salePrice;
                    return (
                      <div key={i} className="flex justify-between text-xs bg-[var(--rc-surface-elevated)] rounded px-3 py-1.5">
                        <span className="text-[var(--rc-text-primary)]">{mp.product.name} <span className="text-[var(--rc-text-muted)]">×{mp.quantity}</span></span>
                        <span className="tabular-nums text-[var(--rc-success)]">{formatPrice(price * mp.quantity, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(() => {
              let total = 0;
              if (reservation.concept?.products) {
                for (const cp of reservation.concept.products) {
                  const p = typeof cp.product.salePrice === "string" ? parseFloat(cp.product.salePrice) : cp.product.salePrice;
                  total += p * cp.quantity;
                }
                if (reservation.concept.serviceFee != null) total += parseFloat(String(reservation.concept.serviceFee));
              }
              if (reservation.minibarType?.products) {
                for (const mp of reservation.minibarType.products) {
                  const p = typeof mp.product.salePrice === "string" ? parseFloat(mp.product.salePrice) : mp.product.salePrice;
                  total += p * mp.quantity;
                }
              }
              return total > 0 ? (
                <div className="flex justify-between text-xs font-medium bg-[var(--rc-surface-elevated)] rounded-lg px-3 py-2 border border-[var(--rc-surface-border)] mt-1">
                  <span className="text-[var(--rc-text-primary)]">Hesaplanan toplam</span>
                  <span className="text-[var(--rc-gold)] font-semibold">{formatPrice(total, currency)}</span>
                </div>
              ) : null;
            })()}
          </div>
          </CardContent>
        </Card>
      )}

      {/* Fiyat belirle ve onayla / reddet */}
      {isPending && (
        <PermissionGate allowedRoles={[Role.FNB_ADMIN, Role.FNB_USER]}>
          <Card className="rounded-none border-x-0 border-t-0">
            <CardHeader className="pb-2">
              <CardTitle>Fiyat belirle ve onayla</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-[var(--rc-text-muted)] mb-1 block">
                    Toplam fiyat ({currencySymbol(currency)})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg px-4 py-3 text-base sm:text-sm text-[var(--rc-text-primary)] focus:outline-none focus:border-[var(--rc-gold)] min-h-[44px]"
                  />
                </div>
                <button
                  onClick={() => {
                    const price = parseFloat(totalPrice);
                    if (!isNaN(price) && price >= 0) onApprove(reservation.id, price);
                  }}
                  disabled={!totalPrice || isNaN(parseFloat(totalPrice)) || actionLoading}
                  className="px-4 py-2 min-h-[44px] bg-[var(--rc-success)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {actionLoading ? "İşleniyor..." : "Onayla"}
                </button>
                <button
                  onClick={() => onReject(reservation.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 min-h-[44px] bg-[var(--rc-danger)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Reddet
                </button>
              </div>
              {reservation.customRequests && !reservation.customRequestPriced && (
                <div className="mt-4 p-3 rounded-lg border border-[var(--rc-warning)]/20 bg-[var(--rc-warning)]/10">
                  <p className="text-xs text-[var(--rc-warning)] mb-2">
                    Liste dışı talep: <span className="text-[var(--rc-text-primary)]">{reservation.customRequests}</span>
                  </p>
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[100px]">
                      <label className="text-[10px] text-[var(--rc-text-muted)] mb-1 block">Talep fiyatı ({currencySymbol(currency)})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        id={`custom-price-${reservation.id}`}
                        placeholder="0.00"
                        className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg px-3 py-2 text-sm text-[var(--rc-text-primary)] focus:outline-none focus:border-[var(--rc-gold)] min-h-[44px]"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const input = document.getElementById(`custom-price-${reservation.id}`) as HTMLInputElement;
                        const price = parseFloat(input?.value ?? "0");
                        if (isNaN(price) || price < 0) return;
                        try {
                          const res = await fetch(`/api/reservations/${reservation.id}/custom-request-price`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ price }),
                          });
                          if (res.ok) onRefresh();
                          else {
                            const errData = await res.json().catch(() => ({}));
                            alert((errData as { error?: string })?.error || "Fiyatlandırma başarısız.");
                          }
                        } catch {
                          alert("Sunucuya bağlanılamadı.");
                        }
                      }}
                      className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-warning)] hover:opacity-90 text-[var(--rc-card)] rounded-lg font-medium transition-colors"
                    >
                      Fiyatlandır
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </PermissionGate>
      )}

      {/* Durum geçmişi */}
      {reservation.statusHistory.length > 0 && (
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-2">
            <CardTitle>Durum geçmişi</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {reservation.statusHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--rc-gold)] mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[var(--rc-text-secondary)]">
                      {h.fromStatus ? `${STATUS_LABELS[h.fromStatus as ReservationStatus] ?? h.fromStatus} → ` : ""}
                      <span className="text-[var(--rc-text-primary)] font-medium">
                        {STATUS_LABELS[h.toStatus as ReservationStatus] ?? h.toStatus}
                      </span>
                    </span>
                    {h.reason && <p className="text-[var(--rc-text-muted)] mt-0.5">{h.reason}</p>}
                    <p className="text-[var(--rc-text-muted)] mt-0.5">{formatDate(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Değişiklik talepleri */}
      {(reservation.modifications?.length ?? 0) > 0 && (
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-2">
            <CardTitle>Değişiklik talepleri ({reservation.modifications?.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {pendingModifications.map((mod) => (
              <div key={mod.id} className="bg-[var(--rc-warning)]/10 border border-[var(--rc-warning)]/20 rounded-lg p-4 space-y-2">
                <Badge variant="warning" className="text-xs">Bekliyor</Badge>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {mod.newStartDate && <DataRow label="Yeni başlangıç" value={formatDate(mod.newStartDate)} />}
                  {mod.newEndDate && <DataRow label="Yeni bitiş" value={formatDate(mod.newEndDate)} />}
                  {mod.newGuestName && <div className="col-span-2"><DataRow label="Yeni misafir adı" value={mod.newGuestName} /></div>}
                  {mod.newCabanaId && <div className="col-span-2"><DataRow label="Yeni cabana" value={mod.newCabanaId} /></div>}
                </div>
                <PermissionGate allowedRoles={[Role.FNB_ADMIN, Role.FNB_USER]}>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <button
                      onClick={() => handleSubAction("modifications", mod.id, "approve")}
                      disabled={subActionLoading === mod.id}
                      className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-success)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      {subActionLoading === mod.id ? "İşleniyor..." : "Onayla"}
                    </button>
                    <button
                      onClick={() => setSubRejectTarget({ type: "modification", id: mod.id })}
                      disabled={subActionLoading === mod.id}
                      className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-danger)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      Reddet
                    </button>
                  </div>
                </PermissionGate>
              </div>
            ))}
            {otherModifications.map((mod) => (
              <div key={mod.id} className="bg-[var(--rc-surface-elevated)] border border-[var(--rc-surface-border)] rounded-lg p-4 opacity-80">
                <Badge variant={mod.status === "APPROVED" ? "success" : "danger"} className="text-xs">
                  {mod.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}
                </Badge>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  {mod.newStartDate && <DataRow label="Yeni başlangıç" value={formatDate(mod.newStartDate)} />}
                  {mod.newEndDate && <DataRow label="Yeni bitiş" value={formatDate(mod.newEndDate)} />}
                  {mod.newGuestName && <div className="col-span-2"><DataRow label="Yeni misafir adı" value={mod.newGuestName} /></div>}
                </div>
                {mod.rejectionReason && (
                  <p className="text-xs text-[var(--rc-danger)] mt-2">Red: {mod.rejectionReason}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* İptal talepleri */}
      {(reservation.cancellations?.length ?? 0) > 0 && (
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-2">
            <CardTitle>İptal talepleri ({reservation.cancellations?.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {pendingCancellations.map((canc) => (
              <div key={canc.id} className="bg-[var(--rc-danger)]/10 border border-[var(--rc-danger)]/20 rounded-lg p-4 space-y-2">
                <Badge variant="warning" className="text-xs">Bekliyor</Badge>
                <div className="text-xs">
                  <p className="text-[var(--rc-text-muted)] mb-0.5">İptal nedeni</p>
                  <p className="text-[var(--rc-text-primary)]">{canc.reason}</p>
                </div>
                <PermissionGate allowedRoles={[Role.FNB_ADMIN, Role.FNB_USER]}>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <button
                      onClick={() => handleSubAction("cancellations", canc.id, "approve")}
                      disabled={subActionLoading === canc.id}
                      className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-success)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      {subActionLoading === canc.id ? "İşleniyor..." : "Onayla"}
                    </button>
                    <button
                      onClick={() => setSubRejectTarget({ type: "cancellation", id: canc.id })}
                      disabled={subActionLoading === canc.id}
                      className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-danger)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      Reddet
                    </button>
                  </div>
                </PermissionGate>
              </div>
            ))}
            {otherCancellations.map((canc) => (
              <div key={canc.id} className="bg-[var(--rc-surface-elevated)] border border-[var(--rc-surface-border)] rounded-lg p-4 opacity-80">
                <Badge variant={canc.status === "APPROVED" ? "success" : "danger"} className="text-xs">
                  {canc.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}
                </Badge>
                <p className="text-xs text-[var(--rc-text-secondary)] mt-2">{canc.reason}</p>
                {canc.rejectionReason && (
                  <p className="text-xs text-[var(--rc-danger)] mt-1">Red: {canc.rejectionReason}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ek konsept talepleri */}
      {(reservation.extraConcepts?.length ?? 0) > 0 && (
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-2">
            <CardTitle>Ek konsept talepleri ({reservation.extraConcepts?.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {pendingExtraConcepts.map((ec) => {
              const items = parseExtraConceptItems(ec.items);
              return (
                <div key={ec.id} className="bg-[var(--rc-info)]/10 border border-[var(--rc-info)]/20 rounded-lg p-4 space-y-2">
                  <Badge variant="info" className="text-xs">Bekliyor</Badge>
                  {items.length > 0 && (
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-[var(--rc-text-primary)]">{item.name} <span className="text-[var(--rc-text-muted)]">×{item.quantity}</span></span>
                          {item.unitPrice != null && (
                            <span className="text-[var(--rc-text-secondary)]">{formatPrice(item.unitPrice * item.quantity, currency)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <PermissionGate allowedRoles={[Role.FNB_ADMIN, Role.FNB_USER]}>
                    <div className="flex gap-2 pt-2 flex-wrap">
                      <button
                        onClick={() => handleSubAction("extra-concepts", ec.id, "approve")}
                        disabled={subActionLoading === ec.id}
                        className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-success)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                      >
                        {subActionLoading === ec.id ? "İşleniyor..." : "Onayla"}
                      </button>
                      <button
                        onClick={() => setSubRejectTarget({ type: "extraConcept", id: ec.id })}
                        disabled={subActionLoading === ec.id}
                        className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-danger)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                      >
                        Reddet
                      </button>
                    </div>
                  </PermissionGate>
                </div>
              );
            })}
            {otherExtraConcepts.map((ec) => {
              const items = parseExtraConceptItems(ec.items);
              return (
                <div key={ec.id} className="bg-[var(--rc-surface-elevated)] border border-[var(--rc-surface-border)] rounded-lg p-4 opacity-80">
                  <Badge variant={ec.status === "APPROVED" ? "success" : "danger"} className="text-xs">
                    {ec.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}
                  </Badge>
                  {items.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-[var(--rc-text-secondary)]">{item.name} ×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ec.rejectionReason && (
                    <p className="text-xs text-[var(--rc-danger)] mt-2">Red: {ec.rejectionReason}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Ekstra talepler (ReservationExtraRequest) */}
      {extraRequests.length > 0 && (
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Ekstra talepler ({extraRequests.length})</CardTitle>
            {extraRequests.filter((er) => er.status === "PENDING").length > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {extraRequests.filter((er) => er.status === "PENDING").length} bekliyor
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {extraRequests.map((er) => {
              const isPendingExtra = er.status === "PENDING";
              const isApprovedExtra = er.status === "APPROVED";
              const isRejectedExtra = er.status === "REJECTED";
              const isCustom = er.type === "CUSTOM";
              const displayName = isCustom ? (er.customName ?? "Özel talep") : (er.product?.name ?? "Ürün");
              const hasPrice = er.unitPrice != null;
              const priceVal = hasPrice ? parseFloat(String(er.unitPrice)) : 0;

              return (
                <div
                  key={er.id}
                  className={cn(
                    "rounded-lg p-4 space-y-2 border",
                    isPendingExtra && "bg-[var(--rc-warning)]/10 border-[var(--rc-warning)]/20",
                    isApprovedExtra && "bg-[var(--rc-success)]/5 border-[var(--rc-success)]/20",
                    isRejectedExtra && "bg-[var(--rc-surface-elevated)] border-[var(--rc-danger)]/20 opacity-80",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isCustom ? "warning" : "info"} className="text-[9px] uppercase tracking-wider">
                        {isCustom ? "Özel" : "Ürün"}
                      </Badge>
                      <span className="text-sm font-medium text-[var(--rc-text-primary)]">{displayName}</span>
                      <span className="text-xs text-[var(--rc-text-muted)]">×{er.quantity}</span>
                    </div>
                    <Badge
                      variant={isPendingExtra ? "warning" : isApprovedExtra ? "success" : "danger"}
                      className="text-xs"
                    >
                      {isPendingExtra ? "Bekliyor" : isApprovedExtra ? "Onaylandı" : "Reddedildi"}
                    </Badge>
                  </div>

                  {isCustom && er.customDesc && (
                    <p className="text-xs text-[var(--rc-text-secondary)]">{er.customDesc}</p>
                  )}

                  {hasPrice && (
                    <div className="text-xs text-[var(--rc-text-secondary)]">
                      Birim fiyat: <span className="text-[var(--rc-gold)] font-medium">{priceVal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currencySymbol(currency)}</span>
                      <span className="text-[var(--rc-text-muted)] ml-2">Toplam: {(priceVal * er.quantity).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currencySymbol(currency)}</span>
                    </div>
                  )}

                  {isRejectedExtra && er.rejectionReason && (
                    <p className="text-xs text-[var(--rc-danger)]">Red: {er.rejectionReason}</p>
                  )}

                  {isPendingExtra && (
                    <PermissionGate allowedRoles={[Role.FNB_ADMIN, Role.FNB_USER]}>
                      <div className="flex flex-wrap items-end gap-2 pt-2">
                        {isCustom && !hasPrice && (
                          <>
                            <div className="flex-1 min-w-[100px]">
                              <label className="text-[10px] text-[var(--rc-text-muted)] mb-1 block">Birim fiyat ({currencySymbol(currency)})</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={extraRequestPriceInputs[er.id] ?? ""}
                                onChange={(e) => setExtraRequestPriceInputs((prev) => ({ ...prev, [er.id]: e.target.value }))}
                                placeholder="0.00"
                                className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg px-3 py-2 text-sm text-[var(--rc-text-primary)] focus:outline-none focus:border-[var(--rc-gold)] min-h-[44px]"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const price = parseFloat(extraRequestPriceInputs[er.id] ?? "0");
                                if (isNaN(price) || price < 0) return;
                                handleExtraRequestAction(er.id, "price", { unitPrice: price });
                              }}
                              disabled={subActionLoading === er.id}
                              className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-warning)] hover:opacity-90 disabled:opacity-50 text-[var(--rc-card)] rounded-lg font-medium transition-colors whitespace-nowrap"
                            >
                              Fiyatlandır
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleExtraRequestAction(er.id, "approve")}
                          disabled={subActionLoading === er.id}
                          className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-success)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                          {subActionLoading === er.id ? "İşleniyor..." : "Onayla"}
                        </button>
                        <button
                          onClick={() => setSubRejectTarget({ type: "extraRequest", id: er.id })}
                          disabled={subActionLoading === er.id}
                          className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-danger)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                          Reddet
                        </button>
                      </div>
                    </PermissionGate>
                  )}

                  {isApprovedExtra && isCustom && !hasPrice && (
                    <PermissionGate allowedRoles={[Role.FNB_ADMIN, Role.FNB_USER]}>
                      <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-[var(--rc-surface-border)]">
                        <div className="flex-1 min-w-[100px]">
                          <label className="text-[10px] text-[var(--rc-warning)] mb-1 block">Fiyatlandırma bekleniyor</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={extraRequestPriceInputs[er.id] ?? ""}
                            onChange={(e) => setExtraRequestPriceInputs((prev) => ({ ...prev, [er.id]: e.target.value }))}
                            placeholder="0.00"
                            className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg px-3 py-2 text-sm text-[var(--rc-text-primary)] focus:outline-none focus:border-[var(--rc-gold)] min-h-[44px]"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const price = parseFloat(extraRequestPriceInputs[er.id] ?? "0");
                            if (isNaN(price) || price < 0) return;
                            handleExtraRequestAction(er.id, "price", { unitPrice: price });
                          }}
                          disabled={subActionLoading === er.id}
                          className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-warning)] hover:opacity-90 disabled:opacity-50 text-[var(--rc-card)] rounded-lg font-medium transition-colors"
                        >
                          Fiyatlandır
                        </button>
                      </div>
                    </PermissionGate>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Alt talep red nedeni (inline form) */}
      {subRejectTarget && (
        <Card className="rounded-none border-x-0 border-t-0 bg-[var(--rc-surface-elevated)]">
          <CardHeader className="pb-2">
            <CardTitle>Red nedeni</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <textarea
              value={subRejectReason}
              onChange={(e) => setSubRejectReason(e.target.value)}
              placeholder="Red nedenini yazın..."
              rows={3}
              className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg px-3 py-2 text-sm text-[var(--rc-text-primary)] placeholder:text-[var(--rc-text-muted)] resize-none focus:outline-none focus:border-[var(--rc-gold)] min-h-[80px] mb-3"
            />
            <div className="flex gap-2 justify-end flex-wrap">
              <button
                onClick={() => { setSubRejectTarget(null); setSubRejectReason(""); }}
                className="px-3 py-2 min-h-[44px] text-xs text-[var(--rc-text-secondary)] hover:text-[var(--rc-text-primary)] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (!subRejectReason.trim()) return;
                  if (subRejectTarget.type === "extraRequest") {
                    handleExtraRequestAction(subRejectTarget.id, "reject", { rejectionReason: subRejectReason.trim() });
                    return;
                  }
                  const typeMap = { modification: "modifications", cancellation: "cancellations", extraConcept: "extra-concepts" } as const;
                  handleSubAction(typeMap[subRejectTarget.type], subRejectTarget.id, "reject", subRejectReason.trim());
                }}
                disabled={!subRejectReason.trim() || subActionLoading !== null}
                className="px-3 py-2 min-h-[44px] text-xs bg-[var(--rc-danger)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                Reddet
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_FILTER: string = ReservationStatus.PENDING;

export default function CasinoAdminRequestsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>(DEFAULT_FILTER);
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

  const { data: selected, isLoading: detailLoading } = useQuery({
    queryKey: ["reservation-detail", selectedId],
    queryFn: () => fetchReservationDetail(selectedId!),
    enabled: !!selectedId,
  });

  // SSE: auto-refresh when another user updates a reservation
  const invalidateRef = useRef(() => {
    queryClient.invalidateQueries({ queryKey: ["casino-admin-requests"] });
  });

  const handleSSEEvent = useCallback((event: string) => {
    if (event === SSE_EVENTS.RESERVATION_UPDATED) {
      invalidateRef.current();
    }
  }, []);

  useSSE({ onEvent: handleSSEEvent as (event: string, data: unknown) => void });

  const handleApprove = async (id: string, price: number) => {
    const previous = queryClient.getQueriesData({
      queryKey: ["casino-admin-requests"],
    });
    // Optimistic update: remove the reservation from all cached lists
    queryClient.setQueriesData(
      { queryKey: ["casino-admin-requests"] },
      (old: unknown) => {
        const data = old as
          | { reservations?: ReservationListItem[]; total?: number }
          | undefined;
        if (!data?.reservations) return old;
        const nextReservations = data.reservations.filter((r) => r.id !== id);
        const nextTotal =
          typeof data.total === "number"
            ? Math.max(0, data.total - 1)
            : data.total;
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
      queryClient.invalidateQueries({ queryKey: ["casino-admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-detail"] });
      setSelectedId(null);
    } else {
      // rollback
      for (const [key, data] of previous) queryClient.setQueryData(key, data);
      const data = res ? await res.json().catch(() => null) : null;
      setMessage({
        text:
          (data as { error?: string } | null)?.error ?? "Onaylama başarısız.",
        type: "error",
      });
    }
  };

  const handleReject = async (id: string, reason: string) => {
    const previous = queryClient.getQueriesData({
      queryKey: ["casino-admin-requests"],
    });
    // Optimistic update: remove the reservation from all cached lists
    queryClient.setQueriesData(
      { queryKey: ["casino-admin-requests"] },
      (old: unknown) => {
        const data = old as
          | { reservations?: ReservationListItem[]; total?: number }
          | undefined;
        if (!data?.reservations) return old;
        const nextReservations = data.reservations.filter((r) => r.id !== id);
        const nextTotal =
          typeof data.total === "number"
            ? Math.max(0, data.total - 1)
            : data.total;
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
      queryClient.invalidateQueries({ queryKey: ["casino-admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-detail"] });
      setSelectedId(null);
    } else {
      // rollback
      for (const [key, data] of previous) queryClient.setQueryData(key, data);
      const data = res ? await res.json().catch(() => null) : null;
      setMessage({
        text:
          (data as { error?: string } | null)?.error ?? "Reddetme başarısız.",
        type: "error",
      });
    }
  };

  return (
    <ListPageTemplate
      title="Talep Yönetimi"
      subtitle={
        total === 0
          ? "Henüz talep yok"
          : filter === ReservationStatus.PENDING
            ? `${total} bekleyen talep`
            : `Toplam ${total} talep`
      }
      className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 py-4 max-w-none"
      toolbar={
        message ? (
          <div
            className={cn(
              "text-sm px-4 py-2 rounded-lg",
              message.type === "success"
                ? "bg-[var(--rc-success)]/20 text-[var(--rc-success)] border border-[var(--rc-success)]/30"
                : "bg-[var(--rc-danger)]/20 text-[var(--rc-danger)] border border-[var(--rc-danger)]/30",
            )}
          >
            {message.text}
          </div>
        ) : null
      }
    >
      {/* Error */}
      {requestIsError && (
        <div className="px-4 sm:px-6 pt-3">
          <div className="px-4 py-2.5 bg-[var(--rc-danger)]/10 border border-[var(--rc-danger)]/30 text-[var(--rc-danger)] text-sm rounded-lg">
            {(requestError as Error)?.message ??
              "Talepler yüklenirken bir hata oluştu."}
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border border-[var(--rc-border-subtle)] bg-[var(--rc-card)] mt-4">
        {/* Sol Panel — Liste */}
        <div
          className={cn(
            "w-full md:w-96 border-r border-[var(--rc-border-subtle)] flex flex-col flex-shrink-0",
            selectedId ? "hidden md:flex" : "flex",
          )}
        >
          {/* Filtreler */}
          <div className="px-4 py-3 border-b border-[var(--rc-border-subtle)] flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setFilter(String(opt.value));
                  setSelectedId(null);
                }}
                aria-pressed={filter === opt.value}
                className={cn(
                  "px-3 py-1 min-h-[44px] text-xs rounded-full font-medium transition-colors",
                  filter === opt.value
                    ? "bg-[var(--rc-gold)] text-[var(--rc-card)]"
                    : "bg-[var(--rc-surface-elevated)] text-[var(--rc-text-secondary)] hover:text-[var(--rc-text-primary)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto rc-scrollbar min-h-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} className="h-20 min-h-0" lines={2} />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] px-4 text-center">
                <p className="text-sm font-medium text-[var(--rc-text-secondary)] mb-1">
                  {filter ? "Bu filtreye uygun talep yok" : "Henüz talep yok"}
                </p>
                <p className="text-xs text-[var(--rc-text-muted)]">
                  {filter === ReservationStatus.PENDING
                    ? "Yeni rezervasyon talepleri burada listelenecek."
                    : "Filtreyi değiştirerek tüm talepleri görebilirsiniz."}
                </p>
              </div>
            ) : (
              reservations.map((r) => {
                const subCount =
                  (r._count?.modifications ?? 0) +
                  (r._count?.cancellations ?? 0) +
                  (r._count?.extraConcepts ?? 0) +
                  (r._count?.extraRequests ?? 0);
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      "w-full text-left px-4 py-4 border-b border-[var(--rc-border-subtle)] hover:bg-[var(--rc-card-hover)] transition-colors min-h-[44px]",
                      selectedId === r.id && "bg-[var(--rc-card-hover)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium text-[var(--rc-text-primary)] truncate">
                        {r.guestName}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-[var(--rc-text-secondary)] mb-1">
                      {r.cabana.name}
                    </p>
                    <p className="text-xs text-[var(--rc-text-muted)]">
                      {formatDate(r.startDate)} — {formatDate(r.endDate)}
                    </p>
                    {subCount > 0 && (
                      <p className="text-[10px] text-[var(--rc-warning)] mt-1 font-medium">
                        {subCount} alt talep bekliyor
                      </p>
                    )}
                    <p className="text-xs text-[var(--rc-text-muted)] mt-1 opacity-80">
                      {formatDate(r.createdAt)}
                    </p>
                  </button>
                );
              })
            )
            }
          </div>
        </div>

        {/* Sağ Panel — Detay */}
        <div
          className={cn(
            "absolute inset-0 md:relative md:inset-auto flex-1 overflow-hidden bg-[var(--rc-background)] md:bg-transparent min-w-0 flex flex-col",
            selectedId ? "flex" : "hidden md:flex",
          )}
        >
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Spinner size="md" aria-label="Talep detayı yükleniyor" />
              <p className="text-sm text-[var(--rc-text-muted)]">Talep detayı yükleniyor...</p>
            </div>
          ) : selected ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden px-4 py-3 border-b border-[var(--rc-border-subtle)] flex items-center gap-2 bg-[var(--rc-card)]">
                <button
                  onClick={() => setSelectedId(null)}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-[var(--rc-text-secondary)] hover:text-[var(--rc-text-primary)] transition-colors rounded-lg -ml-1"
                  aria-label="Listeye dön"
                >
                  ← Listeye dön
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
                    queryKey: ["casino-admin-requests"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["reservation-detail", selectedId],
                  });
                }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--rc-text-muted)] text-sm p-6">
              Detay görmek için soldan bir talep seçin.
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
    </ListPageTemplate>
  );
}
