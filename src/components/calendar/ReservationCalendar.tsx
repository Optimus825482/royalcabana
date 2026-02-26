"use client";

import dynamic from "next/dynamic";
import type { CalendarComponentProps } from "@/types";

const ReservationCalendarInner = dynamic(
  () => import("./ReservationCalendarInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-neutral-500 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span>Takvim yükleniyor...</span>
        </div>
      </div>
    ),
  },
);

export default function ReservationCalendar(props: CalendarComponentProps) {
  return <ReservationCalendarInner {...props} />;
}
