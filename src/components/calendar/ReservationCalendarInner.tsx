"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin from "@fullcalendar/interaction";
import trLocale from "@fullcalendar/core/locales/tr";
import type { EventClickArg } from "@fullcalendar/core";
import { ReservationStatus } from "@/types";
import type {
  ReservationEvent,
  CabanaResource,
  CalendarComponentProps,
} from "@/types";

// Durum renk haritası
const STATUS_COLORS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "#eab308",
  [ReservationStatus.APPROVED]: "#22c55e",
  [ReservationStatus.REJECTED]: "#ef4444",
  [ReservationStatus.CANCELLED]: "#6b7280",
  [ReservationStatus.MODIFICATION_PENDING]: "#f97316",
  [ReservationStatus.EXTRA_PENDING]: "#a855f7",
};

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  event: ReservationEvent | null;
}

export default function ReservationCalendarInner({
  events,
  resources,
  onDateClick,
  onEventClick,
  onContextMenu,
  classFilter,
}: CalendarComponentProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    event: null,
  });

  // Sınıf filtresine göre kaynakları filtrele
  const filteredResources: CabanaResource[] = classFilter
    ? resources.filter((r) => r.classId === classFilter)
    : resources;

  // Olayları renk bilgisiyle zenginleştir
  const enrichedEvents = events
    .filter((e) => filteredResources.some((r) => r.id === e.resourceId))
    .map((e) => ({
      ...e,
      backgroundColor: STATUS_COLORS[e.status] ?? "#6b7280",
      borderColor: STATUS_COLORS[e.status] ?? "#6b7280",
      textColor: "#ffffff",
    }));

  // Dışarı tıklandığında context menu'yü kapat
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const reservation = events.find((e) => e.id === arg.event.id);
      if (reservation && onEventClick) {
        onEventClick(reservation);
      }
    },
    [events, onEventClick],
  );

  // resource-timeline select callback — resource bilgisi runtime'da eklenir
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDateSelect = useCallback(
    (arg: any) => {
      const resourceId: string | undefined = arg.resource?.id;
      if (onDateClick && resourceId) {
        onDateClick(arg.startStr as string, resourceId);
      }
    },
    [onDateClick],
  );

  // Sağ tık context menu
  const handleEventContextMenu = useCallback(
    (e: React.MouseEvent, eventId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const reservation = events.find((ev) => ev.id === eventId);
      if (reservation) {
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          event: reservation,
        });
      }
    },
    [events],
  );

  const handleContextAction = useCallback(
    (action: "modify" | "cancel" | "extra-concept") => {
      if (contextMenu.event && onContextMenu) {
        onContextMenu(contextMenu.event, action);
      }
      setContextMenu((prev) => ({ ...prev, visible: false }));
    },
    [contextMenu.event, onContextMenu],
  );

  return (
    <div className="reservation-calendar-wrapper relative">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineWeek"
        locale={trLocale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right:
            "resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth",
        }}
        buttonText={{
          today: "Bugün",
          day: "Günlük",
          week: "Haftalık",
          month: "Aylık",
        }}
        resources={filteredResources.map((r) => ({
          id: r.id,
          title: r.title,
        }))}
        events={enrichedEvents}
        selectable={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDidMount={(info) => {
          info.el.addEventListener("contextmenu", (e) => {
            handleEventContextMenu(
              e as unknown as React.MouseEvent,
              info.event.id,
            );
          });
        }}
        height="auto"
        resourceAreaHeaderContent="Kabanalar"
        resourceAreaWidth="180px"
        slotMinWidth={40}
        nowIndicator={true}
        editable={false}
        eventDisplay="block"
      />

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.event && (
        <div
          className="context-menu fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700 truncate">
            {contextMenu.event.guestName}
          </div>
          <button
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            onClick={() => handleContextAction("modify")}
          >
            ✏️ Değişiklik Talebi
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            onClick={() => handleContextAction("cancel")}
          >
            🚫 İptal Talebi
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            onClick={() => handleContextAction("extra-concept")}
          >
            ➕ Ek Konsept Talebi
          </button>
        </div>
      )}

      <style>{`
        .reservation-calendar-wrapper .fc {
          background: transparent;
          color: inherit;
        }
        .reservation-calendar-wrapper .fc-theme-standard td,
        .reservation-calendar-wrapper .fc-theme-standard th,
        .reservation-calendar-wrapper .fc-theme-standard .fc-scrollgrid {
          border-color: rgba(255,255,255,0.1);
        }
        .reservation-calendar-wrapper .fc-col-header-cell,
        .reservation-calendar-wrapper .fc-datagrid-cell {
          background: rgba(0,0,0,0.3);
        }
        .reservation-calendar-wrapper .fc-timeline-slot {
          background: transparent;
        }
        .reservation-calendar-wrapper .fc-resource-timeline-divider {
          background: rgba(255,255,255,0.1);
        }
        .reservation-calendar-wrapper .fc-button {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          color: inherit;
        }
        .reservation-calendar-wrapper .fc-button:hover {
          background: rgba(255,255,255,0.2);
        }
        .reservation-calendar-wrapper .fc-button-active {
          background: rgba(255,255,255,0.25) !important;
        }
        .reservation-calendar-wrapper .fc-toolbar-title {
          color: inherit;
        }
        .reservation-calendar-wrapper .fc-datagrid-cell-main {
          color: inherit;
        }
        .reservation-calendar-wrapper .fc-col-header-cell-cushion {
          color: inherit;
        }
        .reservation-calendar-wrapper .fc-timeline-now-indicator-line {
          border-color: #ef4444;
        }
      `}</style>
    </div>
  );
}
