"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
  editBtnCls,
  primaryBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";
import {
  fetchSystemCurrency,
  formatPrice,
  currencySymbol,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface ExtraService {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
  prices: { id: string; price: string; effectiveFrom: string }[];
}

const CATEGORIES = [
  { value: "MASSAGE", label: "Masaj" },
  { value: "TOWEL", label: "Havlu" },
  { value: "SUNBED", label: "Şezlong" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "PHOTOGRAPHY", label: "Fotoğraf" },
  { value: "DECORATION", label: "Dekorasyon" },
  { value: "OTHER", label: "Diğer" },
] as const;

const categoryMap = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

function getCategoryLabel(cat: string | null): string {
  if (!cat) return "Diğer";
  return categoryMap[cat] ?? cat;
}

function getCurrentPrice(svc: ExtraService): string | null {
  if (!svc.prices?.length) return null;
  return svc.prices[0]?.price ?? null;
}

function getEffectiveDate(svc: ExtraService): string | null {
  if (!svc.prices?.length) return null;
  return svc.prices[0]?.effectiveFrom ?? null;
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

type ToastType = "success" | "error";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastSeq = 0;

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`px-4 py-3 rounded-lg text-sm border shadow-lg transition-all duration-300 ${
            t.type === "success"
              ? "bg-green-950/80 border-green-700/40 text-green-400"
              : "bg-red-950/80 border-red-700/40 text-red-400"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-neutral-500 hover:text-neutral-300 shrink-0"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonRow() {
  return (
    <tr className="border-b border-neutral-800/60 animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 w-6 bg-neutral-800 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-32 bg-neutral-800 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 bg-neutral-800 rounded-full" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-20 bg-neutral-800 rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-16 bg-neutral-800 rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-8 w-24 bg-neutral-800 rounded ml-auto" />
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-neutral-800 rounded" />
        <div className="h-5 w-16 bg-neutral-800 rounded-full" />
      </div>
      <div className="h-6 w-24 bg-neutral-800 rounded" />
      <div className="h-4 w-28 bg-neutral-800 rounded" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Bar                                                          */
/* ------------------------------------------------------------------ */

function StatsBar({
  services,
  currency,
}: {
  services: ExtraService[];
  currency: CurrencyCode;
}) {
  const stats = useMemo(() => {
    const total = services.length;
    const prices = services
      .map((s) => getCurrentPrice(s))
      .filter(Boolean)
      .map((p) => parseFloat(p!));
    const avg =
      prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    const catCounts: Record<string, number> = {};
    for (const svc of services) {
      const cat = svc.category || "OTHER";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }

    return { total, avg, catCounts };
  }, [services]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
        <p className="text-xs text-neutral-500">Toplam Hizmet</p>
        <p className="text-lg font-semibold text-neutral-100">{stats.total}</p>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
        <p className="text-xs text-neutral-500">Ortalama Fiyat</p>
        <p className="text-lg font-semibold text-amber-400">
          {formatPrice(stats.avg, currency)}
        </p>
      </div>
      {Object.entries(stats.catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([cat, count]) => (
          <div
            key={cat}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3"
          >
            <p className="text-xs text-neutral-500">{getCategoryLabel(cat)}</p>
            <p className="text-lg font-semibold text-neutral-100">
              {count}{" "}
              <span className="text-xs text-neutral-500 font-normal">
                hizmet
              </span>
            </p>
          </div>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function ServicePricingPage() {
  const qc = useQueryClient();

  // --- State ---
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- Toast helpers ---
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // --- Queries ---
  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const {
    data: services = [],
    isLoading,
    isError,
  } = useQuery<ExtraService[]>({
    queryKey: ["extra-services-pricing"],
    queryFn: async () => {
      const res = await fetch("/api/extra-services?activeOnly=true");
      if (!res.ok) throw new Error("Hizmetler yüklenemedi");
      const d = await res.json();
      const resolved = d.data ?? d;
      return Array.isArray(resolved) ? resolved : [];
    },
  });

  // --- Filtered list ---
  const filtered = useMemo(() => {
    let list = services;
    if (categoryFilter !== "ALL") {
      list = list.filter((s) => (s.category || "OTHER") === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [services, categoryFilter, search]);

  // --- Selection helpers ---
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filtered.length && filtered.length > 0) {
        return new Set();
      }
      return new Set(filtered.map((s) => s.id));
    });
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBatchMode(false);
  }, []);

  // --- Single price update ---
  const openSingleEdit = useCallback((svc: ExtraService) => {
    setBatchMode(false);
    setEditId(svc.id);
    setNewPrice(getCurrentPrice(svc) || "");
    setFormError("");
  }, []);

  // --- Batch price update ---
  const openBatchEdit = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBatchMode(true);
    setEditId("__batch__");
    setNewPrice("");
    setFormError("");
  }, [selectedIds]);

  // --- Submit handler ---
  async function handleSubmitPrice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const priceVal = parseFloat(newPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      setFormError("Geçerli bir fiyat giriniz");
      return;
    }

    setSaving(true);
    setFormError("");

    const ids = batchMode ? Array.from(selectedIds) : editId ? [editId] : [];

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const res = await fetch(`/api/extra-services/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: priceVal }),
          });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || "Güncellenemedi");
          }
          const json = await res.json();
          return json.data ?? json;
        }),
      );

      const failed = results.filter((r) => r.status === "rejected");
      const succeeded = results.filter((r) => r.status === "fulfilled");

      if (succeeded.length > 0) {
        addToast(
          "success",
          batchMode
            ? `${succeeded.length} hizmet fiyatı güncellendi`
            : "Fiyat güncellendi",
        );
        qc.invalidateQueries({ queryKey: ["extra-services-pricing"] });
      }

      if (failed.length > 0) {
        addToast("error", `${failed.length} hizmet güncellenemedi`);
      }

      setEditId(null);
      setNewPrice("");
      if (batchMode) clearSelection();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  // --- Helpers for render ---
  const allSelected =
    filtered.length > 0 && selectedIds.size === filtered.length;

  const editingService = !batchMode
    ? services.find((s) => s.id === editId)
    : null;

  // --- Render ---
  return (
    <div className="text-neutral-100 p-4 sm:p-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-yellow-400">
          Hizmet Fiyatlandırma
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Ekstra hizmetlerin fiyatlarını görüntüleyin ve güncelleyin
        </p>
      </div>

      {/* Stats */}
      {!isLoading && services.length > 0 && (
        <StatsBar services={services} currency={currency} />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Hizmet ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} !pl-10`}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`${selectCls} sm:w-48`}
          aria-label="Kategori filtresi"
        >
          <option value="ALL">Tüm Kategoriler</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Batch mode toggle */}
        {selectedIds.size > 0 && (
          <PermissionGate permission="pricing.update">
            <button onClick={openBatchEdit} className={primaryBtnCls}>
              Seçilenleri Güncelle ({selectedIds.size})
            </button>
          </PermissionGate>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">
            Hizmetler yüklenirken hata oluştu.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <>
          <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-neutral-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <p className="text-neutral-400 text-sm">
            {search || categoryFilter !== "ALL"
              ? "Filtrelere uygun hizmet bulunamadı."
              : "Henüz aktif hizmet tanımlanmamış."}
          </p>
        </div>
      )}

      {/* Data table */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                  <th className="px-4 py-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="accent-amber-500 w-4 h-4"
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Hizmet Adı</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Güncel Fiyat
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Geçerlilik
                  </th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((svc) => {
                  const price = getCurrentPrice(svc);
                  const effDate = getEffectiveDate(svc);
                  return (
                    <tr
                      key={svc.id}
                      className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(svc.id)}
                          onChange={() => toggleSelect(svc.id)}
                          className="accent-amber-500 w-4 h-4"
                          aria-label={`${svc.name} seç`}
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-100 font-medium">
                        {svc.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                          {getCategoryLabel(svc.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 font-semibold tabular-nums">
                        {price ? (
                          formatPrice(parseFloat(price), currency)
                        ) : (
                          <span className="text-neutral-600 italic text-xs">
                            Fiyat yok
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-500 tabular-nums text-xs">
                        {effDate ? formatDateShort(effDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PermissionGate permission="pricing.update">
                          <button
                            onClick={() => openSingleEdit(svc)}
                            className={editBtnCls}
                          >
                            Fiyat Güncelle
                          </button>
                        </PermissionGate>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-neutral-800/60">
            {filtered.map((svc) => {
              const price = getCurrentPrice(svc);
              const effDate = getEffectiveDate(svc);
              return (
                <div
                  key={svc.id}
                  className="px-4 py-3.5 hover:bg-neutral-800/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(svc.id)}
                        onChange={() => toggleSelect(svc.id)}
                        className="accent-amber-500 w-4 h-4 shrink-0"
                        aria-label={`${svc.name} seç`}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-neutral-100 block truncate">
                          {svc.name}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {getCategoryLabel(svc.category)}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-amber-400 tabular-nums shrink-0">
                      {price ? formatPrice(parseFloat(price), currency) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {effDate ? formatDateShort(effDate) : ""}
                    </span>
                    <PermissionGate permission="pricing.update">
                      <button
                        onClick={() => openSingleEdit(svc)}
                        className={editBtnCls}
                      >
                        Güncelle
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Edit Modal */}
      {editId && (
        <Modal
          title={
            batchMode
              ? `Toplu Fiyat Güncelle (${selectedIds.size} hizmet)`
              : `Fiyat Güncelle — ${editingService?.name ?? ""}`
          }
          onClose={() => {
            setEditId(null);
            setNewPrice("");
            setFormError("");
          }}
        >
          <form onSubmit={handleSubmitPrice} className="space-y-4">
            {!batchMode && editingService && (
              <div className="text-xs text-neutral-500">
                Mevcut fiyat:{" "}
                <span className="text-amber-400 font-medium">
                  {getCurrentPrice(editingService)
                    ? formatPrice(
                        parseFloat(getCurrentPrice(editingService)!),
                        currency,
                      )
                    : "Fiyat yok"}
                </span>
              </div>
            )}

            <Field
              label={
                batchMode ? "Yeni Fiyat (tüm seçilenler için)" : "Yeni Fiyat"
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className={inputCls}
                  placeholder="0.00"
                  autoFocus
                />
                <span className="text-sm text-neutral-500 shrink-0">
                  {currencySymbol(currency)}
                </span>
              </div>
            </Field>

            {formError && <ErrorMsg msg={formError} />}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setNewPrice("");
                  setFormError("");
                }}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button type="submit" disabled={saving} className={submitBtnCls}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
