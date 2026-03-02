"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MapPin,
    User,
    Clock,
    DollarSign,
    CheckCircle,
    XCircle,
    LogIn,
    LogOut,
    ArrowUpDown,
    Eye,
    X,
    RefreshCw,
} from "lucide-react";
import { ReservationStatus } from "@/types";
import {
    formatPrice,
    fetchSystemCurrency,
    DEFAULT_CURRENCY,
    type CurrencyCode,
} from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reservation {
    id: string;
    guestName: string;
    startDate: string;
    endDate: string;
    status: ReservationStatus;
    totalPrice: string | number | null;
    notes: string | null;
    rejectionReason: string | null;
    checkInAt: string | null;
    checkOutAt: string | null;
    createdAt: string;
    updatedAt: string;
    cabana: { id: string; name: string };
    user: { id: string; username: string; email: string };
    statusHistory?: StatusHistoryItem[];
    modifications?: { id: string; status: string; newStartDate?: string; newEndDate?: string; newGuestName?: string }[];
    cancellations?: { id: string; status: string; reason?: string }[];
    extraConcepts?: { id: string; status: string; items?: unknown }[];
}

interface StatusHistoryItem {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedBy: string;
    reason: string | null;
    createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
> = {
    PENDING: { label: "Beklemede", bg: "bg-yellow-500/15", text: "text-yellow-300", dot: "bg-yellow-400" },
    APPROVED: { label: "Onaylı", bg: "bg-green-500/15", text: "text-green-300", dot: "bg-green-400" },
    REJECTED: { label: "Reddedildi", bg: "bg-red-500/15", text: "text-red-300", dot: "bg-red-400" },
    CANCELLED: { label: "İptal", bg: "bg-neutral-500/15", text: "text-neutral-400", dot: "bg-neutral-500" },
    CHECKED_IN: { label: "Check-in", bg: "bg-blue-500/15", text: "text-blue-300", dot: "bg-blue-400" },
    CHECKED_OUT: { label: "Check-out", bg: "bg-indigo-500/15", text: "text-indigo-300", dot: "bg-indigo-400" },
    MODIFICATION_PENDING: { label: "Değişiklik Bekleniyor", bg: "bg-orange-500/15", text: "text-orange-300", dot: "bg-orange-400" },
    EXTRA_PENDING: { label: "Ek Talep Bekleniyor", bg: "bg-pink-500/15", text: "text-pink-300", dot: "bg-pink-400" },
};

const FILTER_TABS = [
    { value: "", label: "Tümü" },
    { value: "PENDING", label: "Beklemede" },
    { value: "APPROVED", label: "Onaylı" },
    { value: "CHECKED_IN", label: "Check-in" },
    { value: "CHECKED_OUT", label: "Check-out" },
    { value: "REJECTED", label: "Reddedildi" },
    { value: "CANCELLED", label: "İptal" },
    { value: "MODIFICATION_PENDING", label: "Değişiklik" },
    { value: "EXTRA_PENDING", label: "Ek Talep" },
];

const PAGE_SIZE = 20;

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(d: string) {
    return new Date(d).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getDayCount(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function StatusTimeline({ items }: { items: StatusHistoryItem[] }) {
    if (!items || items.length === 0) {
        return (
            <p className="text-xs text-neutral-500 italic">Durum geçmişi bulunamadı.</p>
        );
    }
    return (
        <div className="space-y-3">
            {items.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-2.5 h-2.5 rounded-full mt-1 ${STATUS_CONFIG[h.toStatus]?.dot ?? "bg-neutral-500"
                                }`}
                        />
                        {i < items.length - 1 && (
                            <div className="w-px flex-1 bg-neutral-700 mt-1" />
                        )}
                    </div>
                    <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            {h.fromStatus && (
                                <>
                                    <StatusBadge status={h.fromStatus} />
                                    <span className="text-neutral-600 text-xs">→</span>
                                </>
                            )}
                            <StatusBadge status={h.toStatus} />
                        </div>
                        {h.reason && (
                            <p className="text-xs text-neutral-400 mt-1">{h.reason}</p>
                        )}
                        <p className="text-[10px] text-neutral-600 mt-1">
                            {formatDateTime(h.createdAt)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
    reservation,
    onClose,
    onAction,
    actionLoading,
    currency,
}: {
    reservation: Reservation;
    onClose: () => void;
    onAction: (action: string, id: string, data?: Record<string, unknown>) => void;
    actionLoading: boolean;
    currency: CurrencyCode;
}) {
    const [approvePrice, setApprovePrice] = useState(
        reservation.totalPrice ? String(reservation.totalPrice) : "",
    );
    const [rejectReason, setRejectReason] = useState("");
    const [showReject, setShowReject] = useState(false);
    const days = getDayCount(reservation.startDate, reservation.endDate);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-100">
                        Rezervasyon Detayı
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        ID: {reservation.id.slice(0, 12)}…
                    </p>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Detayı kapat"
                    className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Status */}
                <div className="px-5 py-4 border-b border-neutral-800">
                    <StatusBadge status={reservation.status} />
                </div>

                {/* Info Grid */}
                <div className="px-5 py-4 border-b border-neutral-800 grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2.5">
                        <User className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Misafir</p>
                            <p className="text-sm text-neutral-200">{reservation.guestName}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Kabana</p>
                            <p className="text-sm text-neutral-200">{reservation.cabana.name}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <Calendar className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                                Tarih ({days} gün)
                            </p>
                            <p className="text-sm text-neutral-200">
                                {formatDate(reservation.startDate)} – {formatDate(reservation.endDate)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <DollarSign className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Toplam Fiyat</p>
                            <p className="text-sm text-neutral-200">
                                {reservation.totalPrice
                                    ? formatPrice(reservation.totalPrice, currency)
                                    : "Belirlenmedi"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <User className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Oluşturan</p>
                            <p className="text-sm text-neutral-200">{reservation.user.username}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Oluşturulma</p>
                            <p className="text-sm text-neutral-200">{formatDateTime(reservation.createdAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Check-in / Check-out info */}
                {(reservation.checkInAt || reservation.checkOutAt) && (
                    <div className="px-5 py-4 border-b border-neutral-800 flex gap-6">
                        {reservation.checkInAt && (
                            <div className="flex items-center gap-2">
                                <LogIn className="w-4 h-4 text-blue-400" />
                                <div>
                                    <p className="text-[10px] text-neutral-500">Check-in</p>
                                    <p className="text-xs text-neutral-300">{formatDateTime(reservation.checkInAt)}</p>
                                </div>
                            </div>
                        )}
                        {reservation.checkOutAt && (
                            <div className="flex items-center gap-2">
                                <LogOut className="w-4 h-4 text-indigo-400" />
                                <div>
                                    <p className="text-[10px] text-neutral-500">Check-out</p>
                                    <p className="text-xs text-neutral-300">{formatDateTime(reservation.checkOutAt)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Notes */}
                {reservation.notes && (
                    <div className="px-5 py-4 border-b border-neutral-800">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-1">Notlar</p>
                        <p className="text-sm text-neutral-300">{reservation.notes}</p>
                    </div>
                )}

                {/* Rejection reason */}
                {reservation.rejectionReason && (
                    <div className="px-5 py-4 border-b border-neutral-800 bg-red-500/5">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-1">Red Sebebi</p>
                        <p className="text-sm text-red-300">{reservation.rejectionReason}</p>
                    </div>
                )}

                {/* Sub-requests */}
                {((reservation.modifications?.length ?? 0) > 0 ||
                    (reservation.cancellations?.length ?? 0) > 0 ||
                    (reservation.extraConcepts?.length ?? 0) > 0) && (
                        <div className="px-5 py-4 border-b border-neutral-800">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">Alt Talepler</p>
                            {(reservation.modifications?.length ?? 0) > 0 && (
                                <p className="text-xs text-orange-300 mb-1">
                                    📝 {reservation.modifications!.length} değişiklik talebi
                                </p>
                            )}
                            {(reservation.cancellations?.length ?? 0) > 0 && (
                                <p className="text-xs text-red-300 mb-1">
                                    ❌ {reservation.cancellations!.length} iptal talebi
                                </p>
                            )}
                            {(reservation.extraConcepts?.length ?? 0) > 0 && (
                                <p className="text-xs text-pink-300">
                                    ➕ {reservation.extraConcepts!.length} ek konsept talebi
                                </p>
                            )}
                        </div>
                    )}

                {/* Actions */}
                {reservation.status === "PENDING" && (
                    <div className="px-5 py-4 border-b border-neutral-800 space-y-3">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wide">İşlemler</p>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400 mb-1 block">
                                    Toplam Fiyat Belirle
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={approvePrice}
                                    onChange={(e) => setApprovePrice(e.target.value)}
                                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <button
                                onClick={() =>
                                    onAction("approve", reservation.id, {
                                        totalPrice: parseFloat(approvePrice) || 0,
                                    })
                                }
                                disabled={actionLoading || !approvePrice}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Onayla
                            </button>
                        </div>
                        {!showReject ? (
                            <button
                                onClick={() => setShowReject(true)}
                                className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            >
                                <XCircle className="w-4 h-4" />
                                Reddet
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none"
                                    rows={2}
                                    placeholder="Red sebebi..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            onAction("reject", reservation.id, { reason: rejectReason })
                                        }
                                        disabled={actionLoading || !rejectReason.trim()}
                                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        Reddet
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowReject(false);
                                            setRejectReason("");
                                        }}
                                        className="px-3 py-2 bg-neutral-800 text-neutral-400 text-sm rounded-lg hover:text-neutral-200 transition-colors"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {reservation.status === "APPROVED" && (
                    <div className="px-5 py-4 border-b border-neutral-800">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">İşlemler</p>
                        <button
                            onClick={() => onAction("check-in", reservation.id)}
                            disabled={actionLoading}
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-4 h-4" />
                            Check-in Yap
                        </button>
                    </div>
                )}

                {reservation.status === "CHECKED_IN" && (
                    <div className="px-5 py-4 border-b border-neutral-800">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">İşlemler</p>
                        <button
                            onClick={() => onAction("check-out", reservation.id)}
                            disabled={actionLoading}
                            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Check-out Yap
                        </button>
                    </div>
                )}

                {/* Status History */}
                <div className="px-5 py-4">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-3">
                        Durum Geçmişi
                    </p>
                    <StatusTimeline items={reservation.statusHistory ?? []} />
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [selected, setSelected] = useState<Reservation | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [sortField, setSortField] = useState<"createdAt" | "startDate">("createdAt");
    const [message, setMessage] = useState<{
        text: string;
        type: "success" | "error";
    } | null>(null);
    const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);

    useEffect(() => {
        fetchSystemCurrency().then(setCurrency).catch(() => { });
    }, []);

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE),
        });
        if (statusFilter) params.set("status", statusFilter);
        if (search) params.set("search", search);

        try {
            const res = await fetch(`/api/reservations?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReservations(data.reservations ?? []);
                setTotal(data.total ?? 0);
            }
        } catch {
            // ignore
        }
        setLoading(false);
    }, [page, statusFilter, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchReservations();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchReservations]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Client-side sort
    const sorted = useMemo(() => {
        const arr = [...reservations];
        arr.sort((a, b) => {
            const dateA = new Date(a[sortField]).getTime();
            const dateB = new Date(b[sortField]).getTime();
            return dateB - dateA;
        });
        return arr;
    }, [reservations, sortField]);

    // Action handler
    const handleAction = useCallback(
        async (action: string, id: string, data?: Record<string, unknown>) => {
            setActionLoading(true);
            setMessage(null);
            let url = "";
            let body: Record<string, unknown> | undefined;

            switch (action) {
                case "approve":
                    url = `/api/reservations/${id}/approve`;
                    body = data;
                    break;
                case "reject":
                    url = `/api/reservations/${id}/reject`;
                    body = data;
                    break;
                case "check-in":
                    url = `/api/reservations/${id}/check-in`;
                    break;
                case "check-out":
                    url = `/api/reservations/${id}/check-out`;
                    break;
                default:
                    setActionLoading(false);
                    return;
            }

            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    ...(body && { body: JSON.stringify(body) }),
                });
                if (res.ok) {
                    const labels: Record<string, string> = {
                        approve: "Rezervasyon onaylandı.",
                        reject: "Rezervasyon reddedildi.",
                        "check-in": "Check-in başarılı.",
                        "check-out": "Check-out başarılı.",
                    };
                    setMessage({ text: labels[action] ?? "İşlem başarılı.", type: "success" });
                    await fetchReservations();
                    setSelected(null);
                } else {
                    const err = await res.json().catch(() => ({}));
                    setMessage({
                        text: (err as { error?: string }).error ?? "İşlem başarısız.",
                        type: "error",
                    });
                }
            } catch {
                setMessage({ text: "Bağlantı hatası.", type: "error" });
            }
            setActionLoading(false);
        },
        [fetchReservations],
    );

    // Auto-dismiss messages
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 4000);
        return () => clearTimeout(t);
    }, [message]);

    return (
        <div className="text-neutral-100 flex flex-col h-full">
            {/* Top Bar */}
            <div className="px-4 sm:px-6 py-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-amber-400">Rezervasyonlar</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        Toplam {total} rezervasyon
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {message && (
                        <div
                            className={`text-sm px-4 py-2 rounded-lg ${message.type === "success"
                                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                                }`}
                        >
                            {message.text}
                        </div>
                    )}
                    <button
                        onClick={fetchReservations}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200"
                        title="Yenile"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="px-4 sm:px-6 py-3 border-b border-neutral-800 space-y-3">
                {/* Search + Sort */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Misafir adı veya kabana ara..."
                            className="w-full pl-10 pr-4 py-2 bg-neutral-800/60 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                    <button
                        onClick={() =>
                            setSortField((f) => (f === "createdAt" ? "startDate" : "createdAt"))
                        }
                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800/60 border border-neutral-700 rounded-lg text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        {sortField === "createdAt" ? "Oluşturma Tarihi" : "Başlangıç Tarihi"}
                    </button>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-1.5 flex-wrap">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setStatusFilter(tab.value);
                                setPage(1);
                                setSelected(null);
                            }}
                            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${statusFilter === tab.value
                                    ? "bg-amber-500 text-neutral-950"
                                    : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Table / List */}
                <div
                    className={`flex-1 flex flex-col overflow-hidden ${selected ? "hidden lg:flex" : "flex"
                        }`}
                >
                    {/* Table Header (desktop) */}
                    <div className="hidden md:grid grid-cols-[2fr_1.5fr_2fr_1fr_1.2fr_80px] gap-3 px-5 py-2.5 border-b border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-wider">
                        <span>Misafir</span>
                        <span>Kabana</span>
                        <span>Tarih</span>
                        <span>Fiyat</span>
                        <span>Durum</span>
                        <span className="text-center">Detay</span>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <RefreshCw className="w-5 h-5 text-neutral-500 animate-spin" />
                            </div>
                        ) : sorted.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-neutral-500 text-sm">
                                <Filter className="w-8 h-8 mb-2 opacity-30" />
                                Rezervasyon bulunamadı.
                            </div>
                        ) : (
                            sorted.map((r) => {
                                const days = getDayCount(r.startDate, r.endDate);
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelected(r)}
                                        className={`w-full text-left px-5 py-3.5 border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors ${selected?.id === r.id ? "bg-neutral-800/60" : ""
                                            }`}
                                    >
                                        {/* Mobile layout */}
                                        <div className="md:hidden space-y-1.5">
                                            <div className="flex items-start justify-between">
                                                <span className="text-sm font-medium text-neutral-100">
                                                    {r.guestName}
                                                </span>
                                                <StatusBadge status={r.status} />
                                            </div>
                                            <p className="text-xs text-neutral-400">{r.cabana.name}</p>
                                            <div className="flex items-center gap-3 text-xs text-neutral-500">
                                                <span>
                                                    {formatDate(r.startDate)} – {formatDate(r.endDate)}
                                                </span>
                                                <span className="text-neutral-600">({days} gün)</span>
                                            </div>
                                            {r.totalPrice && (
                                                <p className="text-xs text-emerald-400">
                                                    {formatPrice(r.totalPrice, currency)}
                                                </p>
                                            )}
                                        </div>

                                        {/* Desktop layout */}
                                        <div className="hidden md:grid grid-cols-[2fr_1.5fr_2fr_1fr_1.2fr_80px] gap-3 items-center">
                                            <div>
                                                <p className="text-sm font-medium text-neutral-100 truncate">
                                                    {r.guestName}
                                                </p>
                                                <p className="text-[10px] text-neutral-600 mt-0.5">
                                                    {r.user.username}
                                                </p>
                                            </div>
                                            <p className="text-sm text-neutral-300 truncate">{r.cabana.name}</p>
                                            <div>
                                                <p className="text-sm text-neutral-300">
                                                    {formatDate(r.startDate)} – {formatDate(r.endDate)}
                                                </p>
                                                <p className="text-[10px] text-neutral-600">{days} gün</p>
                                            </div>
                                            <p className="text-sm text-emerald-400">
                                                {r.totalPrice ? formatPrice(r.totalPrice, currency) : "—"}
                                            </p>
                                            <StatusBadge status={r.status} />
                                            <div className="flex justify-center">
                                                <Eye className="w-4 h-4 text-neutral-600" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-between">
                            <p className="text-xs text-neutral-500">
                                Sayfa {page}/{totalPages}
                            </p>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    aria-label="Önceki sayfa"
                                    className="p-2 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-400"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    aria-label="Sonraki sayfa"
                                    className="p-2 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-400"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail Sidebar */}
                <div
                    className={`absolute inset-0 lg:relative lg:inset-auto lg:w-[480px] lg:border-l border-neutral-800 bg-neutral-950 lg:bg-transparent overflow-hidden ${selected ? "flex flex-col" : "hidden lg:flex lg:flex-col"
                        }`}
                >
                    {selected ? (
                        <DetailPanel
                            reservation={selected}
                            onClose={() => setSelected(null)}
                            onAction={handleAction}
                            actionLoading={actionLoading}
                            currency={currency}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
                            Detay görmek için bir rezervasyon seçin.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
