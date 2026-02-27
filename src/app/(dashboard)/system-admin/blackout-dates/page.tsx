"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  CalendarOff,
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

interface BlackoutDateRow {
  id: string;
  cabanaId: string | null;
  cabana?: { id: string; name: string } | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
}

interface BlackoutForm {
  cabanaId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const PAGE_SIZE = 20;

const defaultForm: BlackoutForm = {
  cabanaId: "",
  startDate: "",
  endDate: "",
  reason: "",
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

async function fetchBlackoutDates(
  cabanaFilter: string,
): Promise<BlackoutDateRow[]> {
  const params = new URLSearchParams();
  if (cabanaFilter !== "ALL") params.set("cabanaId", cabanaFilter);
  const url = `/api/blackout-dates${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Kapalı tarihler yüklenemedi.");
  const data = await res.json();
  return data.items ?? data.blackoutDates ?? data;
}

async function createBlackoutDate(
  data: BlackoutForm,
): Promise<BlackoutDateRow> {
  const res = await fetch("/api/blackout-dates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cabanaId: data.cabanaId || null,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Kapalı tarih oluşturulamadı.");
  }
  return res.json();
}

async function deleteBlackoutDate(id: string): Promise<void> {
  const res = await fetch(`/api/blackout-dates/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Kapalı tarih silinemedi.");
  }
}

// ── Component ──

export default function BlackoutDatesPage() {
  const queryClient = useQueryClient();

  const [cabanaFilter, setCabanaFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<BlackoutForm>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<BlackoutDateRow | null>(
    null,
  );
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
    queryKey: ["blackout-dates", cabanaFilter],
    queryFn: () => fetchBlackoutDates(cabanaFilter),
  });

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const rows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: createBlackoutDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blackout-dates"] });
      setShowCreate(false);
      setCreateForm(defaultForm);
      showToast("success", "Kapalı tarih başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlackoutDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blackout-dates"] });
      setDeleteTarget(null);
      showToast("success", "Kapalı tarih başarıyla silindi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function getCabanaName(row: BlackoutDateRow): string {
    if (!row.cabanaId) return "Tüm Kabanalar";
    return (
      row.cabana?.name ??
      cabanas.find((c) => c.id === row.cabanaId)?.name ??
      "—"
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Kapalı Tarihler
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kabana bazlı veya genel kapalı tarihleri yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Kapalı Tarih
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

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={cabanaFilter}
          onChange={(e) => {
            setCabanaFilter(e.target.value);
            setPage(1);
          }}
          className={`${selectCls} sm:w-56`}
        >
          <option value="ALL">Tüm Kabanalar</option>
          {cabanas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <CalendarOff className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Kapalı tarih bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                <th className="px-4 py-3 font-medium">Kabana</th>
                <th className="px-4 py-3 font-medium">Başlangıç</th>
                <th className="px-4 py-3 font-medium">Bitiş</th>
                <th className="px-4 py-3 font-medium">Sebep</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-neutral-100">
                    {getCabanaName(row)}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {formatDate(row.startDate)}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {formatDate(row.endDate)}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {row.reason || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(row)}
                      title="Sil"
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
                className="h-28 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <CalendarOff className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Kapalı tarih bulunamadı.</p>
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
                    {getCabanaName(row)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatDate(row.startDate)} — {formatDate(row.endDate)}
                  </p>
                </div>
              </div>
              {row.reason && (
                <p className="text-xs text-neutral-500">{row.reason}</p>
              )}
              <button
                onClick={() => setDeleteTarget(row)}
                className="w-full text-xs px-3 py-2 min-h-[44px] rounded-lg bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
              >
                Sil
              </button>
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
        <Modal title="Yeni Kapalı Tarih" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
            <Field label="Kabana (boş bırakılırsa tüm kabanalar)">
              <select
                value={createForm.cabanaId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, cabanaId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Tüm Kabanalar</option>
                {cabanas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
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
            <Field label="Sebep">
              <input
                type="text"
                value={createForm.reason}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, reason: e.target.value }))
                }
                className={inputCls}
                placeholder="Opsiyonel sebep..."
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
        <Modal title="Kapalı Tarihi Sil" onClose={() => setDeleteTarget(null)}>
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {getCabanaName(deleteTarget)}
            </span>{" "}
            için {formatDate(deleteTarget.startDate)} —{" "}
            {formatDate(deleteTarget.endDate)} kapalı tarihini silmek
            istediğinizden emin misiniz?
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
