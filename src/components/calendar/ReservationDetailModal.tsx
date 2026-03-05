"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Check,
  Ban,
  LogIn,
  LogOut,
  DollarSign,
  Calendar,
  User,
  MapPin,
  Tag,
  Clock,
  Bell,
} from "lucide-react";
import { ReservationStatus } from "@/types";
import { formatPrice, type CurrencyCode } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReservationDetailData {
  id: string;
  cabanaId: string;
  guestName: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  notes?: string;
  totalPrice?: number;
  conceptId?: string | null;
  concept?: { id: string; name: string } | null;
  cabana: {
    id: string;
    name: string;
    cabanaClass?: { id: string; name: string } | null;
  };
  user?: { id: string; username: string };
  statusHistory?: Array<{
    toStatus: string;
    changedBy: string;
    createdAt: string;
    reason?: string;
  }>;
}

interface ReservationDetailModalProps {
  reservation: ReservationDetailData;
  onClose: () => void;
  onAction?: () => void;
  currency: CurrencyCode;
  showActions?: boolean; // admin/sysadmin = true, casino = false
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "Bekliyor",
  [ReservationStatus.APPROVED]: "Onaylı",
  [ReservationStatus.REJECTED]: "Reddedildi",
  [ReservationStatus.CANCELLED]: "İptal",
  [ReservationStatus.MODIFICATION_PENDING]: "Değişiklik Bekliyor",
  [ReservationStatus.EXTRA_PENDING]: "Ek Konsept Bekliyor",
  [ReservationStatus.CHECKED_IN]: "Giriş Yapıldı",
  [ReservationStatus.CHECKED_OUT]: "Çıkış Yapıldı",
};

const STATUS_STYLE: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]:
    "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
  [ReservationStatus.APPROVED]:
    "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
  [ReservationStatus.REJECTED]: "bg-red-500/20 border-red-500/40 text-red-400",
  [ReservationStatus.CANCELLED]:
    "bg-neutral-500/20 border-neutral-500/40 text-neutral-400",
  [ReservationStatus.MODIFICATION_PENDING]:
    "bg-orange-500/20 border-orange-500/40 text-orange-400",
  [ReservationStatus.EXTRA_PENDING]:
    "bg-purple-500/20 border-purple-500/40 text-purple-400",
  [ReservationStatus.CHECKED_IN]:
    "bg-teal-500/20 border-teal-500/40 text-teal-400",
  [ReservationStatus.CHECKED_OUT]:
    "bg-slate-500/20 border-slate-500/40 text-slate-400",
};

const STATUS_DOT: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "bg-yellow-400",
  [ReservationStatus.APPROVED]: "bg-emerald-400",
  [ReservationStatus.REJECTED]: "bg-red-400",
  [ReservationStatus.CANCELLED]: "bg-neutral-500",
  [ReservationStatus.MODIFICATION_PENDING]: "bg-orange-400",
  [ReservationStatus.EXTRA_PENDING]: "bg-purple-400",
  [ReservationStatus.CHECKED_IN]: "bg-teal-400",
  [ReservationStatus.CHECKED_OUT]: "bg-slate-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTR(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function dayCount(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReservationDetailModal({
  reservation,
  onClose,
  onAction,
  currency,
  showActions = false,
}: ReservationDetailModalProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [manualPrice, setManualPrice] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap + ESC close
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
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
    // Focus close button on mount
    const closeBtn = modalRef.current?.querySelector<HTMLElement>(
      'button[aria-label="Kapat"]',
    );
    closeBtn?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const canApprove = reservation.status === ReservationStatus.PENDING;
  const canReject = reservation.status === ReservationStatus.PENDING;
  const canCheckIn = reservation.status === ReservationStatus.APPROVED;
  const canCheckOut = reservation.status === ReservationStatus.CHECKED_IN;
  const days = dayCount(reservation.startDate, reservation.endDate);
  const cabanaClassName = reservation.cabana.cabanaClass?.name;
  const conceptName = reservation.concept?.name;

  // ── Action handlers ─────────────────────────────────────────────

  async function handleAction(
    endpoint: string,
    body: Record<string, unknown> = {},
  ) {
    setActionLoading(endpoint);
    setError("");
    try {
      const res = await fetch(
        `/api/reservations/${reservation.id}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "İşlem başarısız.");
        setActionLoading(null);
        return;
      }
      setSuccessMsg("İşlem başarıyla tamamlandı.");
      setTimeout(() => {
        setSuccessMsg("");
        onAction?.();
        onClose();
      }, 1200);
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    }
    setActionLoading(null);
  }

  function handleApprove() {
    const body: Record<string, unknown> = {};
    if (manualPrice && !isNaN(parseFloat(manualPrice))) {
      body.totalPrice = parseFloat(manualPrice);
    }
    handleAction("approve", body);
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      setError("Red sebebi zorunludur.");
      return;
    }
    handleAction("reject", { reason: rejectReason });
  }

  async function handleSendReminder() {
    setReminderLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/send-reminder`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Hatırlatma gönderilemedi.");
        return;
      }
      setSuccessMsg("Hatırlatma gönderildi.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setReminderLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-detail-title"
    >
      <div
        ref={modalRef}
        className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>

        {/* ── HEADER: Cabana adı büyük + renkli ──────────────────── */}
        <div className="relative px-4 sm:px-5 pt-4 pb-4 border-b border-neutral-800/60 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-800 active:bg-neutral-700 text-neutral-500 hover:text-neutral-200 transition-colors touch-manipulation"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Cabana adı - büyük ve renkli */}
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
            <h2
              id="reservation-detail-title"
              className="text-xl font-bold text-amber-400 tracking-tight uppercase"
            >
              {reservation.cabana.name}
            </h2>
          </div>

          {/* Cabana sınıfı */}
          {cabanaClassName && (
            <p className="text-xs text-neutral-500 ml-7">{cabanaClassName}</p>
          )}

          {/* Status badge */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLE[reservation.status]}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[reservation.status]}`}
              />
              {STATUS_LABEL[reservation.status]}
            </span>
            <span className="text-[10px] text-neutral-600">{days} gece</span>
          </div>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
          {/* Misafir bilgileri */}
          <div className="bg-neutral-800/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Misafir Bilgileri
              </span>
            </div>
            <InfoRow
              icon={<User className="w-3.5 h-3.5" />}
              label="Ad Soyad"
              value={reservation.guestName}
            />
            <InfoRow
              icon={<Calendar className="w-3.5 h-3.5" />}
              label="Giriş"
              value={formatDateTR(reservation.startDate)}
            />
            <InfoRow
              icon={<Calendar className="w-3.5 h-3.5" />}
              label="Çıkış"
              value={formatDateTR(reservation.endDate)}
            />
            {reservation.notes && (
              <div className="pt-2 border-t border-neutral-700/40">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                  Notlar
                </p>
                <p className="text-sm text-neutral-300">{reservation.notes}</p>
              </div>
            )}
          </div>

          {/* Konsept bilgileri */}
          {conceptName && (
            <div className="bg-neutral-800/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Konsept
                </span>
              </div>
              <p className="text-sm font-medium text-neutral-200">
                {conceptName}
              </p>
            </div>
          )}

          {/* Toplam tutar - sadece admin/casino/sysadmin */}
          {reservation.totalPrice != null && (
            <div className="bg-neutral-800/40 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Toplam Tutar
                  </span>
                </div>
                <span className="text-base font-bold text-amber-400">
                  {formatPrice(Number(reservation.totalPrice), currency)}
                </span>
              </div>
            </div>
          )}

          {/* Durum geçmişi */}
          {(reservation.statusHistory?.length ?? 0) > 0 && (
            <div className="bg-neutral-800/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Durum Geçmişi
                </span>
              </div>
              <div className="space-y-2">
                {(reservation.statusHistory ?? []).map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-neutral-900/60 rounded-lg px-3 py-2"
                  >
                    <span className="text-neutral-300 font-medium">
                      {STATUS_LABEL[h.toStatus as ReservationStatus] ??
                        h.toStatus}
                    </span>
                    <span className="text-neutral-600">
                      {new Date(h.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/30 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-lg px-3 py-2 text-sm text-emerald-400 flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {successMsg}
            </div>
          )}

          {/* Admin: Reject form */}
          {showActions && showRejectForm && canReject && (
            <div className="space-y-3 bg-neutral-800/60 rounded-xl p-4">
              <label className="text-xs text-neutral-400 font-medium">
                Red Sebebi
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 resize-none focus:outline-none focus:border-amber-500 min-h-[80px]"
                placeholder="Reddetme sebebini yazın..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={actionLoading === "reject"}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" />
                  {actionLoading === "reject" ? "Reddediliyor..." : "Reddet"}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* Admin: Manual price input */}
          {showActions && canApprove && !showRejectForm && (
            <div className="bg-neutral-800/60 rounded-xl p-4 space-y-2">
              <label className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Manuel Fiyat (opsiyonel)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="Boş bırakılırsa otomatik hesaplanır"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* ── Casino: Hatırlatma gönder (bekleyen talep) ─────────── */}
        {!showActions && canApprove && (
          <div className="px-4 sm:px-5 py-4 border-t border-neutral-800 shrink-0">
          <button
              type="button"
              onClick={handleSendReminder}
              disabled={reminderLoading}
              className="w-full bg-amber-600/20 hover:bg-amber-600/30 active:bg-amber-600/40 border border-amber-500/40 text-amber-400 font-medium px-4 py-3 min-h-[48px] rounded-xl text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation"
            >
              <Bell className="w-4 h-4" />
              {reminderLoading ? "Gönderiliyor..." : "Hatırlatma gönder"}
            </button>
          </div>
        )}

        {/* ── ACTION BUTTONS (admin/sysadmin only) ───────────────── */}
        {showActions && (canApprove || canCheckIn || canCheckOut) && (
          <div className="px-4 sm:px-5 py-4 border-t border-neutral-800 shrink-0">
            <div className="flex flex-wrap gap-3">
              {canApprove && !showRejectForm && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={!!actionLoading}
                    className="flex-1 min-w-0 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium px-4 py-3 min-h-[48px] rounded-xl text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    {actionLoading === "approve" ? "Onaylanıyor..." : "Onayla"}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={!!actionLoading}
                    className="flex-1 min-w-0 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 border border-red-700/40 disabled:opacity-50 text-red-400 font-medium px-4 py-3 min-h-[48px] rounded-xl text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation"
                  >
                    <Ban className="w-4 h-4 shrink-0" />
                    Reddet
                  </button>
                </>
              )}
              {canCheckIn && (
                <button
                  onClick={() => handleAction("check-in")}
                  disabled={!!actionLoading}
                  className="flex-1 min-w-0 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-medium px-4 py-3 min-h-[48px] rounded-xl text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  {actionLoading === "check-in" ? "İşleniyor..." : "Check-in"}
                </button>
              )}
              {canCheckOut && (
                <button
                  onClick={() => handleAction("check-out")}
                  disabled={!!actionLoading}
                  className="flex-1 min-w-0 bg-slate-600 hover:bg-slate-500 active:bg-slate-700 disabled:opacity-50 text-white font-medium px-4 py-3 min-h-[48px] rounded-xl text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {actionLoading === "check-out" ? "İşleniyor..." : "Check-out"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueClass = "text-neutral-100",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-neutral-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
