"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VipLevel } from "@/types";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  ShieldBan,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";

// ── Types ──

interface GuestRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vipLevel: VipLevel;
  isBlacklisted: boolean;
  totalVisits: number;
  notes: string | null;
  createdAt: string;
}

interface GuestForm {
  name: string;
  phone: string;
  email: string;
  vipLevel: VipLevel;
  notes: string;
}

interface GuestsResponse {
  guests: GuestRow[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Constants ──

const VIP_BADGE: Record<VipLevel, { label: string; cls: string }> = {
  [VipLevel.STANDARD]: {
    label: "Standart",
    cls: "bg-neutral-800 text-neutral-400 border-neutral-700",
  },
  [VipLevel.SILVER]: {
    label: "Silver",
    cls: "bg-neutral-800 text-neutral-300 border-neutral-600",
  },
  [VipLevel.GOLD]: {
    label: "Gold",
    cls: "bg-amber-950/60 text-amber-400 border-amber-800/40",
  },
  [VipLevel.PLATINUM]: {
    label: "Platinum",
    cls: "bg-purple-950/50 text-purple-400 border-purple-800/40",
  },
};

const VIP_OPTIONS: { value: VipLevel; label: string }[] = [
  { value: VipLevel.STANDARD, label: "Standart" },
  { value: VipLevel.SILVER, label: "Silver" },
  { value: VipLevel.GOLD, label: "Gold" },
  { value: VipLevel.PLATINUM, label: "Platinum" },
];

const defaultForm: GuestForm = {
  name: "",
  phone: "",
  email: "",
  vipLevel: VipLevel.STANDARD,
  notes: "",
};

const PAGE_SIZE = 15;

// ── API helpers ──

async function fetchGuests(
  page: number,
  search: string,
  vipFilter: string,
  blacklistFilter: string,
): Promise<GuestsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (search) params.set("search", search);
  if (vipFilter !== "ALL") params.set("vipLevel", vipFilter);
  if (blacklistFilter === "true") params.set("isBlacklisted", "true");

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

async function toggleBlacklist(
  id: string,
  isBlacklisted: boolean,
): Promise<GuestRow> {
  const res = await fetch(`/api/guests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isBlacklisted }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "İşlem başarısız.");
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
  const [vipFilter, setVipFilter] = useState("ALL");
  const [blacklistFilter, setBlacklistFilter] = useState("false");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<GuestForm>(defaultForm);

  const [editGuest, setEditGuest] = useState<GuestRow | null>(null);
  const [editForm, setEditForm] = useState<GuestForm | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<GuestRow | null>(null);

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

  const queryKey = [
    "guests",
    page,
    debouncedSearch,
    vipFilter,
    blacklistFilter,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchGuests(page, debouncedSearch, vipFilter, blacklistFilter),
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

  const blacklistMutation = useMutation({
    mutationFn: ({
      id,
      isBlacklisted,
    }: {
      id: string;
      isBlacklisted: boolean;
    }) => toggleBlacklist(id, isBlacklisted),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      showToast(
        "success",
        vars.isBlacklisted
          ? "Misafir kara listeye eklendi."
          : "Misafir kara listeden çıkarıldı.",
      );
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
      vipLevel: guest.vipLevel,
      notes: guest.notes ?? "",
    });
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
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
        <select
          value={vipFilter}
          onChange={(e) => {
            setVipFilter(e.target.value);
            setPage(1);
          }}
          className={`${selectCls} sm:w-44`}
        >
          <option value="ALL">Tüm VIP Seviyeler</option>
          {VIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setBlacklistFilter((f) => (f === "true" ? "false" : "true"));
            setPage(1);
          }}
          className={`min-h-[44px] px-4 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
            blacklistFilter === "true"
              ? "bg-red-950/50 border-red-800/40 text-red-400"
              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <ShieldBan className="w-4 h-4 inline mr-1.5" />
          Kara Liste
        </button>
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
                <th className="px-4 py-3 font-medium">VIP Seviye</th>
                <th className="px-4 py-3 font-medium">Kara Liste</th>
                <th className="px-4 py-3 font-medium">Ziyaret</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => {
                const vip = VIP_BADGE[guest.vipLevel];
                return (
                  <tr
                    key={guest.id}
                    className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
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
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${vip.cls}`}
                      >
                        {vip.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {guest.isBlacklisted && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/40">
                          Kara Liste
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {guest.totalVisits}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(guest)}
                          title="Düzenle"
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            blacklistMutation.mutate({
                              id: guest.id,
                              isBlacklisted: !guest.isBlacklisted,
                            })
                          }
                          title={
                            guest.isBlacklisted
                              ? "Kara listeden çıkar"
                              : "Kara listeye ekle"
                          }
                          className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors ${
                            guest.isBlacklisted
                              ? "bg-green-950/50 hover:bg-green-900/50 text-green-400 border border-green-800/30"
                              : "bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30"
                          }`}
                        >
                          {guest.isBlacklisted ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldBan className="w-3.5 h-3.5" />
                          )}
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
                );
              })}
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
          guests.map((guest) => {
            const vip = VIP_BADGE[guest.vipLevel];
            return (
              <div
                key={guest.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3"
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
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${vip.cls}`}
                  >
                    {vip.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{guest.totalVisits} ziyaret</span>
                  {guest.isBlacklisted && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-800/40 font-medium">
                      Kara Liste
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(guest)}
                    className="flex-1 text-xs px-3 py-2 min-h-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() =>
                      blacklistMutation.mutate({
                        id: guest.id,
                        isBlacklisted: !guest.isBlacklisted,
                      })
                    }
                    className={`flex-1 text-xs px-3 py-2 min-h-[44px] rounded-lg transition-colors border ${
                      guest.isBlacklisted
                        ? "bg-green-950/50 hover:bg-green-900/50 text-green-400 border-green-800/30"
                        : "bg-red-950/50 hover:bg-red-900/50 text-red-400 border-red-800/30"
                    }`}
                  >
                    {guest.isBlacklisted ? "Listeden Çıkar" : "Kara Listeye"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(guest)}
                    className="text-xs px-3 py-2 min-h-[44px] rounded-lg bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
            );
          })
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
            <Field label="VIP Seviye">
              <select
                value={createForm.vipLevel}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    vipLevel: e.target.value as VipLevel,
                  }))
                }
                className={selectCls}
              >
                {VIP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notlar">
              <textarea
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, notes: e.target.value }))
                }
                className={`${inputCls} min-h-[80px] resize-y`}
                placeholder="Opsiyonel notlar..."
                rows={3}
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
            <Field label="VIP Seviye">
              <select
                value={editForm.vipLevel}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, vipLevel: e.target.value as VipLevel } : f,
                  )
                }
                className={selectCls}
              >
                {VIP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notlar">
              <textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, notes: e.target.value } : f))
                }
                className={`${inputCls} min-h-[80px] resize-y`}
                rows={3}
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
