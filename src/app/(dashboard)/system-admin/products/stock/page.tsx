"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ErrorMsg } from "@/components/shared/FormComponents";

// ── Types ──

interface ProductGroup {
  id: string;
  name: string;
}

interface ProductRow {
  id: string;
  name: string;
  groupId: string | null;
  group?: { id: string; name: string } | null;
  stockQuantity: number;
  minStockAlert: number;
  salePrice: string | number;
  isActive: boolean;
}

interface StockUpdate {
  productId: string;
  stockQuantity: number;
  minStockAlert: number;
}

const PAGE_SIZE = 25;

// ── API helpers ──

async function fetchProducts(): Promise<ProductRow[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Ürün listesi yüklenemedi.");
  const data = await res.json();
  return data.products ?? data;
}

async function updateStock(update: StockUpdate): Promise<void> {
  const res = await fetch("/api/products/stock", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Stok güncellenemedi.");
  }
}

// ── Component ──

export default function StockPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editingRows, setEditingRows] = useState<
    Record<string, { stockQuantity: number; minStockAlert: number }>
  >({});

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const stockMutation = useMutation({
    mutationFn: updateStock,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingRows((prev) => {
        const next = { ...prev };
        delete next[vars.productId];
        return next;
      });
      showToast("success", "Stok başarıyla güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  // Group products
  const grouped = allProducts.reduce<Record<string, ProductRow[]>>((acc, p) => {
    const groupName = p.group?.name ?? "Grupsuz";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(p);
    return acc;
  }, {});

  const groupNames = Object.keys(grouped).sort((a, b) => {
    if (a === "Grupsuz") return 1;
    if (b === "Grupsuz") return -1;
    return a.localeCompare(b, "tr");
  });

  // Flat list for pagination
  const flatProducts = groupNames.flatMap((g) => grouped[g]);
  const totalPages = Math.max(1, Math.ceil(flatProducts.length / PAGE_SIZE));
  const pageProducts = flatProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // Rebuild grouped from page products
  const pageGrouped = pageProducts.reduce<Record<string, ProductRow[]>>(
    (acc, p) => {
      const groupName = p.group?.name ?? "Grupsuz";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(p);
      return acc;
    },
    {},
  );

  function startEdit(p: ProductRow) {
    setEditingRows((prev) => ({
      ...prev,
      [p.id]: {
        stockQuantity: p.stockQuantity,
        minStockAlert: p.minStockAlert,
      },
    }));
  }

  function updateEditField(
    id: string,
    field: "stockQuantity" | "minStockAlert",
    value: number,
  ) {
    setEditingRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function saveRow(id: string) {
    const edit = editingRows[id];
    if (!edit) return;
    stockMutation.mutate({
      productId: id,
      stockQuantity: edit.stockQuantity,
      minStockAlert: edit.minStockAlert,
    });
  }

  function isLowStock(p: ProductRow): boolean {
    const edit = editingRows[p.id];
    const qty = edit ? edit.stockQuantity : p.stockQuantity;
    const alert = edit ? edit.minStockAlert : p.minStockAlert;
    return qty <= alert && alert > 0;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-yellow-400">Stok Takibi</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Ürün stok miktarlarını ve minimum stok uyarı seviyelerini yönetin
        </p>
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
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : flatProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Package className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Ürün bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                <th className="px-4 py-3 font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">Grup</th>
                <th className="px-4 py-3 font-medium text-center">
                  Stok Miktarı
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  Min. Uyarı
                </th>
                <th className="px-4 py-3 font-medium text-center">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(pageGrouped)
                .sort((a, b) => {
                  if (a === "Grupsuz") return 1;
                  if (b === "Grupsuz") return -1;
                  return a.localeCompare(b, "tr");
                })
                .map((groupName) => (
                  <>
                    {/* Group header */}
                    <tr
                      key={`group-${groupName}`}
                      className="bg-neutral-800/30"
                    >
                      <td
                        colSpan={6}
                        className="px-4 py-2 text-xs font-semibold text-amber-400 uppercase tracking-wider"
                      >
                        {groupName}
                      </td>
                    </tr>
                    {pageGrouped[groupName].map((p) => {
                      const editing = editingRows[p.id];
                      const lowStock = isLowStock(p);

                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-neutral-800/60 transition-colors ${lowStock ? "bg-red-950/20" : "hover:bg-neutral-800/30"}`}
                        >
                          <td className="px-4 py-3 font-medium text-neutral-100">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-neutral-400">
                            {p.group?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editing ? (
                              <input
                                type="number"
                                min={0}
                                value={editing.stockQuantity}
                                onChange={(e) =>
                                  updateEditField(
                                    p.id,
                                    "stockQuantity",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-20 bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded px-2 py-1 text-sm text-center outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(p)}
                                className={`px-2 py-1 rounded text-sm ${lowStock ? "text-red-400 font-semibold" : "text-neutral-200"} hover:bg-neutral-800 transition-colors`}
                              >
                                {p.stockQuantity}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editing ? (
                              <input
                                type="number"
                                min={0}
                                value={editing.minStockAlert}
                                onChange={(e) =>
                                  updateEditField(
                                    p.id,
                                    "minStockAlert",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-20 bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded px-2 py-1 text-sm text-center outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(p)}
                                className="px-2 py-1 rounded text-sm text-neutral-400 hover:bg-neutral-800 transition-colors"
                              >
                                {p.minStockAlert}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {lowStock && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/40">
                                <AlertTriangle className="w-3 h-3" /> Düşük Stok
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {editing && (
                              <button
                                onClick={() => saveRow(p.id)}
                                disabled={stockMutation.isPending}
                                title="Kaydet"
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors ml-auto disabled:opacity-50"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : flatProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Package className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Ürün bulunamadı.</p>
          </div>
        ) : (
          Object.keys(pageGrouped)
            .sort((a, b) => {
              if (a === "Grupsuz") return 1;
              if (b === "Grupsuz") return -1;
              return a.localeCompare(b, "tr");
            })
            .map((groupName) => (
              <div key={groupName}>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 mt-4 first:mt-0">
                  {groupName}
                </p>
                <div className="space-y-2">
                  {pageGrouped[groupName].map((p) => {
                    const editing = editingRows[p.id];
                    const lowStock = isLowStock(p);

                    return (
                      <div
                        key={p.id}
                        className={`bg-neutral-900 border rounded-xl p-4 space-y-3 ${lowStock ? "border-red-800/50 bg-red-950/10" : "border-neutral-800"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-100">
                              {p.name}
                            </p>
                            {lowStock && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/40">
                                <AlertTriangle className="w-3 h-3" /> Düşük Stok
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">
                              Stok Miktarı
                            </p>
                            {editing ? (
                              <input
                                type="number"
                                min={0}
                                value={editing.stockQuantity}
                                onChange={(e) =>
                                  updateEditField(
                                    p.id,
                                    "stockQuantity",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded px-3 py-2 text-sm outline-none min-h-[44px]"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(p)}
                                className={`text-sm font-medium ${lowStock ? "text-red-400" : "text-neutral-200"}`}
                              >
                                {p.stockQuantity}
                              </button>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">
                              Min. Uyarı
                            </p>
                            {editing ? (
                              <input
                                type="number"
                                min={0}
                                value={editing.minStockAlert}
                                onChange={(e) =>
                                  updateEditField(
                                    p.id,
                                    "minStockAlert",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded px-3 py-2 text-sm outline-none min-h-[44px]"
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(p)}
                                className="text-sm text-neutral-400"
                              >
                                {p.minStockAlert}
                              </button>
                            )}
                          </div>
                        </div>
                        {editing && (
                          <button
                            onClick={() => saveRow(p.id)}
                            disabled={stockMutation.isPending}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {stockMutation.isPending
                              ? "Kaydediliyor..."
                              : "Kaydet"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-neutral-500">
            Toplam {flatProducts.length} ürün · Sayfa {page}/{totalPages}
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
    </div>
  );
}
