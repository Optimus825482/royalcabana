"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReservationCalendar from "@/components/calendar/ReservationCalendar";
import ReservationRequestForm from "@/components/calendar/ReservationRequestForm";
import { ReservationStatus } from "@/types";
import { AlertTriangle, X } from "lucide-react";
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

  const resources: CabanaResource[] = useMemo(
    () => cabanas.map((c) => ({ id: c.id, title: c.name, classId: c.classId })),
    [cabanas],
  );

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
        <div className="px-4 sm:px-6 py-3 bg-amber-950/60 border-b border-amber-700/40 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-300 font-medium">
            Sistem şu anda rezervasyona kapalıdır.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-amber-400">
            Rezervasyon Takvimi
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Bir güne tıklayarak detayları görün, sağ tıklayarak talep oluşturun
          </p>
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-3 text-base sm:text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
        >
          <option value="">Tüm Sınıflar</option>
          {classes.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
        />
      )}

      {/* Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4 p-6">
            <h2 className="text-base font-semibold text-amber-400 mb-4">
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

function ReservationDetailModal({
  reservation,
  onClose,
}: {
  reservation: ReservationDetail;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-base font-semibold text-amber-400">
            {reservation.guestName}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
          <span
            className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[reservation.status]}`}
          >
            {STATUS_LABEL[reservation.status]}
          </span>

          <div className="space-y-3 text-sm">
            <DetailRow label="Kabana" value={reservation.cabana.name} />
            <DetailRow
              label="Başlangıç"
              value={reservation.startDate.split("T")[0]}
            />
            <DetailRow
              label="Bitiş"
              value={reservation.endDate.split("T")[0]}
            />
            {reservation.totalPrice != null && (
              <DetailRow
                label="Toplam"
                value={`${reservation.totalPrice.toLocaleString("tr-TR")} ₺`}
                valueClass="text-amber-400 font-semibold"
              />
            )}
            {reservation.notes && (
              <div className="py-2 border-b border-neutral-800">
                <p className="text-neutral-400 text-xs mb-1">Notlar</p>
                <p className="text-neutral-200 text-sm">{reservation.notes}</p>
              </div>
            )}
          </div>

          {reservation.statusHistory.length > 0 && (
            <div>
              <p className="text-xs text-neutral-400 mb-2 font-medium">
                Durum Geçmişi
              </p>
              <div className="space-y-2">
                {reservation.statusHistory.map((h, i) => (
                  <div
                    key={i}
                    className="text-xs bg-neutral-800/60 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-200 font-medium">
                        {h.toStatus}
                      </span>
                      <span className="text-neutral-500">
                        {new Date(h.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    {h.reason && (
                      <p className="text-neutral-400 mt-0.5">{h.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClass = "text-neutral-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-neutral-800">
      <span className="text-neutral-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
