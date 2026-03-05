"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import ReservationCalendar from "@/components/calendar/ReservationCalendar";
import ReservationTimeline from "@/components/calendar/ReservationTimeline";
import ReservationRequestForm from "@/components/calendar/ReservationRequestForm";
import ReservationDetailModal, {
  type ReservationDetailData,
} from "@/components/calendar/ReservationDetailModal";
import { AlertTriangle, LayoutList, CalendarDays } from "lucide-react";
import {
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import { fetchCabanas, fetchSystemConfig } from "@/lib/fetchers";
import CabanaDetailModal from "@/components/calendar/CabanaDetailModal";
import type {
  ReservationEvent,
  CabanaResource,
  CabanaWithStatus,
} from "@/types";
import type { TimelineReservation } from "@/hooks/useReservationCalendar";

interface ReservationListResponse {
  reservations: ReservationDetailData[];
  total: number;
}

async function fetchReservations(): Promise<ReservationListResponse> {
  const res = await fetch("/api/reservations");
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
}

export default function CasinoCalendarPage() {
  useSession({ required: true });
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const requestedView = searchParams.get("view");
  const requestedRange = searchParams.get("range");
  const requestedCabanaId = searchParams.get("cabanaId") ?? undefined;
  const requestedDate = searchParams.get("date") ?? undefined;

  const [classFilter, setClassFilter] = useState<string>("");
  const [viewType, setViewType] = useState<"timeline" | "calendar">(
    requestedView === "timeline" ? "timeline" : "calendar",
  );
  const [requestModal, setRequestModal] = useState<{
    cabanaId: string;
    cabanaName: string;
    date?: string;
  } | null>(null);
  const [selectedCabana, setSelectedCabana] = useState<CabanaWithStatus | null>(
    null,
  );
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationDetailData | null>(null);

  const {
    data: reservationData,
    isLoading: resLoading,
    isError: resIsError,
    error: resError,
  } = useQuery({
    queryKey: ["reservations"],
    queryFn: fetchReservations,
  });

  const {
    data: cabanas = [],
    isLoading: cabanasLoading,
    isError: cabanasIsError,
    error: cabanasError,
  } = useQuery({
    queryKey: ["cabanas"],
    queryFn: fetchCabanas,
  });

  const {
    data: systemConfig,
    isError: configIsError,
    error: configError,
  } = useQuery({
    queryKey: ["system-config"],
    queryFn: fetchSystemConfig,
  });

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const systemOpen = systemConfig?.system_open_for_reservation ?? true;
  const isLoading = resLoading || cabanasLoading;
  const isError = resIsError || cabanasIsError || configIsError;
  const fetchError =
    resError instanceof Error
      ? resError.message
      : cabanasError instanceof Error
        ? cabanasError.message
        : configError instanceof Error
          ? configError.message
          : null;

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div className="text-neutral-100 flex flex-col">
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
            {viewType === "timeline"
              ? "Cabana bazlı zaman çizelgesi – gerçek zamanlı takip"
              : "Bir güne tıklayarak detayları görün, sağ tıklayarak talep oluşturun"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle — touch-friendly 44px+ */}
          <div className="flex bg-neutral-900 rounded-xl p-1 border border-neutral-700/40">
            <button
              onClick={() => setViewType("timeline")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] min-w-0 text-sm font-medium rounded-lg transition-all touch-manipulation active:scale-[0.98]
                ${viewType === "timeline" ? "bg-amber-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              <LayoutList className="w-4 h-4 shrink-0" />
              <span>Zaman Çizelgesi</span>
            </button>
            <button
              onClick={() => setViewType("calendar")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] min-w-0 text-sm font-medium rounded-lg transition-all touch-manipulation active:scale-[0.98]
                ${viewType === "calendar" ? "bg-amber-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              Takvim
            </button>
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            title="Sınıf filtresi"
            aria-label="Sınıf filtresi"
            className="min-h-[44px] px-4 py-3 text-base sm:text-sm bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-500 touch-manipulation"
          >
            <option value="">Tüm Sınıflar</option>
            {classes.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {isError && fetchError && (
        <div className="px-4 sm:px-6 pt-3 shrink-0">
          <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
            {fetchError}
          </div>
        </div>
      )}

      {/* Content: Timeline or Calendar */}
      <div className="flex-1 p-4 sm:p-6">
        {viewType === "timeline" ? (
          <ReservationTimeline
            classFilter={classFilter || undefined}
            initialViewMode={requestedRange === "day" ? "day" : undefined}
            initialDate={requestedDate}
            focusCabanaId={requestedCabanaId}
            onCabanaClick={(cabana) => {
              const selected = cabanas.find((c) => c.id === cabana.id);
              if (selected) setSelectedCabana(selected);
            }}
            onCellClick={(cabanaId, date) => {
              if (!systemOpen) return;
              const cabana = cabanas.find((c) => c.id === cabanaId);
              if (!cabana) return;
              setRequestModal({
                cabanaId: cabana.id,
                cabanaName: cabana.name,
                date,
              });
            }}
            onReservationClick={(r: TimelineReservation) => {
              const detail = reservationData?.reservations.find(
                (res) => res.id === r.id,
              );
              if (detail) setSelectedReservation(detail);
            }}
          />
        ) : isLoading ? (
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
          currency={currency}
        />
      )}

      {/* Cabana Detail Modal */}
      {selectedCabana && (
        <CabanaDetailModal
          cabana={selectedCabana}
          reservationCount={
            (reservationData?.reservations ?? []).filter(
              (reservation) => reservation.cabanaId === selectedCabana.id,
            ).length
          }
          systemOpen={systemOpen}
          onClose={() => setSelectedCabana(null)}
          onCreateRequest={() => {
            setRequestModal({
              cabanaId: selectedCabana.id,
              cabanaName: selectedCabana.name,
            });
            setSelectedCabana(null);
          }}
        />
      )}

      {/* Request Modal */}
      {requestModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setRequestModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Rezervasyon talebi"
        >
          <div
            className="bg-[var(--rc-card)] border border-[var(--rc-border-subtle)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl mx-0 sm:mx-4 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--rc-drag-handle)]" />
            </div>
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
