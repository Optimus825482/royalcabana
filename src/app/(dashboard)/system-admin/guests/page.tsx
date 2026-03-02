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
} from "lucide-react";

// ── Types ──

interface ReservationInfo {
  id: string;
  cabanaName: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

interface GuestRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalVisits: number;
  createdAt: string;
  reservations?: ReservationInfo[];
}

interface GuestForm {
  name: string;
  phone: string;
  email: string;
}

interface GuestsResponse {
  guests: GuestRow[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Constants ──

const defaultForm: GuestForm = {
  name: "",
  phone: "",
  email: "",
};

const PAGE_SIZE = 15;

// ── API helpers ──

async function fetchGuests(
  page: number,
  search: string,
): Promise<GuestsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (search) params.set("search", search);

  const res = await fetch(`/api/guests?${params}`);
  if (!res.ok) throw new Error("Misafirler yüklenemedi.");
  return res.json();
}

async function createGuest(data: GuestForm): Promise<GuestRow> {
  const res = await fetch("/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Misafir oluşturulamadı.");
  }
  return res.json();
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
    throw new Error(err.message || "Misafir güncellenemedi.");
  }
  return res.json();
}

async function deleteGuest(id: string): Promise<void> {
  const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Misafir silinemedi.");
  }
}

// ── Component ──

export default function GuestsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<GuestForm>(defaultForm);

  const [editGuest, setEditGuest] = useState<GuestRow | null>(null);
  const [editForm, setEditForm] = useState<GuestForm | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<GuestRow | null>(null);
  const [detailGuest, setDetailGuest] = useState<GuestRow | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Debounce search
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

  const queryKey = ["guests", page, debouncedSearch];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchGuests(page, debouncedSearch),
  });

  const guests = data?.guests ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Mutations ──

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
    mutationFn: ({ id, data }: { id: string; data: Partial<GuestForm> }) =>
      updateGuest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
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

  function openEdit(guest: GuestRow) {
    setEditGuest(guest);
    setEditForm({
      name: guest.name,
      phone: guest.phone ?? "",
      email: guest.email ?? "",
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ── Render ──

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Misafir Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Misafir kayıtlarını görüntüleyin ve yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Yeni Misafir
        </button>
      </div>

      {/* Toast */}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya telefon ile ara..."
            className={`${inputCls} pl-10`}
          />
        </div>
      </div>

      {/* Table — Desktop */}
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
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Ziyaret</th>
                <th className="px-4 py-3 font-medium">Kayıt Tarihi</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  onClick={() => setDetailGuest(guest)}
                >
                  <td className="px-4 py-3 font-medium text-neutral-100">
                    {guest.name}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {guest.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {guest.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {guest.totalVisits}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {formatDate(guest.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEdit(guest)}
                        title="Düzenle"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(guest)}
                        title="Sil"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card Layout */}
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
              onClick={() => setDetailGuest(guest)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-100">
                    {guest.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {guest.phone || "Telefon yok"} ·{" "}
                    {guest.email || "E-posta yok"}
                  </p>
                </div>
                <span className="text-xs text-neutral-500 shrink-0">
                  {guest.totalVisits} ziyaret
                </span>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openEdit(guest)}
                  className="flex-1 text-xs px-3 py-2 min-h-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => setDeleteTarget(guest)}
                  className="text-xs px-3 py-2 min-h-[44px] rounded-lg bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-neutral-500">
            Toplam {total} misafir · Sayfa {page}/{totalPages}
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

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Misafir" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
            <Field label="Ad Soyad">
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

      {/* Edit Modal */}
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
            <Field label="Ad Soyad">
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
            <Field label="Telefon">
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, phone: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
            <Field label="E-posta">
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, email: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
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

      {/* Guest Detail Modal */}
      {detailGuest && (
        <Modal title="Misafir Detayı" onClose={() => setDetailGuest(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
              <div className="w-12 h-12 rounded-full bg-yellow-600/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-100">
                  {detailGuest.name}
                </h3>
                <p className="text-xs text-neutral-500">
                  Kayıt: {formatDate(detailGuest.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-800/50 rounded-lg p-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                  Telefon
                </p>
                <p className="text-sm text-neutral-200">
                  {detailGuest.phone || "—"}
                </p>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                  E-posta
                </p>
                <p className="text-sm text-neutral-200 truncate">
                  {detailGuest.email || "—"}
                </p>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                  Toplam Ziyaret
                </p>
                <p className="text-sm text-neutral-200">
                  {detailGuest.totalVisits}
                </p>
              </div>
            </div>

            {/* Reservation History */}
            <div>
              <p className="text-xs text-neutral-400 font-medium mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Rezervasyon Geçmişi
              </p>
              {detailGuest.reservations &&
              detailGuest.reservations.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detailGuest.reservations.map((res) => (
                    <div
                      key={res.id}
                      className="bg-neutral-800/50 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-sm text-neutral-200">
                          {res.cabanaName}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatDate(res.checkIn)} - {formatDate(res.checkOut)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-600 bg-neutral-800/30 rounded-lg p-3 text-center">
                  Henüz rezervasyon kaydı yok
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailGuest(null)}
                className={cancelBtnCls}
              >
                Kapat
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="Misafiri Sil" onClose={() => setDeleteTarget(null)}>
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deleteTarget.name}
            </span>{" "}
            adlı misafiri silmek istediğinizden emin misiniz? Bu işlem geri
            alınamaz.
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
