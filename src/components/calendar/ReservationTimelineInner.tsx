"use client";

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  Users,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  AlertTriangle,
  BarChart3,
  Sun,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ReservationStatus } from "@/types";
import {
  useReservationCalendar,
  type TimelineReservation,
  type TimelineCabana,
} from "@/hooks/useReservationCalendar";

// ─── Constants ────────────────────────────────────────────────────────────

type ViewMode = "day" | "3day" | "week" | "2week" | "month";

const VIEW_DAYS: Record<ViewMode, number> = {
  day: 1,
  "3day": 3,
  week: 7,
  "2week": 14,
  month: 30,
};

const VIEW_LABELS: Record<ViewMode, string> = {
  day: "Gün",
  "3day": "3 Gün",
  week: "Hafta",
  "2week": "2 Hafta",
  month: "Ay",
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "bg-yellow-500/90",
  [ReservationStatus.APPROVED]: "bg-emerald-500/90",
  [ReservationStatus.REJECTED]: "bg-red-500/60",
  [ReservationStatus.CANCELLED]: "bg-neutral-600/60",
  [ReservationStatus.MODIFICATION_PENDING]: "bg-orange-500/90",
  [ReservationStatus.EXTRA_PENDING]: "bg-purple-500/90",
  [ReservationStatus.CHECKED_IN]: "bg-teal-400/95",
  [ReservationStatus.CHECKED_OUT]: "bg-slate-500/70",
};

const STATUS_BORDER: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "border-yellow-400",
  [ReservationStatus.APPROVED]: "border-emerald-400",
  [ReservationStatus.REJECTED]: "border-red-400",
  [ReservationStatus.CANCELLED]: "border-neutral-500",
  [ReservationStatus.MODIFICATION_PENDING]: "border-orange-400",
  [ReservationStatus.EXTRA_PENDING]: "border-purple-400",
  [ReservationStatus.CHECKED_IN]: "border-teal-300",
  [ReservationStatus.CHECKED_OUT]: "border-slate-400",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: "Bekliyor",
  [ReservationStatus.APPROVED]: "Onaylı",
  [ReservationStatus.REJECTED]: "Reddedildi",
  [ReservationStatus.CANCELLED]: "İptal",
  [ReservationStatus.MODIFICATION_PENDING]: "Değişiklik Bekliyor",
  [ReservationStatus.EXTRA_PENDING]: "Ek Konsept Bekliyor",
  [ReservationStatus.CHECKED_IN]: "Giriş Yapıldı",
  [ReservationStatus.CHECKED_OUT]: "Çıkış Yapıldı",
};

const STATUS_ICON: Record<ReservationStatus, typeof Clock> = {
  [ReservationStatus.PENDING]: Clock,
  [ReservationStatus.APPROVED]: CheckCircle2,
  [ReservationStatus.REJECTED]: XCircle,
  [ReservationStatus.CANCELLED]: XCircle,
  [ReservationStatus.MODIFICATION_PENDING]: RefreshCw,
  [ReservationStatus.EXTRA_PENDING]: AlertTriangle,
  [ReservationStatus.CHECKED_IN]: LogIn,
  [ReservationStatus.CHECKED_OUT]: LogOut,
};

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

const DAYS_SHORT_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

// ─── Helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function generateDateRange(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Props ────────────────────────────────────────────────────────────────

interface ReservationTimelineProps {
  classFilter?: string;
  onReservationClick?: (reservation: TimelineReservation) => void;
  onCabanaClick?: (cabana: TimelineCabana) => void;
  onCellClick?: (cabanaId: string, date: string) => void;
  onQuickAction?: (
    action: string,
    reservationId: string,
  ) => void | Promise<void>;
  isAdmin?: boolean;
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function ReservationTimelineInner({
  classFilter,
  onReservationClick,
  onCabanaClick,
  onCellClick,
  onQuickAction,
  isAdmin = false,
  compact = false,
}: ReservationTimelineProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [baseDate, setBaseDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedReservation, setSelectedReservation] =
    useState<TimelineReservation | null>(null);
  const [hoveredReservation, setHoveredReservation] =
    useState<TimelineReservation | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">(
    "all",
  );
  const [showStats, setShowStats] = useState(!compact);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Date calculations
  const dayCount = VIEW_DAYS[viewMode];
  const startDate = useMemo(() => {
    const d = new Date(baseDate);
    // Center on base date for multi-day views
    if (dayCount > 1) {
      d.setDate(d.getDate() - Math.floor(dayCount / 4));
    }
    return d;
  }, [baseDate, dayCount]);

  const endDate = useMemo(
    () => addDays(startDate, dayCount),
    [startDate, dayCount],
  );

  const dates = useMemo(
    () => generateDateRange(startDate, dayCount),
    [startDate, dayCount],
  );

  // Data hook
  const {
    cabanas,
    reservationsByCabana,
    blackoutsByCabana,
    stats,
    isLoading,
    isError,
    error,
    isFetching,
    sseConnected,
    lastUpdate,
    refresh,
  } = useReservationCalendar({
    startDate: toDateStr(startDate),
    endDate: toDateStr(endDate),
    classId: classFilter,
  });

  // Filter cabanas if class filter is applied
  const filteredCabanas = useMemo(() => {
    if (!classFilter || classFilter === "all") return cabanas;
    return cabanas.filter((c) => c.classId === classFilter);
  }, [cabanas, classFilter]);

  // Cell width calculation for responsive
  const cellWidth = useMemo(() => {
    if (viewMode === "day") return 200;
    if (viewMode === "3day") return 140;
    if (viewMode === "week") return 120;
    if (viewMode === "2week") return 80;
    return 50;
  }, [viewMode]);

  const rowHeight = compact ? 44 : 56;

  // ── Navigation ──────────────────────────────────────────────────────

  const navigate = useCallback(
    (direction: -1 | 1) => {
      setBaseDate((prev) => addDays(prev, direction * dayCount));
    },
    [dayCount],
  );

  const goToToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setBaseDate(d);
  }, []);

  // ── Reservation bar geometry ────────────────────────────────────────

  const getBarGeometry = useCallback(
    (r: TimelineReservation) => {
      if (!r.startDate || !r.endDate) return null;

      const rStart = new Date(r.startDate + "T00:00:00");
      const rEnd = new Date(r.endDate + "T00:00:00");

      // Guard against invalid dates producing NaN
      if (isNaN(rStart.getTime()) || isNaN(rEnd.getTime())) return null;

      const startOffset = daysBetween(startDate, rStart);
      const endOffset = daysBetween(startDate, rEnd);

      const clampedStart = clamp(startOffset, 0, dayCount);
      const clampedEnd = clamp(endOffset + 1, 0, dayCount); // +1 because endDate is inclusive

      if (clampedStart >= clampedEnd) return null;

      const left = clampedStart * cellWidth;
      const width = (clampedEnd - clampedStart) * cellWidth;

      return {
        left,
        width: Math.max(width, 24), // minimum visible width
        startsBeforeView: startOffset < 0,
        endsAfterView: endOffset + 1 > dayCount,
      };
    },
    [startDate, dayCount, cellWidth],
  );

  // ── Tooltip handling ────────────────────────────────────────────────

  const handleBarHover = useCallback(
    (r: TimelineReservation, e: ReactMouseEvent<HTMLDivElement>) => {
      setHoveredReservation(r);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleBarLeave = useCallback(() => {
    setHoveredReservation(null);
  }, []);

  const handleBarClick = useCallback(
    (r: TimelineReservation) => {
      setSelectedReservation(r);
      onReservationClick?.(r);
    },
    [onReservationClick],
  );

  // ── Fullscreen toggle ──────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "t" || e.key === "T") goToToday();
      if (e.key === "Escape") {
        setSelectedReservation(null);
        setHoveredReservation(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, goToToday]);

  // ── Status filter ──────────────────────────────────────────────────

  const filterReservations = useCallback(
    (reservations: TimelineReservation[]) => {
      if (statusFilter === "all") return reservations;
      return reservations.filter((r) => r.status === statusFilter);
    },
    [statusFilter],
  );

  // ── Render ─────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 bg-neutral-900/60 rounded-xl border border-red-900/30">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 font-medium">Takvim verileri yüklenemedi</p>
        <p className="text-neutral-500 text-sm">
          {error?.message || "Bilinmeyen hata"}
        </p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  const todayIndex = dates.findIndex((d) => isToday(d));

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-neutral-950/80 backdrop-blur-md rounded-2xl border border-neutral-800/60 overflow-hidden shadow-2xl
        ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}
    >
      {/* ── Header Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-900/80 border-b border-neutral-800/50">
        {/* Left: Title + connection */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white tracking-tight">
            Rezervasyon Zaman Çizelgesi
          </h2>
          {/* Connection indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all
              ${sseConnected ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-red-950/60 text-red-400 border border-red-800/40 animate-pulse"}`}
            title={
              sseConnected
                ? "Canlı bağlantı aktif"
                : "Bağlantı koptu – otomatik yenileme aktif"
            }
          >
            {sseConnected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {sseConnected ? "CANLI" : "KOPUK"}
          </div>
          {isFetching && (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          )}
        </div>

        {/* Center: Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
            title="Geri"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-1 text-xs font-medium bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-700/30 rounded-lg transition-colors"
          >
            Bugün
          </button>

          <span className="text-sm font-medium text-neutral-300 min-w-[180px] text-center">
            {formatDateShort(startDate)} –{" "}
            {formatDateShort(addDays(endDate, -1))}
          </span>

          <button
            onClick={() => navigate(1)}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
            title="İleri"
          >
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Right: View toggles + tools */}
        <div className="flex items-center gap-2">
          {/* View mode toggles */}
          <div className="flex bg-neutral-800/60 rounded-lg p-0.5 border border-neutral-700/40">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all
                  ${
                    viewMode === mode
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50"
                  }`}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ReservationStatus | "all")
            }
            className="px-2 py-1 text-[11px] bg-neutral-800/80 border border-neutral-700/40 text-neutral-300 rounded-lg outline-none cursor-pointer"
          >
            <option value="all">Tüm Durumlar</option>
            {Object.values(ReservationStatus).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {/* Toggle stats */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-1.5 rounded-lg transition-colors ${showStats ? "bg-amber-600/20 text-amber-400" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"}`}
            title="İstatistikleri göster/gizle"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500 hover:text-neutral-300"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500 hover:text-neutral-300"
            title={isFullscreen ? "Küçült" : "Tam Ekran"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      {showStats && stats && (
        <div className="flex items-center gap-4 px-4 py-2 bg-neutral-900/40 border-b border-neutral-800/30 overflow-x-auto scrollbar-none">
          <StatBadge
            label="Toplam"
            value={stats.totalCabanas}
            color="text-neutral-300"
          />
          <StatBadge
            label="Dolu"
            value={stats.occupiedToday}
            color="text-emerald-400"
          />
          <StatBadge
            label="Bekleyen"
            value={stats.pendingToday}
            color="text-yellow-400"
          />
          <StatBadge
            label="Check-in"
            value={stats.checkedInToday}
            color="text-teal-400"
          />
          <StatBadge
            label="Müsait"
            value={stats.availableToday}
            color="text-blue-400"
          />
          <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800/50 rounded-lg">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Doluluk
            </span>
            <span className="text-sm font-bold text-amber-400">
              %{stats.occupancyRate}
            </span>
          </div>
          <div className="ml-auto text-[10px] text-neutral-600">
            Son güncelleme: {new Date(lastUpdate).toLocaleTimeString("tr-TR")}
          </div>
        </div>
      )}

      {/* ── Timeline Grid ──────────────────────────────────────────── */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto relative"
        style={{
          maxHeight: isFullscreen ? "calc(100vh - 140px)" : compact ? 400 : 600,
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
              <p className="text-sm text-neutral-500">Yükleniyor...</p>
            </div>
          </div>
        ) : (
          <div className="inline-block min-w-full">
            {/* Date Header Row */}
            <div
              className="sticky top-0 z-20 flex bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800/50"
              style={{ minHeight: 48 }}
            >
              {/* Cabana name column */}
              <div
                className="sticky left-0 z-30 flex items-center justify-center bg-neutral-900/95 backdrop-blur-sm border-r border-neutral-800/50 px-3"
                style={{ minWidth: 160, width: 160 }}
              >
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Kabana
                </span>
              </div>

              {/* Date columns */}
              {dates.map((d, i) => {
                const today = isToday(d);
                const weekend = isWeekend(d);
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center border-r border-neutral-800/30 transition-colors shrink-0
                      ${today ? "bg-amber-950/30" : weekend ? "bg-neutral-800/20" : ""}
                    `}
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider
                        ${today ? "text-amber-400" : weekend ? "text-neutral-600" : "text-neutral-500"}`}
                    >
                      {DAYS_SHORT_TR[d.getDay()]}
                    </span>
                    <span
                      className={`text-sm font-bold
                        ${today ? "text-amber-400" : "text-neutral-300"}`}
                    >
                      {d.getDate()}
                    </span>
                    {viewMode === "2week" || viewMode === "month" ? null : (
                      <span className="text-[9px] text-neutral-600">
                        {MONTHS_TR[d.getMonth()].slice(0, 3)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cabana Rows */}
            {filteredCabanas.map((cabana, rowIdx) => {
              const rowReservations = filterReservations(
                reservationsByCabana.get(cabana.id) ?? [],
              );
              const rowBlackouts = blackoutsByCabana.get(cabana.id) ?? [];

              return (
                <div
                  key={cabana.id}
                  className={`flex border-b border-neutral-800/20 transition-colors
                    ${rowIdx % 2 === 0 ? "bg-neutral-950/40" : "bg-neutral-900/20"}
                    hover:bg-neutral-800/15`}
                  style={{ minHeight: rowHeight }}
                >
                  {/* Cabana Name Column (sticky) */}
                  <button
                    type="button"
                    onClick={() => onCabanaClick?.(cabana)}
                    className={`sticky left-0 z-10 flex items-center gap-2 px-3 border-r border-neutral-800/40 backdrop-blur-sm shrink-0 text-left
                      ${rowIdx % 2 === 0 ? "bg-neutral-950/90" : "bg-neutral-900/90"}`}
                    style={{ minWidth: 160, width: 160 }}
                    title={
                      onCabanaClick
                        ? `${cabana.name} detayını görüntüle`
                        : undefined
                    }
                  >
                    {/* Status dot */}
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        cabana.isOpenForReservation
                          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                          : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-neutral-200 truncate">
                        {cabana.name}
                      </span>
                      {cabana.cabanaClass && (
                        <span className="text-[9px] text-neutral-600 truncate">
                          {cabana.cabanaClass.name}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Timeline cells area */}
                  <div
                    className="relative flex-1"
                    style={{
                      width: dates.length * cellWidth,
                      minWidth: dates.length * cellWidth,
                      height: rowHeight,
                    }}
                  >
                    {/* Grid lines (day separators) */}
                    {dates.map((d, i) => {
                      const today = isToday(d);
                      const weekend = isWeekend(d);
                      return (
                        <div
                          key={i}
                          className={`absolute top-0 bottom-0 border-r border-neutral-800/20 cursor-pointer transition-colors hover:bg-neutral-700/10
                            ${today ? "bg-amber-950/15" : weekend ? "bg-neutral-800/10" : ""}`}
                          style={{
                            left: i * cellWidth,
                            width: cellWidth,
                          }}
                          onClick={() => onCellClick?.(cabana.id, toDateStr(d))}
                        />
                      );
                    })}

                    {/* Blackout date overlays */}
                    {rowBlackouts.map((b) => {
                      const bStart = new Date(b.startDate + "T00:00:00");
                      const bEnd = new Date(b.endDate + "T00:00:00");
                      const startOff = daysBetween(startDate, bStart);
                      const endOff = daysBetween(startDate, bEnd);
                      const cStart = clamp(startOff, 0, dayCount);
                      const cEnd = clamp(endOff + 1, 0, dayCount);
                      if (cStart >= cEnd) return null;

                      return (
                        <div
                          key={b.id}
                          className="absolute top-0 bottom-0 bg-red-950/20 border border-dashed border-red-800/30 z-[1]"
                          style={{
                            left: cStart * cellWidth,
                            width: (cEnd - cStart) * cellWidth,
                          }}
                          title={`Kapalı: ${b.reason || "Bloke tarih"}`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] text-red-500/60 font-medium tracking-wider uppercase">
                              KAPALI
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Reservation bars */}
                    {rowReservations.map((r) => {
                      const geo = getBarGeometry(r);
                      if (!geo) return null;

                      const StatusIcon = STATUS_ICON[r.status];
                      const isSelected = selectedReservation?.id === r.id;

                      return (
                        <div
                          key={r.id}
                          className={`absolute z-[5] flex items-center gap-1 px-2 rounded-md cursor-pointer
                            transition-all duration-150 hover:scale-[1.02] hover:z-[8] hover:shadow-lg
                            border-l-[3px]
                            ${STATUS_COLORS[r.status]}
                            ${STATUS_BORDER[r.status]}
                            ${isSelected ? "ring-2 ring-amber-400/60 ring-offset-1 ring-offset-neutral-950 scale-[1.02] z-[8]" : ""}
                            ${geo.startsBeforeView ? "rounded-l-none" : ""}
                            ${geo.endsAfterView ? "rounded-r-none" : ""}
                          `}
                          style={{
                            left: geo.left + 2,
                            width: geo.width - 4,
                            top: 6,
                            height: rowHeight - 12,
                          }}
                          onClick={() => handleBarClick(r)}
                          onMouseEnter={(e) => handleBarHover(r, e)}
                          onMouseMove={(e) =>
                            setTooltipPos({ x: e.clientX, y: e.clientY })
                          }
                          onMouseLeave={handleBarLeave}
                        >
                          <StatusIcon className="w-3 h-3 text-white/80 shrink-0" />
                          {geo.width > 60 && (
                            <span className="text-[10px] font-semibold text-white/90 truncate leading-tight">
                              {r.guestName}
                            </span>
                          )}
                          {geo.width > 140 && (
                            <span className="text-[9px] text-white/60 truncate ml-auto">
                              {STATUS_LABELS[r.status]}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Today indicator line */}
                    {todayIndex >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-[2px] bg-amber-400/60 z-[4] pointer-events-none"
                        style={{
                          left:
                            todayIndex * cellWidth +
                            cellWidth * (new Date().getHours() / 24),
                        }}
                      >
                        <div className="absolute -top-0.5 -left-1 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredCabanas.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-40 text-neutral-500">
                <p className="text-sm">
                  {classFilter
                    ? "Bu sınıfa ait kabana bulunamadı."
                    : "Kabana verisi bulunamadı."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status Legend ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/60 border-t border-neutral-800/30 overflow-x-auto scrollbar-none">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <button
            key={status}
            onClick={() =>
              setStatusFilter(
                statusFilter === status ? "all" : (status as ReservationStatus),
              )
            }
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] transition-all cursor-pointer whitespace-nowrap
              ${
                statusFilter === status
                  ? "ring-1 ring-amber-400/50 bg-neutral-800"
                  : "hover:bg-neutral-800/50"
              }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[status as ReservationStatus]}`}
            />
            <span className="text-neutral-400">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Hover Tooltip ──────────────────────────────────────────── */}
      {hoveredReservation && (
        <ReservationTooltip
          reservation={hoveredReservation}
          x={tooltipPos.x}
          y={tooltipPos.y}
        />
      )}

      {/* ── Selected Reservation Detail Panel ──────────────────────── */}
      {selectedReservation && (
        <ReservationDetailPanel
          reservation={selectedReservation}
          isAdmin={isAdmin}
          onClose={() => setSelectedReservation(null)}
          onAction={onQuickAction}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800/50 rounded-lg whitespace-nowrap">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ReservationTooltip({
  reservation: r,
  x,
  y,
}: {
  reservation: TimelineReservation;
  x: number;
  y: number;
}) {
  const StatusIcon = STATUS_ICON[r.status];
  return (
    <div
      className="fixed z-[100] pointer-events-none animate-in fade-in duration-100"
      style={{
        left: x + 12,
        top: y - 10,
      }}
    >
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/60 rounded-xl p-3 shadow-2xl max-w-[260px]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[r.status]}`}
          />
          <span className="text-xs font-bold text-white truncate">
            {r.guestName}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <StatusIcon className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] text-neutral-400">
              {STATUS_LABELS[r.status]}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] text-neutral-400">
              {new Date(r.startDate).toLocaleDateString("tr-TR")} –{" "}
              {new Date(r.endDate).toLocaleDateString("tr-TR")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] text-neutral-400">
              {r.cabana.name}
            </span>
          </div>
          {r.guest?.vipLevel && r.guest.vipLevel !== "STANDARD" && (
            <div className="flex items-center gap-1.5">
              <Sun className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-amber-400 font-medium">
                VIP: {r.guest.vipLevel}
              </span>
            </div>
          )}
          {r.notes && (
            <p className="text-[10px] text-neutral-500 mt-1 italic line-clamp-2">
              {r.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReservationDetailPanel({
  reservation: r,
  isAdmin,
  onClose,
  onAction,
}: {
  reservation: TimelineReservation;
  isAdmin: boolean;
  onClose: () => void;
  onAction?: (action: string, id: string) => void | Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    if (!onAction) return;
    setActionLoading(action);
    try {
      await onAction(action, r.id);
    } catch {
      // Error handled by parent
    } finally {
      setActionLoading(null);
    }
  };

  const StatusIcon = STATUS_ICON[r.status];

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-neutral-900/95 backdrop-blur-xl border-l border-neutral-800/60 z-[50] flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/40">
        <h3 className="text-sm font-bold text-white">Rezervasyon Detay</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 rc-scrollbar">
        {/* Guest info */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider">
            Misafir
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-400">
                {r.guestName.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{r.guestName}</p>
              {r.guest?.vipLevel && r.guest.vipLevel !== "STANDARD" && (
                <p className="text-[10px] text-amber-400">
                  VIP {r.guest.vipLevel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider">
            Durum
          </h4>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${STATUS_BORDER[r.status]} bg-neutral-800/40`}
          >
            <StatusIcon className="w-4 h-4 text-neutral-300" />
            <span className="text-sm font-medium text-neutral-200">
              {STATUS_LABELS[r.status]}
            </span>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider">
            Tarihler
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-800/40 rounded-lg p-2">
              <p className="text-[9px] text-neutral-500">Giriş</p>
              <p className="text-xs font-medium text-neutral-200">
                {new Date(r.startDate).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <div className="bg-neutral-800/40 rounded-lg p-2">
              <p className="text-[9px] text-neutral-500">Çıkış</p>
              <p className="text-xs font-medium text-neutral-200">
                {new Date(r.endDate).toLocaleDateString("tr-TR")}
              </p>
            </div>
          </div>
          {r.checkInAt && (
            <p className="text-[10px] text-teal-400">
              Check-in:{" "}
              {new Date(r.checkInAt).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {r.checkOutAt && (
            <p className="text-[10px] text-slate-400">
              Check-out:{" "}
              {new Date(r.checkOutAt).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* Cabana */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider">
            Kabana
          </h4>
          <p className="text-sm font-medium text-neutral-200">
            {r.cabana.name}
          </p>
        </div>

        {/* Notes */}
        {r.notes && (
          <div className="space-y-2">
            <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Notlar
            </h4>
            <p className="text-xs text-neutral-400 bg-neutral-800/40 rounded-lg p-2">
              {r.notes}
            </p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {isAdmin && onAction && (
        <div className="p-4 border-t border-neutral-800/40 space-y-2">
          {r.status === ReservationStatus.PENDING && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction("approve")}
                disabled={actionLoading !== null}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-700/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading === "approve" ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                Onayla
              </button>
              <button
                onClick={() => handleAction("reject")}
                disabled={actionLoading !== null}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-700/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading === "reject" ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                Reddet
              </button>
            </div>
          )}
          {r.status === ReservationStatus.APPROVED && (
            <button
              onClick={() => handleAction("check-in")}
              disabled={actionLoading !== null}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-700/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "check-in" ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <LogIn className="w-3 h-3" />
              )}
              Check-in Yap
            </button>
          )}
          {r.status === ReservationStatus.CHECKED_IN && (
            <button
              onClick={() => handleAction("check-out")}
              disabled={actionLoading !== null}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 border border-slate-700/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "check-out" ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <LogOut className="w-3 h-3" />
              )}
              Check-out Yap
            </button>
          )}
        </div>
      )}
    </div>
  );
}
