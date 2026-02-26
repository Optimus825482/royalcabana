"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReservationCalendar from "@/components/calendar/ReservationCalendar";
import ReservationRequestForm from "@/components/calendar/ReservationRequestForm";
import { ReservationStatus } from "@/types";
import type {
  ReservationEvent,
  CabanaResource,
  CabanaWithStatus,
} from "@/types";

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
  statusHistory: Array<{
    toStatus: string;
    changedBy: string;
    createdAt: string;
    reason?: string;
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

async function fetchReservations(): Promise<ReservationListResponse> {
  const res = await fetch("/api/reservations");
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  return res.json();
}

async function fetchCabanas(): Promise<CabanaWithStatus[]> {
  const res = await fetch("/api/cabanas");
  if (!res.ok) throw new Error("Kabanalar yüklenemedi.");
  return res.json();
}

async function fetchSystemConfig(): Promise<{
  system_open_for_reservation: boolean;
}> {
  const res = await fetch("/api/system/config");
  if (!res.ok) return { system_open_for_reservation: true };
  const data = await res.json();
  if (Array.isArray(data)) {
    const entry = data.find(
      (d: { key: string }) => d.key === "system_open_for_reservation",
    );
    return { system_open_for_reservation: entry?.value === "true" };
  }
  return {
    system_open_for_reservation:
      data.system_open_for_reservation === true ||
      data.system_open_for_reservation === "true",
  };
}

export default function CasinoCalendarPage() {
  useSession({ required: true });
  const queryClient = useQueryClient();

  const [classFilter, setClassFilter] = useState<string>("");
  const [requestModal, setRequestModal] = useState<{
    cabanaId: string;
    cabanaName: string;
    date?: string;
  } | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationDetail | null>(null);

  const { data: reservationData, isLoading: resLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: fetchReservations,
  });

  const { data: cabanas = [], isLoading: cabanasLoading } = useQuery({
    queryKey: ["cabanas"],
    queryFn: fetchCabanas,
  });

  const { data: systemConfig } = useQuery({
    queryKey: ["system-config"],
    queryFn: fetchSystemConfig,
  });

  const systemOpen = systemConfig?.system_open_for_reservation ?? true;
  const isLoading = resLoading || cabanasLoading;

  // FullCalendar resources
  const resources: CabanaResource[] = useMemo(
    () =>
      cabanas.map((c) => ({
        id: c.id,
        title: c.name,
        classId: c.classId,
      })),
    [cabanas],
  );

  // FullCalendar events
  const events: ReservationEvent[] = useMemo(
    () =>
      (reservationData?.reservations ?? []).map((r) => ({
        id: r.id,
        title: r.guestName,
        start: r.startDate.split("T")[0],
        end: r.endDate.split("T")[0],
        resourceId: r.cabanaId,
        status: r.status,
        guestName: r.guestName,
      })),
    [reservationData?.reservations],
  );

  // Unique classes for filter
  const classes = Array.from(
    new Map(
      cabanas.map((c) => [c.classId, c.cabanaClass?.name ?? c.classId]),
    ).entries(),
  );

  const handleDateClick = useCallback(
    (date: string, resourceId: string) => {
      if (!systemOpen) return;
      const cabana = cabanas.find((c) => c.id === resourceId);
      if (!cabana) return;
      setRequestModal({ cabanaId: cabana.id, cabanaName: cabana.name, date });
    },
    [cabanas, systemOpen],
  );

  const handleEventClick = useCallback(
    (event: ReservationEvent) => {
      const detail = reservationData?.reservations.find(
        (r) => r.id === event.id,
      );
      if (detail) setSelectedReservation(detail);
    },
    [reservationData],
  );

  const handleContextMenu = useCallback(
    (
      _event: ReservationEvent,
      _action: "modify" | "cancel" | "extra-concept",
    ) => {
      // 12.4 görevinde implement edilecek modal'lar buraya bağlanacak
    },
    [],
  );

  function handleRequestSuccess() {
    setRequestModal(null);
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* System closed banner */}
      {!systemOpen && (
        <div className="px-6 py-3 bg-amber-950/60 border-b border-amber-700/40 flex items-center gap-2 shrink-0">
          <svg
            className="w-4 h-4 text-amber-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span className="text-sm text-amber-300 font-medium">
            Sistem şu anda rezervasyona kapalıdır.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Rezervasyon Takvimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Takvimde bir tarih seçerek talep oluşturun
          </p>
        </div>

        {/* Class filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-3 text-base sm:text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-300 focus:outline-none focus:border-yellow-500 min-h-[44px]"
        >
          <option value="">Tüm Sınıflar</option>
          {classes.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-neutral-500 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span>Yükleniyor...</span>
              </div>
            </div>
          ) : (
            <ReservationCalendar
              events={events}
              resources={resources}
              onDateClick={systemOpen ? handleDateClick : undefined}
              onEventClick={handleEventClick}
              onContextMenu={handleContextMenu}
              classFilter={classFilter || undefined}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedReservation && (
          <div className="fixed inset-0 z-40 bg-neutral-900 md:static md:inset-auto md:z-auto md:w-72 shrink-0 md:border-l border-neutral-800 md:bg-neutral-900 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-yellow-400">
                  {selectedReservation.guestName}
                </h2>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="w-11 h-11 flex items-center justify-center text-neutral-600 hover:text-neutral-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[selectedReservation.status]}`}
              >
                {STATUS_LABEL[selectedReservation.status]}
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">Kabana</span>
                  <span className="text-neutral-200">
                    {selectedReservation.cabana.name}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">Başlangıç</span>
                  <span className="text-neutral-200">
                    {selectedReservation.startDate.split("T")[0]}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">Bitiş</span>
                  <span className="text-neutral-200">
                    {selectedReservation.endDate.split("T")[0]}
                  </span>
                </div>
                {selectedReservation.totalPrice != null && (
                  <div className="flex justify-between py-1.5 border-b border-neutral-800">
                    <span className="text-neutral-500">Toplam</span>
                    <span className="text-yellow-400 font-semibold">
                      {selectedReservation.totalPrice.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                )}
                {selectedReservation.notes && (
                  <div className="py-1.5 border-b border-neutral-800">
                    <p className="text-neutral-500 mb-1">Notlar</p>
                    <p className="text-neutral-300">
                      {selectedReservation.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Status history */}
              {selectedReservation.statusHistory.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Durum Geçmişi</p>
                  <div className="space-y-2">
                    {selectedReservation.statusHistory.map((h, i) => (
                      <div
                        key={i}
                        className="text-xs bg-neutral-800/60 rounded-lg px-3 py-2"
                      >
                        <div className="flex justify-between items-center">
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

      {/* Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold text-yellow-400 mb-4">
              Rezervasyon Talebi
            </h2>
            <ReservationRequestForm
              cabanaId={requestModal.cabanaId}
              cabanaName={requestModal.cabanaName}
              initialDate={requestModal.date}
              onSuccess={handleRequestSuccess}
              onCancel={() => setRequestModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
