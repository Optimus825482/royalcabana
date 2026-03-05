"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  cancelBtnCls,
  submitBtnCls,
  primaryBtnCls,
  editBtnCls,
  ghostBtnCls,
  dangerSoftBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";
import {
  formatPrice,
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  salePrice: number | string;
  isActive: boolean;
}

interface MinibarTypeProduct {
  id: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string; salePrice: number | string };
}

interface MinibarType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  products: MinibarTypeProduct[];
  _count: { cabanas: number };
}

interface SelectedProduct {
  id: string;
  name: string;
  salePrice: number;
  quantity: number;
}

function minibarTotalValue(mt: MinibarType): number {
  return mt.products.reduce(
    (sum, p) => sum + parseFloat(String(p.product.salePrice)) * p.quantity,
    0,
  );
}

export default function MinibarTypesPage() {
  const queryClient = useQueryClient();

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const {
    data: pageData,
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["minibar-types-admin"],
    queryFn: async () => {
      const [mtRes, pRes] = await Promise.all([
        fetch("/api/minibar-types"),
        fetch("/api/products"),
      ]);
      if (!mtRes.ok) throw new Error("Minibar tipleri yüklenemedi.");
      const mtJson = await mtRes.json();
      const pJson = pRes.ok ? await pRes.json() : { data: [] };
      return {
        minibarTypes: (mtJson.data ?? []) as MinibarType[],
        products: ((pJson.data ?? pJson) as Product[]).filter(
          (p) => p.isActive,
        ),
      };
    },
  });

  const minibarTypes = pageData?.minibarTypes ?? [];
  const products = useMemo(
    () => pageData?.products ?? [],
    [pageData?.products],
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );
  const [productSearch, setProductSearch] = useState("");

  // Edit modal
  const [editItem, setEditItem] = useState<MinibarType | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Content modal
  const [contentItem, setContentItem] = useState<MinibarType | null>(null);

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState<MinibarType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function showSuccessMsg(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  // Product picker helpers
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const createRunningTotal = useMemo(() => {
    return selectedProducts.reduce(
      (sum, sp) => sum + sp.salePrice * sp.quantity,
      0,
    );
  }, [selectedProducts]);

  const toggleProduct = useCallback((product: Product) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((sp) => sp.id === product.id);
      if (exists) return prev.filter((sp) => sp.id !== product.id);
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          salePrice: parseFloat(String(product.salePrice)),
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateSelectedQuantity = useCallback(
    (productId: string, quantity: number) => {
      setSelectedProducts((prev) =>
        prev.map((sp) =>
          sp.id === productId ? { ...sp, quantity: Math.max(1, quantity) } : sp,
        ),
      );
    },
    [],
  );

  // CRUD handlers
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const res = await fetch("/api/minibar-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || null,
          productIds: selectedProducts.map((p) => ({
            productId: p.id,
            quantity: p.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Minibar tipi oluşturulamadı.");
      setShowCreate(false);
      setCreateForm({ name: "", description: "" });
      setSelectedProducts([]);
      setProductSearch("");
      showSuccessMsg("Minibar tipi başarıyla oluşturuldu.");
      queryClient.invalidateQueries({ queryKey: ["minibar-types-admin"] });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(item: MinibarType) {
    setEditItem(item);
    setEditForm({ name: item.name, description: item.description ?? "" });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/minibar-types/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Güncelleme başarısız.");
      setEditItem(null);
      showSuccessMsg("Minibar tipi güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["minibar-types-admin"] });
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleActive(item: MinibarType) {
    try {
      const res = await fetch(`/api/minibar-types/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Durum değiştirilemedi.");
      queryClient.invalidateQueries({ queryKey: ["minibar-types-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/minibar-types/${deleteItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Silinemedi.");
      setDeleteItem(null);
      showSuccessMsg("Minibar tipi silindi.");
      queryClient.invalidateQueries({ queryKey: ["minibar-types-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Minibar Tanımları
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Minibar tiplerini ve içeriklerini yönetin
          </p>
        </div>
        <PermissionGate permission="system.config.manage">
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateError("");
              setCreateForm({ name: "", description: "" });
              setSelectedProducts([]);
              setProductSearch("");
            }}
            className={primaryBtnCls}
          >
            + Yeni Minibar Tipi
          </button>
        </PermissionGate>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}
      {(error || queryError) && (
        <div className="mb-4 px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
          {error || String(queryError)}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">
            {(queryError as Error)?.message ??
              "Veriler yüklenirken hata oluştu."}
          </p>
        </div>
      ) : minibarTypes.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Henüz minibar tipi tanımlanmamış.
        </div>
      ) : (
        <div className="space-y-3">
          {minibarTypes.map((mt) => {
            const totalValue = minibarTotalValue(mt);
            return (
              <div
                key={mt.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-100 truncate">
                        {mt.name}
                      </p>
                      {mt.description && (
                        <p className="text-xs text-neutral-500 mt-0.5 truncate">
                          {mt.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border ${
                          mt.isActive
                            ? "bg-green-950/40 text-green-400 border-green-800/30"
                            : "bg-red-950/40 text-red-400 border-red-800/30"
                        }`}
                      >
                        {mt.isActive ? "Aktif" : "Pasif"}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {mt.products.length} ürün
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {mt._count.cabanas} Cabana
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/30 font-semibold">
                        Toplam: {formatPrice(totalValue, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => setContentItem(mt)}
                      className={ghostBtnCls}
                    >
                      İçerik
                    </button>
                    <PermissionGate permission="system.config.manage">
                      <button
                        onClick={() => openEdit(mt)}
                        className={editBtnCls}
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleToggleActive(mt)}
                        className={ghostBtnCls}
                      >
                        {mt.isActive ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                      <button
                        onClick={() => setDeleteItem(mt)}
                        className={dangerSoftBtnCls}
                      >
                        Sil
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content Modal */}
      {contentItem &&
        (() => {
          const item =
            minibarTypes.find((m) => m.id === contentItem.id) ?? contentItem;
          const total = minibarTotalValue(item);
          return (
            <Modal
              title={`${item.name} — İçerik`}
              onClose={() => setContentItem(null)}
              maxWidth="max-w-lg"
            >
              <div className="space-y-2">
                {item.products.length === 0 ? (
                  <p className="text-sm text-neutral-500">Ürün eklenmemiş.</p>
                ) : (
                  item.products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-neutral-800/60 rounded px-3 py-2 text-xs"
                    >
                      <span className="text-neutral-200 truncate mr-2">
                        {p.product.name}
                      </span>
                      <span className="text-neutral-400 whitespace-nowrap">
                        {p.quantity} ×{" "}
                        {formatPrice(
                          parseFloat(String(p.product.salePrice)),
                          currency,
                        )}{" "}
                        ={" "}
                        <span className="text-emerald-400">
                          {formatPrice(
                            parseFloat(String(p.product.salePrice)) *
                              p.quantity,
                            currency,
                          )}
                        </span>
                      </span>
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between bg-neutral-800/80 rounded px-3 py-2 text-xs font-medium border border-neutral-700/50 mt-1">
                  <span className="text-neutral-300">Toplam</span>
                  <span className="text-amber-400">
                    {formatPrice(total, currency)}
                  </span>
                </div>
              </div>
            </Modal>
          );
        })()}

      {/* Create Modal */}
      {showCreate && (
        <Modal
          title="Yeni Minibar Tipi"
          onClose={() => setShowCreate(false)}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Minibar Tipi Adı">
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Örn: Standart Minibar"
              />
            </Field>
            <Field label="Açıklama (Opsiyonel)">
              <input
                type="text"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls}
                placeholder="Kısa açıklama"
              />
            </Field>

            {/* Product Picker */}
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-2 block">
                Ürünler
              </label>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={inputCls + " mb-2"}
                placeholder="Ürün ara..."
              />
              <div className="max-h-40 overflow-y-auto rc-scrollbar space-y-1 border border-neutral-800 rounded-lg p-2">
                {filteredProducts.map((p) => {
                  const selected = selectedProducts.find(
                    (sp) => sp.id === p.id,
                  );
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        selected
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                          : "bg-neutral-800/40 hover:bg-neutral-800 text-neutral-300 border border-transparent"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-neutral-500 ml-2">
                        {formatPrice(parseFloat(String(p.salePrice)), currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Products with Quantity */}
            {selectedProducts.length > 0 && (
              <div>
                <label className="text-xs font-medium text-neutral-400 mb-2 block">
                  Seçili Ürünler ({selectedProducts.length})
                </label>
                <div className="space-y-1">
                  {selectedProducts.map((sp) => (
                    <div
                      key={sp.id}
                      className="flex items-center gap-2 bg-neutral-800/60 rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="flex-1 text-neutral-200 truncate">
                        {sp.name}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={sp.quantity}
                        onChange={(e) =>
                          updateSelectedQuantity(
                            sp.id,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-14 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-center text-neutral-100 text-xs"
                      />
                      <span className="text-neutral-500 w-20 text-right">
                        {formatPrice(sp.salePrice * sp.quantity, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          toggleProduct({
                            id: sp.id,
                            name: sp.name,
                            salePrice: sp.salePrice,
                            isActive: true,
                          })
                        }
                        className="text-red-400 hover:text-red-300 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-end text-xs font-medium text-amber-400 pt-1">
                    Toplam: {formatPrice(createRunningTotal, currency)}
                  </div>
                </div>
              </div>
            )}

            {createError && <ErrorMsg msg={createError} />}
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
                disabled={createLoading}
                className={submitBtnCls}
              >
                {createLoading ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editItem && (
        <Modal
          title={`${editItem.name} — Düzenle`}
          onClose={() => setEditItem(null)}
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Ad">
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Açıklama">
              <input
                type="text"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            {editError && <ErrorMsg msg={editError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className={submitBtnCls}
              >
                {editLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteItem && (
        <Modal title="Minibar Tipi Sil" onClose={() => setDeleteItem(null)}>
          <p className="text-sm text-neutral-300 mb-4">
            <span className="text-amber-400 font-medium">
              {deleteItem.name}
            </span>{" "}
            minibar tipini silmek istediğinize emin misiniz?
          </p>
          {deleteItem._count.cabanas > 0 && (
            <p className="text-xs text-orange-400 mb-4">
              ⚠ Bu minibar tipi {deleteItem._count.cabanas} cabanaya atanmış
              durumda.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteItem(null)}
              className={cancelBtnCls}
            >
              İptal
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {deleteLoading ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
