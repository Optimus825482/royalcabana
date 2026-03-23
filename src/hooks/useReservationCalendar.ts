"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSSE } from "@/hooks/useSSE";
import { SSE_EVENTS } from "@/lib/sse-events";
import type { ReservationStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────

export interface TimelineCabana {
  id: string;
  name: string;
  classId: string;
  status: string;
  isOpenForReservation: boolean;
  color?: string | null;
  cabanaClass?: { id: string; name: string };
  concept?: { id: string; name: string } | null;
}

export interface TimelineReservation {
  id: string;
  cabanaId: string;
  userId: string;
  guestName: string;
  guestId?: string | null;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  totalPrice?: number | null;
  notes?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  createdAt: string;
  cabana: { id: string; name: string };
  user: { id: string; username: string };
  guest?: { id: string; name: string; vipLevel: string } | null;
}

export interface TimelineBlackout {
  id: string;
  cabanaId: string | null;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export interface TimelineStats {
  totalCabanas: number;
  occupiedToday: number;
  pendingToday: number;
  checkedInToday: number;
  availableToday: number;
  occupancyRate: number;
}

export interface CalendarData {
  cabanas: TimelineCabana[];
  reservations: TimelineReservation[];
  blackoutDates: TimelineBlackout[];
  stats: TimelineStats;
  dateRange: { start: string; end: string };
}

interface UseReservationCalendarOptions {
  startDate: string;
  endDate: string;
  classId?: string;
  enabled?: boolean;
}

// ─── SSE Event Names ──────────────────────────────────────────────────────

const CALENDAR_SSE_EVENTS = [
  SSE_EVENTS.RESERVATION_CREATED,
  SSE_EVENTS.RESERVATION_APPROVED,
  SSE_EVENTS.RESERVATION_REJECTED,
  SSE_EVENTS.RESERVATION_CANCELLED,
  SSE_EVENTS.RESERVATION_UPDATED,
  SSE_EVENTS.RESERVATION_CHECKED_IN,
  SSE_EVENTS.RESERVATION_CHECKED_OUT,
  SSE_EVENTS.CABANA_STATUS_CHANGED,
  SSE_EVENTS.CALENDAR_UPDATE,
];

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useReservationCalendar(options: UseReservationCalendarOptions) {
  const { startDate, endDate, classId, enabled = true } = options;
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [sseConnected, setSseConnected] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const queryKeyRef = useRef<readonly [string, string, string, string]>([
    "reservation-calendar",
    startDate,
    endDate,
    classId ?? "all",
  ]);

  // Build query key
  const queryKey = useMemo(
    () =>
      ["reservation-calendar", startDate, endDate, classId ?? "all"] as const,
    [startDate, endDate, classId],
  );

  useEffect(() => {
    queryKeyRef.current = queryKey as readonly [
      string,
      string,
      string,
      string,
    ];
  }, [queryKey]);

  // Fetch calendar data
  const query = useQuery<CalendarData>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
      });
      if (classId) params.set("classId", classId);

      const res = await fetch(`/api/reservations/calendar?${params}`);
      if (!res.ok) {
        setFailCount((count) => count + 1);
        throw new Error(`Calendar fetch failed: ${res.status}`);
      }
      setFailCount(0);
      const json = await res.json();
      return json.data;
    },
    enabled,
    staleTime: 30_000, // 30s stale
    refetchInterval: sseConnected ? false : 30_000, // Poll if SSE disconnected
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
  });

  // SSE event handler – invalidate query on relevant events
  const handleSSEEvent = useCallback(
    (event: string) => {
      if ((CALENDAR_SSE_EVENTS as readonly string[]).includes(event)) {
        setLastUpdate(Date.now());
        // Debounced invalidation to batch rapid SSE bursts
        queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      }
    },
    [queryClient],
  );

  // Track SSE connection status
  const { isConnected } = useSSE({
    onEvent: handleSSEEvent,
  });

  useEffect(() => {
    setSseConnected(isConnected);
  }, [isConnected]);

  // Manual refresh
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Computed: reservation map by cabanaId
  const reservationsByCabana = useMemo(() => {
    const map = new Map<string, TimelineReservation[]>();
    if (!query.data?.reservations) return map;

    for (const r of query.data.reservations) {
      const arr = map.get(r.cabanaId) ?? [];
      arr.push(r);
      map.set(r.cabanaId, arr);
    }
    return map;
  }, [query.data?.reservations]);

  // Computed: blackout map by cabanaId
  const blackoutsByCabana = useMemo(() => {
    const map = new Map<string, TimelineBlackout[]>();
    if (!query.data?.blackoutDates) return map;

    for (const b of query.data.blackoutDates) {
      if (b.cabanaId) {
        const arr = map.get(b.cabanaId) ?? [];
        arr.push(b);
        map.set(b.cabanaId, arr);
      }
    }
    return map;
  }, [query.data?.blackoutDates]);

  return {
    // Data
    cabanas: query.data?.cabanas ?? [],
    reservations: query.data?.reservations ?? [],
    blackoutDates: query.data?.blackoutDates ?? [],
    stats: query.data?.stats ?? null,
    dateRange: query.data?.dateRange ?? null,
    reservationsByCabana,
    blackoutsByCabana,

    // Status
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    sseConnected,
    lastUpdate,
    failCount,

    // Actions
    refresh,
  };
}
