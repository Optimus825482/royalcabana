"use client";

import { useState, useEffect, useCallback } from "react";
import { ReservationStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

interface Reservation {
  id: string;
  guestName: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  status: ReservationStatus;
  totalPrice: number | null;
  rejectionReason: string | null;
  createdAt: string;
  cabana: { id: string; name: string };
  user: { id: string; username: string; email: string };
  statusHistory: StatusHistoryEntry[];
  modifications?: unknown[];
  cancellations?: unknown[];
  extraConcepts?: unknown[];
  extraItems?: unknown[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "Bekliyor",
  [ReservationStatus.APPROVED]: "Onaylandı",
  [ReservationStatus.REJECTED]: "Reddedildi",
  [ReservationStatus.CANCELLED]: "İptal",
  [ReservationStatus.MODIFICATION_PENDING]: "Değişiklik Bekliyor",
  [ReservationStatus.EXTRA_PENDING]: "Ek Konsept Bekliyor",
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-700 rounded-t-xl sm:rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">
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
}: {
  reservation: Reservation;
  onApprove: (id: string, price: number) => void;
  onReject: (id: string) => void;
  actionLoading: boolean;
}) {
  const [totalPrice, setTotalPrice] = useState(
    reservation.totalPrice ? String(reservation.totalPrice) : "",
  );

  useEffect(() => {
    setTotalPrice(reservation.totalPrice ? String(reservation.totalPrice) : "");
  }, [reservation.id, reservation.totalPrice]);

  const isPending = reservation.status === ReservationStatus.PENDING;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
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
                {reservation.totalPrice.toLocaleString("tr-TR")} ₺
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
        </div>
      </div>

      {/* Onay/Red Aksiyonları */}
      {isPending && (
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Fiyat Belirle ve Onayla
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-neutral-500 mb-1 block">
                Toplam Fiyat (₺)
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
        </div>
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

      {/* Alt Talepler */}
      {(reservation.modifications?.length ?? 0) > 0 && (
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">
            Değişiklik Talepleri ({reservation.modifications?.length})
          </h3>
          <p className="text-xs text-neutral-500">
            Değişiklik talepleri mevcut.
          </p>
        </div>
      )}

      {(reservation.cancellations?.length ?? 0) > 0 && (
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">
            İptal Talepleri ({reservation.cancellations?.length})
          </h3>
          <p className="text-xs text-neutral-500">İptal talepleri mevcut.</p>
        </div>
      )}

      {(reservation.extraConcepts?.length ?? 0) > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-medium text-neutral-300 mb-2">
            Ek Konsept Talepleri ({reservation.extraConcepts?.length})
          </h3>
          <p className="text-xs text-neutral-500">
            Ek konsept talepleri mevcut.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filter) params.set("status", filter);
    const res = await fetch(`/api/reservations?${params}`);
    if (res.ok) {
      const data = await res.json();
      setReservations(data.reservations ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleApprove = async (id: string, price: number) => {
    setActionLoading(true);
    setMessage(null);
    const res = await fetch(`/api/reservations/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalPrice: price }),
    });
    setActionLoading(false);
    if (res.ok) {
      setMessage({ text: "Rezervasyon onaylandı.", type: "success" });
      await fetchReservations();
      setSelected(null);
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "Onaylama başarısız.", type: "error" });
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setActionLoading(true);
    setMessage(null);
    const res = await fetch(`/api/reservations/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setActionLoading(false);
    setRejectTarget(null);
    if (res.ok) {
      setMessage({ text: "Rezervasyon reddedildi.", type: "success" });
      await fetchReservations();
      setSelected(null);
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "Reddetme başarısız.", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sol Panel — Liste */}
        <div
          className={`w-full md:w-96 border-r border-neutral-800 flex flex-col ${selected ? "hidden md:flex" : "flex"}`}
        >
          {/* Filtreler */}
          <div className="px-4 py-3 border-b border-neutral-800 flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setFilter(opt.value);
                  setSelected(null);
                }}
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
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-neutral-500 text-sm">
                Yükleniyor...
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-neutral-500 text-sm">
                Talep bulunamadı.
              </div>
            ) : (
              reservations.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-4 py-4 border-b border-neutral-800/60 hover:bg-neutral-800/50 transition-colors ${
                    selected?.id === r.id ? "bg-neutral-800" : ""
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
          className={`absolute inset-0 md:relative md:inset-auto flex-1 overflow-hidden bg-neutral-950 md:bg-transparent ${selected ? "flex flex-col" : "hidden md:flex md:flex-col"}`}
        >
          {selected ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
                <button
                  onClick={() => setSelected(null)}
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
