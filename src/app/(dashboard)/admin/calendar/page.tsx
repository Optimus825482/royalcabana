"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReservationCalendar from "@/components/calendar/ReservationCalendar";
import ReservationTimeline from "@/components/calendar/ReservationTimeline";
import { ReservationStatus } from "@/types";
import { AlertTriangle, LayoutList, CalendarDays } from "lucide-react";
import ReservationDetailModal, {
  type ReservationDetailData,
} from "@/components/calendar/ReservationDetailModal";
import type { TimelineReservation } from "@/hooks/useReservationCalendar";
import type {
  ReservationEvent,
  CabanaResource,
  CabanaWithStatus,
} from "@/types";
import {
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import { fetchCabanas, fetchSystemConfig } from "@/lib/fetchers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReservationListResponse {
  reservations: ReservationDetailData[];
  total: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchReservations(): Promise<ReservationListResponse> {
  const res = await fetch("/api/reservations");
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCalendarPage() {
  useSession({ required: true });
  const queryClient = useQueryClient();

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const [classFilter, setClassFilter] = useState<string>("");
  const [viewType, setViewType] = useState<"timeline" | "calendar">("timeline");
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
      cabanas.map((c) => [
        c.classId,
        (c as CabanaWithStatus & { cabanaClass?: { name?: string } | null })
          .cabanaClass?.name ?? c.classId,
      ]),
    ).entries(),
  );

  // Pending count for badge
  const pendingCount = useMemo(
    () =>
      (reservationData?.reservations ?? []).filter(
        (r) => r.status === ReservationStatus.PENDING,
      ).length,
    [reservationData],
  );

  const handleEventClick = useCallback(
    (event: ReservationEvent) => {
      const detail = (reservationData?.reservations ?? []).find(
        (r) => r.id === event.id,
      );
      if (detail) setSelectedReservation(detail);
    },
    [reservationData],
  );

  const handleContextMenu = useCallback(
    (
      event: ReservationEvent,
      action: "modify" | "cancel" | "extra-concept",
    ) => {
      void event;
      void action;
      // Admin context menu actions
    },
    [],
  );

  function refreshData() {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
    setSelectedReservation(null);
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-amber-400">
              Rezervasyon Takvimi
            </h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              {viewType === "timeline"
                ? "Gerçek zamanlı Cabana zaman çizelgesi – onay ve check-in yönetimi"
                : "Rezervasyonları görüntüleyin, onaylayın veya reddedin"}
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-yellow-600/30">
              {pendingCount} bekleyen
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-700/40">
            <button
              onClick={() => setViewType("timeline")}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium rounded-md transition-all
                                ${viewType === "timeline" ? "bg-amber-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Zaman Çizelgesi
            </button>
            <button
              onClick={() => setViewType("calendar")}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium rounded-md transition-all
                                ${viewType === "calendar" ? "bg-amber-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Takvim
            </button>
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Cabana sınıfına göre filtrele"
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
          isLoading ? (
            <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>Zaman çizelgesi yükleniyor...</span>
              </div>
            </div>
          ) : (
            <ReservationTimeline
              classFilter={classFilter || undefined}
              onReservationClick={(r: TimelineReservation) => {
                const detail = reservationData?.reservations.find(
                  (res) => res.id === r.id,
                );
                if (detail) setSelectedReservation(detail);
              }}
            />
          )
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
            onEventClick={handleEventClick}
            onContextMenu={handleContextMenu}
            classFilter={classFilter || undefined}
          />
        )}
      </div>

      {/* Reservation Detail + Actions Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onAction={refreshData}
          currency={currency}
          showActions
        />
      )}
    </div>
  );
}
