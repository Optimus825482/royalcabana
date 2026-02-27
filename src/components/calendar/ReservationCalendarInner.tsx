"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Ban,
  PlusCircle,
  CalendarPlus,
  Eye,
  X,
} from "lucide-react";
import { ReservationStatus } from "@/types";
import type {
  ReservationEvent,
  CabanaResource,
  CalendarComponentProps,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "bg-yellow-500",
  [ReservationStatus.APPROVED]: "bg-emerald-500",
  [ReservationStatus.REJECTED]: "bg-red-500",
  [ReservationStatus.CANCELLED]: "bg-neutral-500",
  [ReservationStatus.MODIFICATION_PENDING]: "bg-orange-500",
  [ReservationStatus.EXTRA_PENDING]: "bg-purple-500",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "Bekliyor",
  [ReservationStatus.APPROVED]: "Onaylı",
  [ReservationStatus.REJECTED]: "Reddedildi",
  [ReservationStatus.CANCELLED]: "İptal",
  [ReservationStatus.MODIFICATION_PENDING]: "Değişiklik Bekliyor",
  [ReservationStatus.EXTRA_PENDING]: "Ek Konsept Bekliyor",
};

const STATUS_TEXT_COLORS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "text-yellow-400",
  [ReservationStatus.APPROVED]: "text-emerald-400",
  [ReservationStatus.REJECTED]: "text-red-400",
  [ReservationStatus.CANCELLED]: "text-neutral-400",
  [ReservationStatus.MODIFICATION_PENDING]: "text-orange-400",
  [ReservationStatus.EXTRA_PENDING]: "text-purple-400",
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]:
    "bg-yellow-950/60 border-yellow-700/40 text-yellow-400",
  [ReservationStatus.APPROVED]:
    "bg-emerald-950/60 border-emerald-700/40 text-emerald-400",
  [ReservationStatus.REJECTED]: "bg-red-950/50 border-red-800/40 text-red-400",
  [ReservationStatus.CANCELLED]:
    "bg-neutral-800 border-neutral-700 text-neutral-400",
  [ReservationStatus.MODIFICATION_PENDING]:
    "bg-orange-950/50 border-orange-800/40 text-orange-400",
  [ReservationStatus.EXTRA_PENDING]:
    "bg-purple-950/50 border-purple-800/40 text-purple-400",
};

const WEEKDAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr < end;
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0

  // Fill leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Current month days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Fill trailing days to complete 6 rows
  while (days.length < 42) {
    const last = days[days.length - 1];
    const next = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() + 1,
    );
    days.push(next);
  }

  return days;
}

function formatDateTR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Context Menu State ───────────────────────────────────────────────────────

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  event: ReservationEvent | null;
  dateStr: string;
  resourceId: string;
}

const INITIAL_CTX: ContextMenuState = {
  visible: false,
  x: 0,
  y: 0,
  event: null,
  dateStr: "",
  resourceId: "",
};

// ─── Day Detail Modal ─────────────────────────────────────────────────────────

interface DayModalState {
  visible: boolean;
  dateStr: string;
  events: ReservationEvent[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReservationCalendarInner({
  events,
  resources,
  onDateClick,
  onEventClick,
  onContextMenu,
  classFilter,
}: CalendarComponentProps) {
  const today = toDateStr(new Date());
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(INITIAL_CTX);
  const [dayModal, setDayModal] = useState<DayModalState>({
    visible: false,
    dateStr: "",
    events: [],
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Filter resources by class
  const filteredResources = useMemo(
    () =>
      classFilter
        ? resources.filter((r) => r.classId === classFilter)
        : resources,
    [resources, classFilter],
  );

  const filteredResourceIds = useMemo(
    () => new Set(filteredResources.map((r) => r.id)),
    [filteredResources],
  );

  // Filter events by visible resources
  const visibleEvents = useMemo(
    () => events.filter((e) => filteredResourceIds.has(e.resourceId)),
    [events, filteredResourceIds],
  );

  // Build event map: dateStr -> events[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ReservationEvent[]>();
    for (const ev of visibleEvents) {
      const start = ev.start;
      const end = ev.end;
      // Iterate each day in range
      const d = new Date(start);
      const endDate = new Date(end);
      while (d < endDate) {
        const key = toDateStr(d);
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [visibleEvents]);

  // Month days
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // Week days (current week containing currentDate)
  const weekDays = useMemo(() => {
    const dow = (currentDate.getDay() + 6) % 7;
    const monday = new Date(year, month, currentDate.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate, year, month]);

  const displayDays = viewMode === "month" ? monthDays : weekDays;

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const goPrev = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "month")
        return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 7);
      return prev;
    });
  }, [viewMode]);

  const goNext = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "month")
        return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  }, [viewMode]);

  // ── Close context menu on outside click ─────────────────────────────────────

  useEffect(() => {
    const close = () => setContextMenu(INITIAL_CTX);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // ── Context menu (right-click / long-press) on a day cell ───────────────────

  const openContextMenu = useCallback(
    (x: number, y: number, dateStr: string) => {
      // Find first resource for new reservation context
      const firstResource = filteredResources[0];
      setContextMenu({
        visible: true,
        x: Math.min(x, window.innerWidth - 220),
        y: Math.min(y, window.innerHeight - 200),
        event: null,
        dateStr,
        resourceId: firstResource?.id ?? "",
      });
    },
    [filteredResources],
  );

  const handleDayContextMenu = useCallback(
    (e: React.MouseEvent, dateStr: string) => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(e.clientX, e.clientY, dateStr);
    },
    [openContextMenu],
  );

  // Long press for touch
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, dateStr: string) => {
      longPressTriggered.current = false;
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        openContextMenu(x, y, dateStr);
      }, 500);
    },
    [openContextMenu],
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Day click → open day detail modal ───────────────────────────────────────

  const handleDayClick = useCallback(
    (dateStr: string) => {
      if (longPressTriggered.current) return;
      const dayEvents = eventsByDate.get(dateStr) ?? [];
      if (dayEvents.length > 0) {
        setDayModal({ visible: true, dateStr, events: dayEvents });
      }
    },
    [eventsByDate],
  );

  // ── Event click in modal ────────────────────────────────────────────────────

  const handleEventClickInModal = useCallback(
    (ev: ReservationEvent) => {
      setDayModal((prev) => ({ ...prev, visible: false }));
      onEventClick?.(ev);
    },
    [onEventClick],
  );

  // ── Context menu actions ────────────────────────────────────────────────────

  const handleNewRequest = useCallback(() => {
    if (onDateClick && contextMenu.resourceId) {
      onDateClick(contextMenu.dateStr, contextMenu.resourceId);
    }
    setContextMenu(INITIAL_CTX);
  }, [onDateClick, contextMenu]);

  const handleViewDay = useCallback(() => {
    const dayEvents = eventsByDate.get(contextMenu.dateStr) ?? [];
    setDayModal({
      visible: true,
      dateStr: contextMenu.dateStr,
      events: dayEvents,
    });
    setContextMenu(INITIAL_CTX);
  }, [eventsByDate, contextMenu.dateStr]);

  // Event-specific context menu
  const handleEventContextAction = useCallback(
    (ev: ReservationEvent, action: "modify" | "cancel" | "extra-concept") => {
      onContextMenu?.(ev, action);
      setDayModal((prev) => ({ ...prev, visible: false }));
    },
    [onContextMenu],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="reservation-calendar-custom select-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors active:scale-95"
            aria-label="Önceki"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToday}
            className="h-10 px-4 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm font-medium transition-colors active:scale-95"
          >
            Bugün
          </button>
          <button
            onClick={goNext}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors active:scale-95"
            aria-label="Sonraki"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-neutral-100 order-first sm:order-none w-full sm:w-auto text-center">
          {MONTHS_TR[month]} {year}
        </h2>

        <div className="flex items-center gap-1 bg-neutral-800/60 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("week")}
            className={`h-9 px-3 rounded-md text-sm font-medium transition-colors ${
              viewMode === "week"
                ? "bg-amber-500/20 text-amber-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Hafta
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`h-9 px-3 rounded-md text-sm font-medium transition-colors ${
              viewMode === "month"
                ? "bg-amber-500/20 text-amber-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Ay
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS_TR.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-neutral-300 py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className={`grid grid-cols-7 ${viewMode === "month" ? "grid-rows-6" : "grid-rows-1"} gap-px bg-neutral-800/40 rounded-xl overflow-hidden`}
      >
        {displayDays.map((day) => {
          const dateStr = toDateStr(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(dateStr, today);
          const dayEvents = eventsByDate.get(dateStr) ?? [];
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={dateStr}
              className={`
                relative bg-neutral-900 transition-colors cursor-pointer
                ${viewMode === "month" ? "min-h-[72px] sm:min-h-[90px]" : "min-h-[140px]"}
                ${!isCurrentMonth && viewMode === "month" ? "opacity-40" : ""}
                ${isToday ? "ring-1 ring-inset ring-amber-500/50" : ""}
                hover:bg-neutral-800/80 active:bg-neutral-800
              `}
              onClick={() => handleDayClick(dateStr)}
              onContextMenu={(e) => handleDayContextMenu(e, dateStr)}
              onTouchStart={(e) => handleTouchStart(e, dateStr)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              role="button"
              tabIndex={0}
              aria-label={`${day.getDate()} ${MONTHS_TR[day.getMonth()]} ${day.getFullYear()}`}
            >
              {/* Day number */}
              <div className="p-1.5 sm:p-2">
                <span
                  className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                    ${isToday ? "bg-amber-500 text-neutral-950" : "text-neutral-100"}
                  `}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Event dots / pills */}
              <div className="px-1 sm:px-1.5 pb-1.5 space-y-0.5">
                {dayEvents.slice(0, viewMode === "month" ? 3 : 6).map((ev) => (
                  <div
                    key={ev.id}
                    className={`
                      ${STATUS_COLORS[ev.status]} rounded px-1.5 py-0.5 text-[10px] sm:text-xs
                      text-white font-medium truncate leading-tight
                    `}
                    title={`${ev.guestName} — ${STATUS_LABELS[ev.status]}`}
                  >
                    <span className="hidden sm:inline">{ev.guestName}</span>
                    <span className="sm:hidden">
                      {ev.guestName.split(" ")[0]}
                    </span>
                  </div>
                ))}
                {dayEvents.length > (viewMode === "month" ? 3 : 6) && (
                  <div className="text-[10px] text-neutral-300 font-medium px-1">
                    +{dayEvents.length - (viewMode === "month" ? 3 : 6)} daha
                  </div>
                )}
              </div>

              {/* Event count badge (mobile, month view) */}
              {hasEvents && viewMode === "month" && (
                <div className="absolute top-1.5 right-1.5 sm:hidden w-5 h-5 rounded-full bg-amber-500/80 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-neutral-950">
                    {dayEvents.length}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 px-1">
        {Object.entries(STATUS_COLORS).map(([status, colorClass]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorClass}`}
            />
            <span className="text-xs text-neutral-300">
              {STATUS_LABELS[status as ReservationStatus]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Context Menu (right-click / long-press) ── */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl py-1.5 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-neutral-300 border-b border-neutral-700/60 font-medium">
            {formatDateTR(contextMenu.dateStr)}
          </div>
          {onDateClick && contextMenu.resourceId && (
            <button
              className="w-full text-left px-3 py-3 text-sm text-neutral-100 hover:bg-neutral-800 transition-colors flex items-center gap-2.5 active:bg-neutral-700"
              onClick={handleNewRequest}
            >
              <CalendarPlus className="w-4 h-4 text-amber-400" />
              Yeni Rezervasyon Talebi
            </button>
          )}
          <button
            className="w-full text-left px-3 py-3 text-sm text-neutral-100 hover:bg-neutral-800 transition-colors flex items-center gap-2.5 active:bg-neutral-700"
            onClick={handleViewDay}
          >
            <Eye className="w-4 h-4 text-blue-400" />
            Günü Görüntüle (
            {(eventsByDate.get(contextMenu.dateStr) ?? []).length} rez.)
          </button>
        </div>
      )}

      {/* ── Day Detail Modal ── */}
      {dayModal.visible && (
        <DayDetailModal
          dateStr={dayModal.dateStr}
          events={dayModal.events}
          resources={filteredResources}
          onClose={() =>
            setDayModal({ visible: false, dateStr: "", events: [] })
          }
          onEventClick={handleEventClickInModal}
          onContextAction={handleEventContextAction}
          onNewRequest={onDateClick}
        />
      )}
    </div>
  );
}

// ─── Day Detail Modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  dateStr,
  events,
  resources,
  onClose,
  onEventClick,
  onContextAction,
  onNewRequest,
}: {
  dateStr: string;
  events: ReservationEvent[];
  resources: CabanaResource[];
  onClose: () => void;
  onEventClick: (ev: ReservationEvent) => void;
  onContextAction: (
    ev: ReservationEvent,
    action: "modify" | "cancel" | "extra-concept",
  ) => void;
  onNewRequest?: (date: string, resourceId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group events by resource
  const grouped = useMemo(() => {
    const map = new Map<string, ReservationEvent[]>();
    for (const ev of events) {
      const arr = map.get(ev.resourceId) ?? [];
      arr.push(ev);
      map.set(ev.resourceId, arr);
    }
    return map;
  }, [events]);

  const resourceMap = useMemo(
    () => new Map(resources.map((r) => [r.id, r])),
    [resources],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              {formatDateTR(dateStr)}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {events.length} rezervasyon
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors active:scale-95"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-400 text-sm">
                Bu güne ait rezervasyon bulunmuyor.
              </p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([resourceId, evs]) => {
              const resource = resourceMap.get(resourceId);
              return (
                <div key={resourceId}>
                  {grouped.size > 1 && (
                    <p className="text-xs font-semibold text-amber-400/80 mb-2 px-1">
                      {resource?.title ?? resourceId}
                    </p>
                  )}
                  <div className="space-y-2">
                    {evs.map((ev) => {
                      const isExpanded = expandedId === ev.id;
                      return (
                        <div
                          key={ev.id}
                          className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl overflow-hidden"
                        >
                          <button
                            className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-neutral-700/40 transition-colors"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : ev.id)
                            }
                          >
                            <span
                              className={`w-2.5 h-8 rounded-full shrink-0 ${STATUS_COLORS[ev.status]}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-100 truncate">
                                {ev.guestName}
                              </p>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {formatDateTR(ev.start)} —{" "}
                                {formatDateTR(ev.end)}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[ev.status]}`}
                            >
                              {STATUS_LABELS[ev.status]}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-3 pt-0 border-t border-neutral-700/40 space-y-2">
                              <div className="flex items-center gap-2 pt-2 text-xs text-neutral-400">
                                <span>
                                  Kabana:{" "}
                                  <span className="text-neutral-200">
                                    {resource?.title}
                                  </span>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  onClick={() => onEventClick(ev)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors active:scale-95"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                  Detay
                                </button>
                                <button
                                  onClick={() => onContextAction(ev, "modify")}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors active:scale-95"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-amber-400" />
                                  Değiştir
                                </button>
                                <button
                                  onClick={() => onContextAction(ev, "cancel")}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors active:scale-95"
                                >
                                  <Ban className="w-3.5 h-3.5 text-red-400" />
                                  İptal
                                </button>
                                <button
                                  onClick={() =>
                                    onContextAction(ev, "extra-concept")
                                  }
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors active:scale-95"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                                  Ek Konsept
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: New reservation button */}
        {onNewRequest && resources.length > 0 && (
          <div className="px-4 py-3 border-t border-neutral-800 shrink-0">
            <button
              onClick={() => {
                onNewRequest(dateStr, resources[0].id);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 font-semibold text-sm transition-colors active:scale-[0.98]"
            >
              <CalendarPlus className="w-4 h-4" />
              Yeni Rezervasyon Talebi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
