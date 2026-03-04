"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  MapPin,
  Crown,
  Ban,
  Star,
  Filter,
  Eye,
  Clock,
  DollarSign,
  X,
} from "lucide-react";
import PermissionGate from "@/components/shared/PermissionGate";

interface ReservationHistory {
  id: string;
  cabanaName: string;
  cabanaId: string;
  conceptName: string | null;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  totalPrice: number | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  extras: { productName: string; quantity: number; unitPrice: number }[];
  hasExtras: boolean;
  createdAt: string;
}

interface HistorySummary {
  totalVisits: number;
  lastVisitAt: string | null;
  totalSpent: number;
  favoriteCabana: string | null;
  favoriteConcept: string | null;
}

interface GuestRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vipLevel: string;
  isBlacklisted: boolean;
  notes: string | null;
  totalVisits: number;
  lastVisitAt: string | null;
  createdAt: string;
  _count?: { reservations: number };
}

interface GuestForm {
  name: string;
  phone: string;
  email: string;
  vipLevel: string;
  notes: string;
  isBlacklisted: boolean;
}

interface GuestsResponse {
  guests: GuestRow[];
  total: number;
}

const defaultForm: GuestForm = {
  name: "",
  phone: "",
  email: "",
  vipLevel: "STANDARD",
  notes: "",
  isBlacklisted: false,
};

const PAGE_SIZE = 15;

const VIP_LABELS: Record<string, { label: string; color: string; bg: string }> =
  {
    STANDARD: {
      label: "Standard",
      color: "text-neutral-400",
      bg: "bg-neutral-800",
    },
    SILVER: {
      label: "Silver",
      color: "text-gray-300",
      bg: "bg-gray-700/40",
    },
    GOLD: {
      label: "Gold",
      color: "text-yellow-400",
      bg: "bg-yellow-900/30",
    },
    PLATINUM: {
      label: "Platinum",
      color: "text-purple-400",
      bg: "bg-purple-900/30",
    },
  };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  APPROVED: { label: "Onaylı", color: "text-green-400" },
  CHECKED_IN: { label: "Check-in", color: "text-blue-400" },
  CHECKED_OUT: { label: "Check-out", color: "text-purple-400" },
  CANCELLED: { label: "İptal", color: "text-red-400" },
  PENDING: { label: "Bekliyor", color: "text-amber-400" },
};

async function fetchGuests(
  page: number,
  search: string,
  vipLevel: string,
  blacklisted: string,
): Promise<GuestsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (search) params.set("search", search);
  if (vipLevel) params.set("vipLevel", vipLevel);
  if (blacklisted) params.set("isBlacklisted", blacklisted);

  const res = await fetch(`/api/guests?${params}`);
  if (!res.ok) throw new Error("Misafirler yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
}

async function fetchGuestHistory(
  id: string,
): Promise<{
  guest: GuestRow;
  reservations: ReservationHistory[];
  summary: HistorySummary;
}> {
  const res = await fetch(`/api/guests/${id}/history`);
  if (!res.ok) throw new Error("Geçmiş yüklenemedi.");
  const json = await res.json();
  return json.data;
}

async function createGuest(data: GuestForm): Promise<GuestRow> {
  const res = await fetch("/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Misafir oluşturulamadı.");
  }
  const json = await res.json();
  return json.data ?? json;
}

async function updateGuest(
  id: string,
  data: Partial<GuestForm>,
): Promise<GuestRow> {
  const res = await fetch(`/api/guests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Misafir güncellenemedi.");
  }
  const json = await res.json();
  return json.data ?? json;
}

async function deleteGuest(id: string): Promise<void> {
  const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Misafir silinemedi.");
  }
}

function VipBadge({ level }: { level: string }) {
  const v = VIP_LABELS[level] ?? VIP_LABELS.STANDARD;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${v.color} ${v.bg}`}
    >
      <Crown className="w-3 h-3" />
      {v.label}
    </span>
  );
}

export default function GuestsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterVip, setFilterVip] = useState("");
  const [filterBlacklisted, setFilterBlacklisted] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<GuestForm>(defaultForm);

  const [editGuest, setEditGuest] = useState<GuestRow | null>(null);
  const [editForm, setEditForm] = useState<GuestForm | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<GuestRow | null>(null);
  const [detailGuestId, setDetailGuestId] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const queryKey = [
    "guests",
    page,
    debouncedSearch,
    filterVip,
    filterBlacklisted,
  ];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      fetchGuests(page, debouncedSearch, filterVip, filterBlacklisted),
  });

  const {
    data: historyData,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ["guest-history", detailGuestId],
    queryFn: () => fetchGuestHistory(detailGuestId!),
    enabled: !!detailGuestId,
  });

  const guests = Array.isArray(data?.guests) ? data.guests : [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createMutation = useMutation({
    mutationFn: createGuest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      setShowCreate(false);
      setCreateForm(defaultForm);
      showToast("success", "Misafir başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: Partial<GuestForm> }) =>
      updateGuest(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guest-history"] });
      setEditGuest(null);
      setEditForm(null);
      showToast("success", "Misafir başarıyla güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGuest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      setDeleteTarget(null);
      showToast("success", "Misafir başarıyla silindi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const toggleBlacklist = useMutation({
    mutationFn: ({ id, blacklisted }: { id: string; blacklisted: boolean }) =>
      updateGuest(id, { isBlacklisted: blacklisted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guest-history"] });
      showToast("success", "Kara liste durumu güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function openEdit(guest: GuestRow) {
    setEditGuest(guest);
    setEditForm({
      name: guest.name,
      phone: guest.phone ?? "",
      email: guest.email ?? "",
      vipLevel: guest.vipLevel,
      notes: guest.notes ?? "",
      isBlacklisted: guest.isBlacklisted,
    });
  }

  function fmt(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const hasFilters = !!filterVip || !!filterBlacklisted;

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Misafir Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Misafir kayıtları, VIP seviyeleri ve ziyaret geçmişi
          </p>
        </div>
        <PermissionGate permission="guest.create">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Yeni Misafir
          </button>
        </PermissionGate>
      </div>

      {toast && (
        <div
          className={`mb-4 px-4 py-2.5 text-sm rounded-lg border ${
            toast.type === "success"
              ? "bg-green-950/50 border-green-700/40 text-green-400"
              : "bg-red-950/40 border-red-800/40 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, telefon veya e-posta ile ara..."
            className={`${inputCls} pl-10`}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors border ${
            hasFilters
              ? "bg-yellow-600/20 border-yellow-600/40 text-yellow-400"
              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtre
          {hasFilters && (
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
          <div>
            <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">
              VIP Seviye
            </label>
            <select
              value={filterVip}
              onChange={(e) => {
                setFilterVip(e.target.value);
                setPage(1);
              }}
              className={`${inputCls} w-40`}
            >
              <option value="">Tümü</option>
              <option value="STANDARD">Standard</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">
              Kara Liste
            </label>
            <select
              value={filterBlacklisted}
              onChange={(e) => {
                setFilterBlacklisted(e.target.value);
                setPage(1);
              }}
              className={`${inputCls} w-40`}
            >
              <option value="">Tümü</option>
              <option value="true">Kara Listede</option>
              <option value="false">Normal</option>
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setFilterVip("");
                setFilterBlacklisted("");
                setPage(1);
              }}
              className="self-end mb-0.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Temizle
            </button>
          )}
        </div>
      )}

      {isError && (
        <div className="text-center py-12 mb-4">
          <p className="text-red-400 text-sm">
            {(error as Error)?.message ??
              "Veriler yüklenirken bir hata oluştu."}
          </p>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Users className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Misafir bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">VIP</th>
                <th className="px-4 py-3 font-medium">Ziyaret</th>
                <th className="px-4 py-3 font-medium">Son Ziyaret</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  onClick={() => setDetailGuestId(guest.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-100">
                        {guest.name}
                      </span>
                      {guest.isBlacklisted && (
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                      )}
                    </div>
                    {guest.email && (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {guest.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {guest.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <VipBadge level={guest.vipLevel} />
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {guest.totalVisits}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {fmt(guest.lastVisitAt)}
                  </td>
                  <td className="px-4 py-3">
                    {guest.isBlacklisted ? (
                      <span className="text-xs text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full">
                        Kara Liste
                      </span>
                    ) : (
                      <span className="text-xs text-green-400 bg-green-950/40 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setDetailGuestId(guest.id)}
                        title="Detay"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <PermissionGate permission="guest.update">
                        <button
                          onClick={() => openEdit(guest)}
                          title="Düzenle"
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="guest.update">
                        <button
                          onClick={() =>
                            toggleBlacklist.mutate({
                              id: guest.id,
                              blacklisted: !guest.isBlacklisted,
                            })
                          }
                          title={
                            guest.isBlacklisted
                              ? "Kara Listeden Çıkar"
                              : "Kara Listeye Ekle"
                          }
                          className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors ${
                            guest.isBlacklisted
                              ? "bg-green-950/50 hover:bg-green-900/50 text-green-400 border border-green-800/30"
                              : "bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30"
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="guest.delete">
                        <button
                          onClick={() => setDeleteTarget(guest)}
                          title="Sil"
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Users className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Misafir bulunamadı.</p>
          </div>
        ) : (
          guests.map((guest) => (
            <div
              key={guest.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 cursor-pointer hover:border-neutral-700 transition-colors"
              onClick={() => setDetailGuestId(guest.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-100">
                      {guest.name}
                    </p>
                    {guest.isBlacklisted && (
                      <Ban className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {guest.phone || "Telefon yok"}
                  </p>
                </div>
                <VipBadge level={guest.vipLevel} />
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span>{guest.totalVisits} ziyaret</span>
                <span>Son: {fmt(guest.lastVisitAt)}</span>
              </div>
              <div
                className="flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <PermissionGate permission="guest.update">
                  <button
                    onClick={() => openEdit(guest)}
                    className="flex-1 text-xs px-3 py-2 min-h-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Düzenle
                  </button>
                </PermissionGate>
                <PermissionGate permission="guest.delete">
                  <button
                    onClick={() => setDeleteTarget(guest)}
                    className="text-xs px-3 py-2 min-h-[44px] rounded-lg bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                  >
                    Sil
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-neutral-500">
            Toplam {total} misafir — Sayfa {page}/{totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Guest Detail Modal with History ── */}
      {detailGuestId && (
        <Modal
          title="Misafir Detayı"
          onClose={() => setDetailGuestId(null)}
        >
          {historyLoading ? (
            <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
              Yükleniyor...
            </div>
          ) : historyData ? (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto rc-scrollbar pr-1">
              {/* Guest Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
                <div className="w-14 h-14 rounded-full bg-yellow-600/20 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-neutral-100">
                      {historyData.guest.name}
                    </h3>
                    <VipBadge level={historyData.guest.vipLevel} />
                    {historyData.guest.isBlacklisted && (
                      <span className="text-[11px] text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Kara Liste
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {historyData.guest.phone || "Telefon yok"} ·{" "}
                    {historyData.guest.email || "E-posta yok"}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                  <Calendar className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-neutral-100">
                    {historyData.summary.totalVisits}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    Ziyaret
                  </p>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                  <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-neutral-100">
                    ₺
                    {historyData.summary.totalSpent.toLocaleString("tr-TR", {
                      minimumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    Toplam Harcama
                  </p>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                  <Star className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-neutral-100 truncate">
                    {historyData.summary.favoriteCabana || "—"}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    Favori Cabana
                  </p>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                  <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-neutral-100">
                    {fmt(historyData.summary.lastVisitAt)}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    Son Ziyaret
                  </p>
                </div>
              </div>

              {/* Notes */}
              {historyData.guest.notes && (
                <div className="bg-neutral-800/30 border border-neutral-800 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                    Notlar
                  </p>
                  <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                    {historyData.guest.notes}
                  </p>
                </div>
              )}

              {/* Reservation History */}
              <div>
                <p className="text-xs text-neutral-400 font-medium mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Rezervasyon Geçmişi ({(historyData.reservations ?? []).length})
                </p>
                {(historyData.reservations ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {(historyData.reservations ?? []).map((res) => {
                      const st = STATUS_LABELS[res.status] ?? {
                        label: res.status,
                        color: "text-neutral-400",
                      };
                      return (
                        <div
                          key={res.id}
                          className="bg-neutral-800/50 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                              <span className="text-sm font-medium text-neutral-200">
                                {res.cabanaName}
                              </span>
                              {res.conceptName && (
                                <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                                  {res.conceptName}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs font-medium ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-neutral-500">
                            <span>
                              {fmt(res.startDate)} → {fmt(res.endDate)}
                            </span>
                            <span>{res.days} gün</span>
                            {res.totalPrice != null && (
                              <span className="text-yellow-400 font-medium">
                                ₺
                                {res.totalPrice.toLocaleString("tr-TR", {
                                  minimumFractionDigits: 0,
                                })}
                              </span>
                            )}
                          </div>
                          {res.hasExtras && (
                            <div className="mt-1.5 text-[10px] text-neutral-500">
                              Ekstralar:{" "}
                              {(res.extras ?? [])
                                .map(
                                  (e) =>
                                    `${e.productName} ×${e.quantity}`,
                                )
                                .join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-600 bg-neutral-800/30 rounded-lg p-3 text-center">
                    Henüz rezervasyon kaydı yok
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setDetailGuestId(null)}
                  className={cancelBtnCls}
                >
                  Kapat
                </button>
              </div>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-8">
              Misafir bilgisi bulunamadı.
            </p>
          )}
        </Modal>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <Modal title="Yeni Misafir" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
            <Field label="Ad Soyad *">
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Misafir adı"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon">
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="+90 5XX XXX XX XX"
                />
              </Field>
              <Field label="E-posta">
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="ornek@email.com"
                />
              </Field>
            </div>
            <Field label="VIP Seviye">
              <select
                value={createForm.vipLevel}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, vipLevel: e.target.value }))
                }
                className={inputCls}
              >
                <option value="STANDARD">Standard</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </Field>
            <Field label="Notlar">
              <textarea
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, notes: e.target.value }))
                }
                className={`${inputCls} min-h-[60px]`}
                placeholder="Misafir hakkında notlar..."
                rows={2}
              />
            </Field>
            {createMutation.isError && (
              <ErrorMsg msg={(createMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={submitBtnCls}
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editGuest && editForm && (
        <Modal
          title="Misafir Düzenle"
          onClose={() => {
            setEditGuest(null);
            setEditForm(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editGuest || !editForm) return;
              updateMutation.mutate({ id: editGuest.id, data: editForm });
            }}
            className="space-y-4"
          >
            <Field label="Ad Soyad *">
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, name: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon">
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, phone: e.target.value } : f,
                    )
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="E-posta">
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, email: e.target.value } : f,
                    )
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="VIP Seviye">
              <select
                value={editForm.vipLevel}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, vipLevel: e.target.value } : f,
                  )
                }
                className={inputCls}
              >
                <option value="STANDARD">Standard</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </Field>
            <Field label="Notlar">
              <textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, notes: e.target.value } : f,
                  )
                }
                className={`${inputCls} min-h-[60px]`}
                rows={2}
              />
            </Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-blacklist"
                checked={editForm.isBlacklisted}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, isBlacklisted: e.target.checked } : f,
                  )
                }
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-red-500 focus:ring-red-500"
              />
              <label
                htmlFor="edit-blacklist"
                className="text-sm text-neutral-300"
              >
                Kara Listeye Ekle
              </label>
            </div>
            {updateMutation.isError && (
              <ErrorMsg msg={(updateMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditGuest(null);
                  setEditForm(null);
                }}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className={submitBtnCls}
              >
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <Modal title="Misafiri Sil" onClose={() => setDeleteTarget(null)}>
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deleteTarget.name}
            </span>{" "}
            adlı misafiri silmek istediğinizden emin misiniz?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className={cancelBtnCls}
            >
              İptal
            </button>
            <button
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
