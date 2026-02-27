"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Repeat,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";

// ── Types ──

interface CabanaOption {
  id: string;
  name: string;
}

interface RecurringRow {
  id: string;
  cabanaId: string;
  cabana?: { name: string };
  guestName: string;
  pattern: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

interface RecurringForm {
  cabanaId: string;
  guestName: string;
  pattern: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek: string;
  dayOfMonth: string;
  startDate: string;
  endDate: string;
}

const PATTERN_OPTIONS = [
  { value: "WEEKLY", label: "Haftalık" },
  { value: "BIWEEKLY", label: "İki Haftalık" },
  { value: "MONTHLY", label: "Aylık" },
];

const PATTERN_LABEL: Record<string, string> = {
  WEEKLY: "Haftalık",
  BIWEEKLY: "İki Haftalık",
  MONTHLY: "Aylık",
};

const DAY_NAMES = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

const PAGE_SIZE = 20;

const defaultForm: RecurringForm = {
  cabanaId: "",
  guestName: "",
  pattern: "WEEKLY",
  dayOfWeek: "1",
  dayOfMonth: "1",
  startDate: "",
  endDate: "",
};

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));

// ── API helpers ──

async function fetchCabanas(): Promise<CabanaOption[]> {
  const res = await fetch("/api/cabanas");
  if (!res.ok) throw new Error("Kabana listesi yüklenemedi.");
  const data = await res.json();
  return data.cabanas ?? data;
}

async function fetchRecurring(): Promise<RecurringRow[]> {
  const res = await fetch("/api/recurring-bookings");
  if (!res.ok) throw new Error("Tekrarlayan rezervasyonlar yüklenemedi.");
  const data = await res.json();
  return data.items ?? data.recurringBookings ?? data;
}

async function createRecurring(data: RecurringForm): Promise<RecurringRow> {
  const body: Record<string, unknown> = {
    cabanaId: data.cabanaId,
    guestName: data.guestName,
    pattern: data.pattern,
    startDate: data.startDate,
    endDate: data.endDate,
  };
  if (data.pattern === "WEEKLY" || data.pattern === "BIWEEKLY") {
    body.dayOfWeek = parseInt(data.dayOfWeek, 10);
  }
  if (data.pattern === "MONTHLY") {
    body.dayOfMonth = parseInt(data.dayOfMonth, 10);
  }
  const res = await fetch("/api/recurring-bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Tekrarlayan rezervasyon oluşturulamadı.");
  }
  return res.json();
}

async function toggleRecurringActive(
  id: string,
  isActive: boolean,
): Promise<RecurringRow> {
  const res = await fetch(`/api/recurring-bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Durum güncellenemedi.");
  }
  return res.json();
}

async function deleteRecurring(id: string): Promise<void> {
  const res = await fetch(`/api/recurring-bookings/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Tekrarlayan rezervasyon silinemedi.");
  }
}

// ── Component ──

export default function RecurringBookingsPage() {
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<RecurringForm>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<RecurringRow | null>(null);
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const { data: cabanas = [] } = useQuery({
    queryKey: ["cabanas"],
    queryFn: fetchCabanas,
  });

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ["recurring-bookings"],
    queryFn: fetchRecurring,
  });

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const rows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const createMutation = useMutation({
    mutationFn: createRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bookings"] });
      setShowCreate(false);
      setCreateForm(defaultForm);
      showToast("success", "Tekrarlayan rezervasyon başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleRecurringActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bookings"] });
      showToast("success", "Durum güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bookings"] });
      setDeleteTarget(null);
      showToast("success", "Tekrarlayan rezervasyon silindi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function getPatternDetail(row: RecurringRow): string {
    const label = PATTERN_LABEL[row.pattern] ?? row.pattern;
    if (
      (row.pattern === "WEEKLY" || row.pattern === "BIWEEKLY") &&
      row.dayOfWeek != null
    ) {
      return `${label} — ${DAY_NAMES[row.dayOfWeek] ?? row.dayOfWeek}`;
    }
    if (row.pattern === "MONTHLY" && row.dayOfMonth != null) {
      return `${label} — Ayın ${row.dayOfMonth}. günü`;
    }
    return label;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Tekrarlayan Rezervasyonlar
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Haftalık, iki haftalık veya aylık otomatik rezervasyonları yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Tekrarlayan
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

      {/* Desktop Table */}
      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Repeat className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Tekrarlayan rezervasyon bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                <th className="px-4 py-3 font-medium">Kabana</th>
                <th className="px-4 py-3 font-medium">Misafir</th>
                <th className="px-4 py-3 font-medium">Tekrar</th>
                <th className="px-4 py-3 font-medium">Tarih Aralığı</th>
                <th className="px-4 py-3 font-medium text-center">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-neutral-100">
                    {row.cabana?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-200">
                    {row.guestName}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {getPatternDetail(row)}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {formatDate(row.startDate)} — {formatDate(row.endDate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-950/60 text-green-400 border border-green-800/40">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: row.id,
                            isActive: !row.isActive,
                          })
                        }
                        title={row.isActive ? "Pasife al" : "Aktife al"}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        {row.isActive ? (
                          <ToggleRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(row)}
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

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Repeat className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Tekrarlayan rezervasyon bulunamadı.</p>
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-100">
                    {row.cabana?.name ?? "—"}
                  </p>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    {row.guestName}
                  </p>
                </div>
                {row.isActive ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-950/60 text-green-400 border border-green-800/40 shrink-0">
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0">
                    Pasif
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-400 space-y-0.5">
                <p>{getPatternDetail(row)}</p>
                <p>
                  {formatDate(row.startDate)} — {formatDate(row.endDate)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      id: row.id,
                      isActive: !row.isActive,
                    })
                  }
                  className={`flex-1 text-xs px-3 py-2 min-h-[44px] rounded-lg transition-colors border ${
                    row.isActive
                      ? "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                      : "bg-green-950/50 border-green-800/30 text-green-400 hover:bg-green-900/50"
                  }`}
                >
                  {row.isActive ? "Pasife Al" : "Aktife Al"}
                </button>
                <button
                  onClick={() => setDeleteTarget(row)}
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
            Toplam {allRows.length} kayıt · Sayfa {page}/{totalPages}
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
        <Modal
          title="Yeni Tekrarlayan Rezervasyon"
          onClose={() => setShowCreate(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
            <Field label="Kabana">
              <select
                required
                value={createForm.cabanaId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, cabanaId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Kabana seçin</option>
                {cabanas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Misafir Adı">
              <input
                type="text"
                required
                value={createForm.guestName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, guestName: e.target.value }))
                }
                className={inputCls}
                placeholder="Misafir adı"
              />
            </Field>
            <Field label="Tekrar Şekli">
              <select
                value={createForm.pattern}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    pattern: e.target.value as RecurringForm["pattern"],
                  }))
                }
                className={selectCls}
              >
                {PATTERN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            {(createForm.pattern === "WEEKLY" ||
              createForm.pattern === "BIWEEKLY") && (
              <Field label="Gün">
                <select
                  value={createForm.dayOfWeek}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, dayOfWeek: e.target.value }))
                  }
                  className={selectCls}
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={String(i)}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {createForm.pattern === "MONTHLY" && (
              <Field label="Ayın Günü">
                <select
                  value={createForm.dayOfMonth}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, dayOfMonth: e.target.value }))
                  }
                  className={selectCls}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Başlangıç Tarihi">
              <input
                type="date"
                required
                value={createForm.startDate}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Bitiş Tarihi">
              <input
                type="date"
                required
                value={createForm.endDate}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className={inputCls}
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

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal
          title="Tekrarlayan Rezervasyonu Sil"
          onClose={() => setDeleteTarget(null)}
        >
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deleteTarget.cabana?.name}
            </span>{" "}
            için{" "}
            <span className="text-yellow-400 font-medium">
              {deleteTarget.guestName}
            </span>{" "}
            adlı tekrarlayan rezervasyonu silmek istediğinizden emin misiniz?
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
