"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Plus,
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Users,
} from "lucide-react";
import ReservationRequestForm from "@/components/calendar/ReservationRequestForm";
import ReservationDetailModal, {
  type ReservationDetailData,
} from "@/components/calendar/ReservationDetailModal";
import {
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import { fetchSystemConfig } from "@/lib/fetchers";
import { ReservationStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CabanaCalendarReservation {
  id: string;
  cabanaId: string;
  userId: string;
  guestName: string;
  guestId: string | null;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  totalPrice: number | null;
  notes: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  createdAt: string;
  conceptId: string | null;
  concept: { id: string; name: string } | null;
  user: { id: string; username: string } | null;
  guest: { id: string; name: string; vipLevel: string } | null;
}

interface CabanaCalendarData {
  cabana: {
    id: string;
    name: string;
    classId: string;
    status: string;
    isOpenForReservation: boolean;
    color: string | null;
    cabanaClass: { id: string; name: string } | null;
    concept: { id: string; name: string } | null;
  };
  reservations: CabanaCalendarReservation[];
  blackoutDates: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason: string | null;
  }>;
  stats: {
    todayStatus: string;
    totalReservations: number;
    approvedCount: number;
    pendingCount: number;
    checkedInCount: number;
  };
}

type ViewMode = "month" | "week";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  PENDING: {
    label: "Bekliyor",
    color: "text-yellow-400",
    bg: "bg-yellow-500/15 border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  APPROVED: {
    label: "Onaylı",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  REJECTED: {
    label: "Reddedildi",
    color: "text-red-400",
    bg: "bg-red-500/15 border-red-500/30",
    dot: "bg-red-400",
  },
  CANCELLED: {
    label: "İptal",
    color: "text-neutral-500",
    bg: "bg-neutral-500/15 border-neutral-500/30",
    dot: "bg-neutral-500",
  },
  CHECKED_IN: {
    label: "Giriş Yapıldı",
    color: "text-teal-400",
    bg: "bg-teal-500/15 border-teal-500/30",
    dot: "bg-teal-400",
  },
  CHECKED_OUT: {
    label: "Çıkış Yapıldı",
    color: "text-slate-400",
    bg: "bg-slate-500/15 border-slate-500/30",
    dot: "bg-slate-400",
  },
  MODIFICATION_PENDING: {
    label: "Değişiklik Bekliyor",
    color: "text-orange-400",
    bg: "bg-orange-500/15 border-orange-500/30",
    dot: "bg-orange-400",
  },
  EXTRA_PENDING: {
    label: "Ek Konsept Bekliyor",
    color: "text-purple-400",
    bg: "bg-purple-500/15 border-purple-500/30",
    dot: "bg-purple-400",
  },
};

const DAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
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

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  r.setDate(r.getDate() + diff);
  return r;
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const start = startOfWeek(firstDay);
  const days: Date[] = [];
  let current = new Date(start);
  // Always show 6 weeks for consistent grid
  while (days.length < 42) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  // Trim trailing week if all days are next month and we have enough
  if (days.length > 35) {
    const lastWeekStart = days[35];
    if (lastWeekStart.getMonth() !== month && days[28].getMonth() !== month) {
      return days.slice(0, 35);
    }
  }
  return days;
}

function getWeekDays(baseDate: Date): Date[] {
  const monday = startOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000));
}

function formatDateTR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchCabanaCalendar(
  cabanaId: string,
  start: string,
  end: string,
): Promise<CabanaCalendarData> {
  const res = await fetch(
    `/api/cabanas/${cabanaId}/calendar?start=${start}&end=${end}`,
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Takvim verisi yüklenemedi.");
  }
  const json = await res.json();
  return json.data;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CabanaCalendarPage() {
  useSession({ required: true });
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const cabanaId = params.id as string;

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedReservation, setSelectedReservation] =
    useState<CabanaCalendarReservation | null>(null);
  const [requestModal, setRequestModal] = useState<{
    date?: string;
  } | null>(null);

  // Date range for API
  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      const start = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      start.setDate(start.getDate() - 7); // buffer for prev month days
      const end = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );
      end.setDate(end.getDate() + 8);
      return { start: toDateStr(start), end: toDateStr(end) };
    }
    const weekStart = startOfWeek(currentDate);
    return {
      start: toDateStr(addDays(weekStart, -1)),
      end: toDateStr(addDays(weekStart, 8)),
    };
  }, [viewMode, currentDate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["cabana-calendar", cabanaId, dateRange.start, dateRange.end],
    queryFn: () =>
      fetchCabanaCalendar(cabanaId, dateRange.start, dateRange.end),
    enabled: !!cabanaId,
  });

  const { data: systemConfig } = useQuery({
    queryKey: ["system-config"],
    queryFn: fetchSystemConfig,
  });

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const systemOpen = systemConfig?.system_open_for_reservation ?? true;
  const cabana = data?.cabana;
  const reservations = useMemo(() => data?.reservations ?? [], [data]);
  const blackoutDates = useMemo(() => data?.blackoutDates ?? [], [data]);
  const stats = data?.stats;

  // Build reservation map: dateStr → reservations[]
  const reservationMap = useMemo(() => {
    const map = new Map<string, CabanaCalendarReservation[]>();
    for (const r of reservations) {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      let current = new Date(start);
      while (current < end) {
        const key = toDateStr(current);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
        current = addDays(current, 1);
      }
    }
    return map;
  }, [reservations]);

  // Build blackout map
  const blackoutMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of blackoutDates) {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      let current = new Date(start);
      while (current < end) {
        map.set(toDateStr(current), b.reason ?? "Kapalı");
        current = addDays(current, 1);
      }
    }
    return map;
  }, [blackoutDates]);

  const today = toDateStr(new Date());

  // Navigation
  const goNext = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "month")
        return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return addDays(d, 7);
    });
  }, [viewMode]);

  const goPrev = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "month")
        return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return addDays(d, -7);
    });
  }, [viewMode]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  function handleDayClick(dateStr: string) {
    if (!systemOpen || !cabana?.isOpenForReservation) return;
    if (dateStr < today) return;
    if (blackoutMap.has(dateStr)) return;
    setRequestModal({ date: dateStr });
  }

  function handleReservationClick(r: CabanaCalendarReservation) {
    setSelectedReservation(r);
  }

  function handleRequestSuccess() {
    setRequestModal(null);
    queryClient.invalidateQueries({ queryKey: ["cabana-calendar", cabanaId] });
  }

  // Calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    }
    return getWeekDays(currentDate);
  }, [viewMode, currentDate]);

  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTHS_TR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const weekDays = getWeekDays(currentDate);
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} - ${last.getDate()} ${MONTHS_TR[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${MONTHS_TR[first.getMonth()]} - ${last.getDate()} ${MONTHS_TR[last.getMonth()]} ${last.getFullYear()}`;
  }, [viewMode, currentDate]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Takvim yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "Bir hata oluştu."}
          </p>
          <button
            onClick={() => router.back()}
            className="text-sm text-amber-400 hover:underline"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-neutral-100 flex flex-col">
      {/* ── Header: Cabana Info Card ── */}
      <div className="px-4 sm:px-6 py-4 border-b border-neutral-800 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => router.push("/casino/map")}
              className="mt-1 w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors shrink-0"
              aria-label="Haritaya dön"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <h1 className="text-lg font-bold text-amber-400 tracking-tight">
                  {cabana?.name}
                </h1>
                {cabana?.cabanaClass && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400">
                    {cabana.cabanaClass.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {cabana?.concept && (
                  <span className="text-xs text-neutral-500">
                    Konsept: {cabana.concept.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* New reservation button */}
          {systemOpen && cabana?.isOpenForReservation && (
            <button
              onClick={() => setRequestModal({})}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-neutral-950 font-semibold text-sm rounded-xl transition-colors shrink-0 touch-manipulation active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni Talep</span>
            </button>
          )}
        </div>

        {/* Stats row */}
        {stats && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <StatBadge
              icon={<Clock className="w-3 h-3" />}
              label="Bekleyen"
              value={stats.pendingCount}
              color="text-yellow-400"
              bg="bg-yellow-500/10"
            />
            <StatBadge
              icon={<CheckCircle2 className="w-3 h-3" />}
              label="Onaylı"
              value={stats.approvedCount}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
            />
            <StatBadge
              icon={<LogIn className="w-3 h-3" />}
              label="Check-in"
              value={stats.checkedInCount}
              color="text-teal-400"
              bg="bg-teal-500/10"
            />
            <StatBadge
              icon={<Users className="w-3 h-3" />}
              label="Toplam"
              value={stats.totalReservations}
              color="text-neutral-300"
              bg="bg-neutral-800"
            />
          </div>
        )}
      </div>

      {/* ── Calendar Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-neutral-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors touch-manipulation"
            aria-label="Önceki"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors touch-manipulation"
          >
            Bugün
          </button>
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors touch-manipulation"
            aria-label="Sonraki"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-neutral-200 ml-2">
            {headerTitle}
          </h2>
        </div>

        {/* View toggle */}
        <div className="flex bg-neutral-900 rounded-xl p-1 border border-neutral-700/40">
          <button
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-all touch-manipulation ${
              viewMode === "month"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Ay
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-all touch-manipulation ${
              viewMode === "week"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Hafta
          </button>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {DAYS_TR.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-px bg-neutral-800/30 rounded-xl overflow-hidden border border-neutral-800/60">
          {calendarDays.map((day) => {
            const dateStr = toDateStr(day);
            const isToday = dateStr === today;
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dayReservations = reservationMap.get(dateStr) ?? [];
            const isBlackout = blackoutMap.has(dateStr);
            const isPast = dateStr < today;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                className={`
                  relative min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 transition-colors
                  ${viewMode === "week" ? "min-h-[200px] sm:min-h-[280px]" : ""}
                  ${isCurrentMonth ? "bg-neutral-900" : "bg-neutral-900/40"}
                  ${isToday ? "ring-1 ring-inset ring-amber-500/50" : ""}
                  ${isBlackout ? "bg-red-950/20" : ""}
                  ${isPast ? "opacity-60" : ""}
                  ${!isPast && !isBlackout && systemOpen && cabana?.isOpenForReservation ? "cursor-pointer hover:bg-neutral-800/80" : "cursor-default"}
                `}
                role={!isPast && !isBlackout ? "button" : undefined}
                aria-label={`${day.getDate()} ${MONTHS_TR[day.getMonth()]} - ${dayReservations.length} rezervasyon`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? "bg-amber-500 text-neutral-950 font-bold" : ""}
                      ${!isToday && isCurrentMonth ? "text-neutral-300" : ""}
                      ${!isToday && !isCurrentMonth ? "text-neutral-600" : ""}
                      ${isWeekend && !isToday ? "text-neutral-500" : ""}
                    `}
                  >
                    {day.getDate()}
                  </span>
                  {isBlackout && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                      Kapalı
                    </span>
                  )}
                </div>

                {/* Reservations */}
                <div className="space-y-0.5">
                  {dayReservations
                    .slice(0, viewMode === "week" ? 10 : 3)
                    .map((r) => {
                      const cfg =
                        STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
                      const isStart =
                        toDateStr(new Date(r.startDate)) === dateStr;
                      const isEnd =
                        toDateStr(addDays(new Date(r.endDate), -1)) === dateStr;
                      return (
                        <button
                          key={r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReservationClick(r);
                          }}
                          className={`
                            w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border transition-all
                            hover:brightness-125 active:scale-[0.98] touch-manipulation
                            ${cfg.bg}
                            ${isStart ? "rounded-l-md" : "border-l-0 rounded-l-none"}
                            ${isEnd ? "rounded-r-md" : "border-r-0 rounded-r-none"}
                          `}
                          title={`${r.guestName} (${cfg.label})`}
                        >
                          <span
                            className={`${cfg.color} flex items-center gap-1`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${cfg.dot} shrink-0`}
                            />
                            <span className="truncate">
                              {isStart ? r.guestName : ""}
                              {!isStart && viewMode === "week"
                                ? r.guestName
                                : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  {dayReservations.length > (viewMode === "week" ? 10 : 3) && (
                    <span className="text-[9px] text-neutral-500 pl-1">
                      +{dayReservations.length - (viewMode === "week" ? 10 : 3)}{" "}
                      daha
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Upcoming Reservations List (below calendar) ── */}
        {reservations.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-neutral-300 mb-3">
              Rezervasyonlar ({reservations.length})
            </h3>
            <div className="space-y-2">
              {reservations
                .filter(
                  (r) => r.status !== "REJECTED" && r.status !== "CANCELLED",
                )
                .sort(
                  (a, b) =>
                    new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime(),
                )
                .map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
                  const days = daysBetween(r.startDate, r.endDate);
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleReservationClick(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800/80 transition-colors text-left touch-manipulation active:scale-[0.99]"
                    >
                      <div
                        className={`w-1 h-10 rounded-full ${cfg.dot} shrink-0`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-200 truncate">
                            {r.guestName}
                          </span>
                          {r.guest?.vipLevel &&
                            r.guest.vipLevel !== "STANDARD" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-medium shrink-0">
                                VIP {r.guest.vipLevel}
                              </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                          <span className="tabular-nums">
                            {formatDateTR(r.startDate)} →{" "}
                            {formatDateTR(r.endDate)}
                          </span>
                          <span>·</span>
                          <span>{days} gece</span>
                          {r.concept && (
                            <>
                              <span>·</span>
                              <span className="text-amber-400/70">
                                {r.concept.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {reservations.length === 0 && !isLoading && (
          <div className="mt-8 text-center">
            <CalendarDays className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">
              Bu dönemde rezervasyon bulunmuyor.
            </p>
            {systemOpen && cabana?.isOpenForReservation && (
              <button
                onClick={() => setRequestModal({})}
                className="mt-3 text-sm text-amber-400 hover:underline"
              >
                İlk rezervasyonu oluştur →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Reservation Detail Modal ── */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={
            {
              ...selectedReservation,
              cabana: {
                id: cabana!.id,
                name: cabana!.name,
                cabanaClass: cabana!.cabanaClass,
              },
            } as ReservationDetailData
          }
          onClose={() => setSelectedReservation(null)}
          currency={currency}
        />
      )}

      {/* ── Request Modal ── */}
      {requestModal && cabana && (
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
              cabanaId={cabana.id}
              cabanaName={cabana.name}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBadge({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${bg} border border-neutral-800/60`}
    >
      <span className={color}>{icon}</span>
      <span className="text-[10px] text-neutral-500">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
