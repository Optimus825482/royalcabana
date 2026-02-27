"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";
import { Plus, Pencil, Trash2, CalendarRange, Tag } from "lucide-react";

// ── Types ──

interface CabanaOption {
  id: string;
  name: string;
}

interface PriceRangeRow {
  id: string;
  cabanaId: string;
  cabana: { id: string; name: string };
  startDate: string;
  endDate: string;
  dailyPrice: number;
  label: string | null;
  priority: number;
  createdAt: string;
}

interface PriceRangeForm {
  cabanaId: string;
  startDate: string;
  endDate: string;
  dailyPrice: string;
  label: string;
  priority: string;
}

// ── Constants ──

const defaultForm: PriceRangeForm = {
  cabanaId: "",
  startDate: "",
  endDate: "",
  dailyPrice: "",
  label: "",
  priority: "0",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);

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

async function fetchPriceRanges(
  cabanaFilter: string,
): Promise<PriceRangeRow[]> {
  const params = new URLSearchParams();
  if (cabanaFilter !== "ALL") params.set("cabanaId", cabanaFilter);
  const url = `/api/pricing/cabana-price-ranges${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fiyat aralıkları yüklenemedi.");
  const data = await res.json();
  return data.priceRanges ?? data;
}

async function createPriceRange(data: PriceRangeForm): Promise<PriceRangeRow> {
  const res = await fetch("/api/pricing/cabana-price-ranges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cabanaId: data.cabanaId,
      startDate: data.startDate,
      endDate: data.endDate,
      dailyPrice: parseFloat(data.dailyPrice),
      label: data.label || null,
      priority: parseInt(data.priority, 10),
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Fiyat aralığı oluşturulamadı.");
  }
  return res.json();
}

async function updatePriceRange(
  id: string,
  data: PriceRangeForm,
): Promise<PriceRangeRow> {
  const res = await fetch(`/api/pricing/cabana-price-ranges/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cabanaId: data.cabanaId,
      startDate: data.startDate,
      endDate: data.endDate,
      dailyPrice: parseFloat(data.dailyPrice),
      label: data.label || null,
      priority: parseInt(data.priority, 10),
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Fiyat aralığı güncellenemedi.");
  }
  return res.json();
}

async function deletePriceRange(id: string): Promise<void> {
  const res = await fetch(`/api/pricing/cabana-price-ranges/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Fiyat aralığı silinemedi.");
  }
}

// ── Component ──

export default function SeasonsPage() {
  const queryClient = useQueryClient();

  const [cabanaFilter, setCabanaFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PriceRangeForm>(defaultForm);

  const [editRow, setEditRow] = useState<PriceRangeRow | null>(null);
  const [editForm, setEditForm] = useState<PriceRangeForm | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PriceRangeRow | null>(null);

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

  const { data: priceRanges = [], isLoading } = useQuery({
    queryKey: ["cabana-price-ranges", cabanaFilter],
    queryFn: () => fetchPriceRanges(cabanaFilter),
  });

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: createPriceRange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabana-price-ranges"] });
      setShowCreate(false);
      setCreateForm(defaultForm);
      showToast("success", "Fiyat aralığı başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PriceRangeForm }) =>
      updatePriceRange(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabana-price-ranges"] });
      setEditRow(null);
      setEditForm(null);
      showToast("success", "Fiyat aralığı başarıyla güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePriceRange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabana-price-ranges"] });
      setDeleteTarget(null);
      showToast("success", "Fiyat aralığı başarıyla silindi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function openEdit(row: PriceRangeRow) {
    setEditRow(row);
    setEditForm({
      cabanaId: row.cabanaId,
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
      dailyPrice: String(row.dailyPrice),
      label: row.label ?? "",
      priority: String(row.priority),
    });
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Sezonluk Fiyatlandırma
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kabana bazlı tarih aralığı fiyatlarını yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Fiyat Aralığı
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
      <div className="flex gap-3 mb-4">
        <select
          value={cabanaFilter}
          onChange={(e) => setCabanaFilter(e.target.value)}
          className={`${selectCls} sm:w-56`}
        >
          <option value="ALL">Tüm Kabana</option>
          {cabanas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table — Desktop */}
      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : priceRanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <CalendarRange className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Fiyat aralığı bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                <th className="px-4 py-3 font-medium">Kabana</th>
                <th className="px-4 py-3 font-medium">Başlangıç</th>
                <th className="px-4 py-3 font-medium">Bitiş</th>
                <th className="px-4 py-3 font-medium">Günlük Fiyat</th>
                <th className="px-4 py-3 font-medium">Etiket</th>
                <th className="px-4 py-3 font-medium">Öncelik</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {priceRanges.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-neutral-100">
                    {row.cabana?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {formatDate(row.startDate)}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {formatDate(row.endDate)}
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-medium">
                    {formatCurrency(row.dailyPrice)}
                  </td>
                  <td className="px-4 py-3">
                    {row.label ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/50 text-amber-400 border border-amber-800/40">
                        <Tag className="w-3 h-3" />
                        {row.label}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{row.priority}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(row)}
                        title="Düzenle"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
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

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : priceRanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <CalendarRange className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Fiyat aralığı bulunamadı.</p>
          </div>
        ) : (
          priceRanges.map((row) => (
            <div
              key={row.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-100">
                    {row.cabana?.name ?? "—"}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatDate(row.startDate)} – {formatDate(row.endDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-amber-400 shrink-0">
                  {formatCurrency(row.dailyPrice)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                {row.label && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/40 font-medium">
                    <Tag className="w-3 h-3" />
                    {row.label}
                  </span>
                )}
                <span>Öncelik: {row.priority}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(row)}
                  className="flex-1 text-xs px-3 py-2 min-h-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => setDeleteTarget(row)}
                  className="flex-1 text-xs px-3 py-2 min-h-[44px] rounded-lg bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Fiyat Aralığı" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
            <PriceRangeFormFields
              form={createForm}
              setForm={setCreateForm}
              cabanas={cabanas}
            />
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
      {editRow && editForm && (
        <Modal
          title="Fiyat Aralığı Düzenle"
          onClose={() => {
            setEditRow(null);
            setEditForm(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editRow || !editForm) return;
              updateMutation.mutate({ id: editRow.id, data: editForm });
            }}
            className="space-y-4"
          >
            <PriceRangeFormFields
              form={editForm}
              setForm={(updater) =>
                setEditForm((f) =>
                  f
                    ? typeof updater === "function"
                      ? updater(f)
                      : updater
                    : f,
                )
              }
              cabanas={cabanas}
            />
            {updateMutation.isError && (
              <ErrorMsg msg={(updateMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditRow(null);
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
        <Modal
          title="Fiyat Aralığını Sil"
          onClose={() => setDeleteTarget(null)}
        >
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deleteTarget.cabana?.name}
            </span>{" "}
            kabınasının{" "}
            <span className="text-neutral-100">
              {formatDate(deleteTarget.startDate)} –{" "}
              {formatDate(deleteTarget.endDate)}
            </span>{" "}
            tarih aralığındaki fiyatı silmek istediğinizden emin misiniz?
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

// ── Shared Form Fields ──

function PriceRangeFormFields({
  form,
  setForm,
  cabanas,
}: {
  form: PriceRangeForm;
  setForm: React.Dispatch<React.SetStateAction<PriceRangeForm>>;
  cabanas: CabanaOption[];
}) {
  return (
    <>
      <Field label="Kabana">
        <select
          required
          value={form.cabanaId}
          onChange={(e) => setForm((f) => ({ ...f, cabanaId: e.target.value }))}
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Başlangıç Tarihi">
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Bitiş Tarihi">
          <input
            type="date"
            required
            value={form.endDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, endDate: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Günlük Fiyat (₺)">
        <input
          type="number"
          required
          min="0"
          step="0.01"
          value={form.dailyPrice}
          onChange={(e) =>
            setForm((f) => ({ ...f, dailyPrice: e.target.value }))
          }
          className={inputCls}
          placeholder="0.00"
        />
      </Field>
      <Field label="Etiket">
        <input
          type="text"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          className={inputCls}
          placeholder="Yaz Sezonu, Bayram vb."
        />
      </Field>
      <Field label="Öncelik">
        <input
          type="number"
          value={form.priority}
          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          className={inputCls}
          placeholder="0"
        />
      </Field>
    </>
  );
}
