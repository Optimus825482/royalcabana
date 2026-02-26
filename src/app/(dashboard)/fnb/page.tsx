"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ReservationStatus } from "@/types";

interface ReservationDetail {
  id: string;
  cabanaId: string;
  guestName: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  notes?: string;
  totalPrice?: number;
  cabana: { id: string; name: string };
  user: { id: string; username: string };
  statusHistory: Array<{
    toStatus: string;
    changedBy: string;
    createdAt: string;
    reason?: string;
  }>;
  modifications?: Array<{
    id: string;
    status: string;
    newStartDate?: string;
    newEndDate?: string;
    newGuestName?: string;
  }>;
  cancellations?: Array<{ id: string; status: string; reason: string }>;
  extraConcepts?: Array<{ id: string; status: string; items: string }>;
  extraItems?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product: { name: string };
  }>;
}

interface ReservationListResponse {
  reservations: ReservationDetail[];
  total: number;
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "Bekliyor",
  [ReservationStatus.APPROVED]: "Onaylı",
  [ReservationStatus.REJECTED]: "Reddedildi",
  [ReservationStatus.CANCELLED]: "İptal",
  [ReservationStatus.MODIFICATION_PENDING]: "Değişiklik Bekliyor",
  [ReservationStatus.EXTRA_PENDING]: "Ek Konsept Bekliyor",
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]:
    "bg-yellow-950/60 border-yellow-700/40 text-yellow-400",
  [ReservationStatus.APPROVED]:
    "bg-green-950/60 border-green-700/40 text-green-400",
  [ReservationStatus.REJECTED]: "bg-red-950/50 border-red-800/40 text-red-400",
  [ReservationStatus.CANCELLED]:
    "bg-neutral-800 border-neutral-700 text-neutral-500",
  [ReservationStatus.MODIFICATION_PENDING]:
    "bg-orange-950/50 border-orange-800/40 text-orange-400",
  [ReservationStatus.EXTRA_PENDING]:
    "bg-purple-950/50 border-purple-800/40 text-purple-400",
};

async function fetchReservations(
  status?: string,
): Promise<ReservationListResponse> {
  const url = status
    ? `/api/reservations?status=${status}`
    : "/api/reservations";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  return res.json();
}

export default function FnBPage() {
  useSession({ required: true });

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<ReservationDetail | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reservations", statusFilter],
    queryFn: () => fetchReservations(statusFilter || undefined),
  });

  const reservations = data?.reservations ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            F&B Rezervasyon Takibi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Salt görüntüleme — {data?.total ?? 0} rezervasyon
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[44px] px-4 py-3 text-base sm:text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-300 focus:outline-none focus:border-yellow-500"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS_LABEL).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* List — hide on mobile when detail selected */}
        <div
          className={`flex-1 overflow-y-auto p-4 ${selected ? "hidden md:block" : ""}`}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-48 text-neutral-500 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span>Yükleniyor...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
              {error instanceof Error ? error.message : "Hata oluştu."}
            </div>
          )}

          {!isLoading && reservations.length === 0 && (
            <div className="flex items-center justify-center h-48 text-neutral-600 text-sm">
              Rezervasyon bulunamadı.
            </div>
          )}

          <div className="space-y-2">
            {reservations.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-4 py-3 min-h-[44px] rounded-xl border transition-colors ${
                  selected?.id === r.id
                    ? "bg-neutral-800 border-yellow-700/40"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-100 truncate">
                      {r.guestName}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {r.cabana.name} · {r.startDate.split("T")[0]} →{" "}
                      {r.endDate.split("T")[0]}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>

                {/* Concept products preview for APPROVED */}
                {r.status === ReservationStatus.APPROVED &&
                  r.extraItems &&
                  r.extraItems.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.extraItems.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full"
                        >
                          {item.product.name} ×{item.quantity}
                        </span>
                      ))}
                      {r.extraItems.length > 3 && (
                        <span className="text-xs text-neutral-600">
                          +{r.extraItems.length - 3} daha
                        </span>
                      )}
                    </div>
                  )}
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel — fullscreen on mobile, side panel on desktop */}
        {selected && (
          <div className="fixed inset-0 z-40 bg-neutral-900 overflow-y-auto md:static md:z-auto md:w-80 md:shrink-0 md:border-l md:border-neutral-800">
            <div className="p-5 space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    ←
                  </button>
                  <h2 className="text-sm font-semibold text-yellow-400">
                    {selected.guestName}
                  </h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="hidden md:flex w-11 h-11 items-center justify-center text-neutral-600 hover:text-neutral-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[selected.status]}`}
              >
                {STATUS_LABEL[selected.status]}
              </span>

              {/* Core info */}
              <div className="space-y-2 text-xs">
                {[
                  ["Kabana", selected.cabana.name],
                  ["Başlangıç", selected.startDate.split("T")[0]],
                  ["Bitiş", selected.endDate.split("T")[0]],
                  ...(selected.totalPrice != null
                    ? [
                        [
                          "Toplam",
                          `${selected.totalPrice.toLocaleString("tr-TR")} ₺`,
                        ],
                      ]
                    : []),
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between py-1.5 border-b border-neutral-800"
                  >
                    <span className="text-neutral-500">{label}</span>
                    <span className="text-neutral-200">{value}</span>
                  </div>
                ))}
                {selected.notes && (
                  <div className="py-1.5 border-b border-neutral-800">
                    <p className="text-neutral-500 mb-1">Notlar</p>
                    <p className="text-neutral-300">{selected.notes}</p>
                  </div>
                )}
              </div>

              {/* Extra items (F&B) */}
              {selected.extraItems && selected.extraItems.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">
                    Ekstra Ürünler
                  </p>
                  <div className="space-y-1.5">
                    {selected.extraItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-xs bg-neutral-800/60 rounded-lg px-3 py-2"
                      >
                        <span className="text-neutral-300">
                          {item.product.name} ×{item.quantity}
                        </span>
                        <span className="text-yellow-400">
                          {(item.unitPrice * item.quantity).toLocaleString(
                            "tr-TR",
                          )}{" "}
                          ₺
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending requests (read-only) */}
              {selected.modifications && selected.modifications.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">
                    Değişiklik Talepleri
                  </p>
                  {selected.modifications.map((m) => (
                    <div
                      key={m.id}
                      className="text-xs bg-orange-950/30 border border-orange-800/30 rounded-lg px-3 py-2"
                    >
                      <span className="text-orange-400">{m.status}</span>
                      {m.newGuestName && (
                        <p className="text-neutral-400 mt-0.5">
                          Yeni misafir: {m.newGuestName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selected.cancellations && selected.cancellations.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">
                    İptal Talepleri
                  </p>
                  {selected.cancellations.map((c) => (
                    <div
                      key={c.id}
                      className="text-xs bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2"
                    >
                      <span className="text-red-400">{c.status}</span>
                      <p className="text-neutral-400 mt-0.5">{c.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Status history */}
              {selected.statusHistory.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Durum Geçmişi</p>
                  <div className="space-y-2">
                    {selected.statusHistory.map((h, i) => (
                      <div
                        key={i}
                        className="text-xs bg-neutral-800/60 rounded-lg px-3 py-2"
                      >
                        <div className="flex justify-between">
                          <span className="text-neutral-300 font-medium">
                            {h.toStatus}
                          </span>
                          <span className="text-neutral-600">
                            {new Date(h.createdAt).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        {h.reason && (
                          <p className="text-neutral-500 mt-0.5">{h.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
