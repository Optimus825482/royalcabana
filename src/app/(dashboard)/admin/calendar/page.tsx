"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReservationCalendar from "@/components/calendar/ReservationCalendar";
import ReservationTimeline from "@/components/calendar/ReservationTimeline";
import { ReservationStatus } from "@/types";
import {
    AlertTriangle,
    X,
    Check,
    Ban,
    LogIn,
    LogOut,
    DollarSign,
    LayoutList,
    CalendarDays,
} from "lucide-react";
import type { TimelineReservation } from "@/hooks/useReservationCalendar";
import type {
    ReservationEvent,
    CabanaResource,
    CabanaWithStatus,
} from "@/types";
import { formatPrice, fetchSystemCurrency, type CurrencyCode, DEFAULT_CURRENCY } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────

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
    user?: { id: string; username: string };
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

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ReservationStatus, string> = {
    [ReservationStatus.PENDING]: "Bekliyor",
    [ReservationStatus.APPROVED]: "Onaylı",
    [ReservationStatus.REJECTED]: "Reddedildi",
    [ReservationStatus.CANCELLED]: "İptal",
    [ReservationStatus.MODIFICATION_PENDING]: "Değişiklik Bekliyor",
    [ReservationStatus.EXTRA_PENDING]: "Ek Konsept Bekliyor",
    [ReservationStatus.CHECKED_IN]: "Giriş Yapıldı",
    [ReservationStatus.CHECKED_OUT]: "Çıkış Yapıldı",
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
    [ReservationStatus.CHECKED_IN]:
        "bg-teal-950/50 border-teal-700/40 text-teal-400",
    [ReservationStatus.CHECKED_OUT]:
        "bg-slate-800 border-slate-700 text-slate-400",
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

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
    // API returns { isOpen: boolean }
    if (typeof data.isOpen !== "undefined") {
        return { system_open_for_reservation: data.isOpen === true || data.isOpen === "true" };
    }
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
        () =>
            cabanas.map((c) => ({ id: c.id, title: c.name, classId: c.classId })),
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
                (c as any).cabanaClass?.name ?? c.classId,
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
                                ? "Gerçek zamanlı kabana zaman çizelgesi – onay ve check-in yönetimi"
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
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all
                                ${viewType === "timeline" ? "bg-amber-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            Zaman Çizelgesi
                        </button>
                        <button
                            onClick={() => setViewType("calendar")}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all
                                ${viewType === "calendar" ? "bg-amber-600 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Takvim
                        </button>
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
            </div>

            {/* Content: Timeline or Calendar */}
            <div className="flex-1 p-4 sm:p-6">
                {viewType === "timeline" ? (
                    <ReservationTimeline
                        classFilter={classFilter || undefined}
                        isAdmin
                        onReservationClick={(r: TimelineReservation) => {
                            const detail = reservationData?.reservations.find(
                                (res) => res.id === r.id,
                            );
                            if (detail) setSelectedReservation(detail);
                        }}
                        onQuickAction={async (reservationId, action) => {
                            try {
                                const endpoint = action === "approve" ? "approve" : action === "reject" ? "reject" : action === "check-in" ? "check-in" : "check-out";
                                const res = await fetch(`/api/reservations/${reservationId}/${endpoint}`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(action === "reject" ? { reason: "Admin tarafından reddedildi" } : {}),
                                });
                                if (res.ok) refreshData();
                            } catch { /* error handled in timeline */ }
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
                        onEventClick={handleEventClick}
                        onContextMenu={handleContextMenu}
                        classFilter={classFilter || undefined}
                    />
                )}
            </div>

            {/* Reservation Detail + Actions Modal */}
            {selectedReservation && (
                <AdminReservationModal
                    reservation={selectedReservation}
                    onClose={() => setSelectedReservation(null)}
                    onAction={refreshData}
                    currency={currency}
                />
            )}
        </div>
    );
}

// ─── Admin Reservation Modal ──────────────────────────────────────────────────

function AdminReservationModal({
    reservation,
    onClose,
    onAction,
    currency,
}: {
    reservation: ReservationDetail;
    onClose: () => void;
    onAction: () => void;
    currency: CurrencyCode;
}) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [manualPrice, setManualPrice] = useState("");
    const [error, setError] = useState("");

    const canApprove = reservation.status === ReservationStatus.PENDING;
    const canReject = reservation.status === ReservationStatus.PENDING;
    const canCheckIn = reservation.status === ReservationStatus.APPROVED;
    const canCheckOut = reservation.status === ReservationStatus.CHECKED_IN;

    async function handleApprove() {
        setActionLoading("approve");
        setError("");
        try {
            const body: Record<string, unknown> = {};
            if (manualPrice && !isNaN(parseFloat(manualPrice))) {
                body.totalPrice = parseFloat(manualPrice);
            }
            const res = await fetch(`/api/reservations/${reservation.id}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Onaylama başarısız.");
                setActionLoading(null);
                return;
            }
            onAction();
        } catch {
            setError("Bir hata oluştu.");
        }
        setActionLoading(null);
    }

    async function handleReject() {
        if (!rejectReason.trim()) {
            setError("Red sebebi zorunludur.");
            return;
        }
        setActionLoading("reject");
        setError("");
        try {
            const res = await fetch(`/api/reservations/${reservation.id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Reddetme başarısız.");
                setActionLoading(null);
                return;
            }
            onAction();
        } catch {
            setError("Bir hata oluştu.");
        }
        setActionLoading(null);
    }

    async function handleCheckIn() {
        setActionLoading("checkin");
        setError("");
        try {
            const res = await fetch(
                `/api/reservations/${reservation.id}/check-in`,
                { method: "POST" },
            );
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Check-in başarısız.");
                setActionLoading(null);
                return;
            }
            onAction();
        } catch {
            setError("Bir hata oluştu.");
        }
        setActionLoading(null);
    }

    async function handleCheckOut() {
        setActionLoading("checkout");
        setError("");
        try {
            const res = await fetch(
                `/api/reservations/${reservation.id}/check-out`,
                { method: "POST" },
            );
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Check-out başarısız.");
                setActionLoading(null);
                return;
            }
            onAction();
        } catch {
            setError("Bir hata oluştu.");
        }
        setActionLoading(null);
    }

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
                        <h2 className="text-base font-semibold text-amber-400">
                            {reservation.guestName}
                        </h2>
                        <p className="text-xs text-neutral-500 mt-0.5">
                            {reservation.cabana.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                        aria-label="Kapat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
                    <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[reservation.status]}`}
                    >
                        {STATUS_LABEL[reservation.status]}
                    </span>

                    <div className="space-y-3 text-sm">
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
                                value={formatPrice(Number(reservation.totalPrice), currency)}
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

                    {/* Status History */}
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

                    {/* Error */}
                    {error && (
                        <div className="bg-red-950/40 border border-red-800/30 rounded-lg px-3 py-2 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Reject Form */}
                    {showRejectForm && canReject && (
                        <div className="space-y-3 bg-neutral-800/50 rounded-lg p-4">
                            <label className="text-xs text-neutral-400 font-medium">
                                Red Sebebi
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 resize-none focus:outline-none focus:border-amber-500 min-h-[80px]"
                                placeholder="Reddetme sebebini yazın..."
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading === "reject"}
                                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Ban className="w-4 h-4" />
                                    {actionLoading === "reject" ? "Reddediliyor..." : "Reddet"}
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(false)}
                                    className="px-4 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                                >
                                    İptal
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Manual Price Input (for approve) */}
                    {canApprove && !showRejectForm && (
                        <div className="bg-neutral-800/50 rounded-lg p-4 space-y-2">
                            <label className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Manuel Fiyat (opsiyonel)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={manualPrice}
                                onChange={(e) => setManualPrice(e.target.value)}
                                placeholder="Boş bırakılırsa otomatik hesaplanır"
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="px-5 py-4 border-t border-neutral-800 shrink-0">
                    <div className="flex flex-wrap gap-2">
                        {canApprove && !showRejectForm && (
                            <>
                                <button
                                    onClick={handleApprove}
                                    disabled={!!actionLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    {actionLoading === "approve" ? "Onaylanıyor..." : "Onayla"}
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={!!actionLoading}
                                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-700/40 disabled:opacity-50 text-red-400 font-medium px-4 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Ban className="w-4 h-4" />
                                    Reddet
                                </button>
                            </>
                        )}

                        {canCheckIn && (
                            <button
                                onClick={handleCheckIn}
                                disabled={!!actionLoading}
                                className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <LogIn className="w-4 h-4" />
                                {actionLoading === "checkin" ? "İşleniyor..." : "Check-in"}
                            </button>
                        )}

                        {canCheckOut && (
                            <button
                                onClick={handleCheckOut}
                                disabled={!!actionLoading}
                                className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                {actionLoading === "checkout" ? "İşleniyor..." : "Check-out"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Shared Components ────────────────────────────────────────────────────────

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
