"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
  primaryBtnCls,
  dangerBtnCls,
  dangerSoftBtnCls,
  editBtnCls,
  ghostBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";
import {
  formatPrice,
  currencySymbol,
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  salePrice: number;
  isActive: boolean;
}

interface ConceptProduct {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

interface CabanaClass {
  id: string;
  name: string;
}

interface Concept {
  id: string;
  name: string;
  description: string;
  serviceFee: number;
  classId: string | null;
  cabanaClass: CabanaClass | null;
  products: ConceptProduct[];
  _count: { cabanas: number };
}

interface SelectedProduct {
  id: string;
  name: string;
  salePrice: number;
  quantity: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function conceptTotalValue(concept: Concept): number {
  const productsTotal = concept.products.reduce(
    (sum, cp) => sum + parseFloat(String(cp.product.salePrice)) * cp.quantity,
    0,
  );
  return productsTotal + parseFloat(String(concept.serviceFee ?? 0));
}

const defaultCreateForm = {
  name: "",
  description: "",
  classId: "",
  serviceFee: "",
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ConceptsPage() {
  const queryClient = useQueryClient();

  /* ---- Data fetching ---- */
  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const {
    data: conceptsData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["concepts-admin"],
    queryFn: async () => {
      const [cRes, clRes, pRes] = await Promise.all([
        fetch("/api/concepts"),
        fetch("/api/classes"),
        fetch("/api/products"),
      ]);
      if (!cRes.ok) throw new Error("Konseptler yüklenemedi.");
      const concepts = await cRes.json();
      const classes = clRes.ok ? await clRes.json() : [];
      const products = pRes.ok ? await pRes.json() : [];
      return {
        concepts: concepts as Concept[],
        classes: classes as CabanaClass[],
        products: products as Product[],
      };
    },
  });

  const concepts = conceptsData?.concepts ?? [];
  const classes = conceptsData?.classes ?? [];
  const products = useMemo(
    () => conceptsData?.products ?? [],
    [conceptsData?.products],
  );

  /* ---- UI state ---- */
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---- Create modal ---- */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );

  /* ---- Edit modal ---- */
  const [editConcept, setEditConcept] = useState<Concept | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    classId: "",
    serviceFee: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  /* ---- Delete confirm ---- */
  const [deleteConcept, setDeleteConcept] = useState<Concept | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ---- Add product per concept (inline) ---- */
  const [addProductForms, setAddProductForms] = useState<
    Record<string, string>
  >({});
  const [addProductLoading, setAddProductLoading] = useState<
    Record<string, boolean>
  >({});
  const [addProductError, setAddProductError] = useState<
    Record<string, string>
  >({});

  /* ---- Quantity update loading indicator ---- */
  const [qtyUpdating, setQtyUpdating] = useState<Record<string, boolean>>({});

  /* ---- Product search in create modal ---- */
  const [productSearch, setProductSearch] = useState("");

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  /* ---- Create modal: product picker helpers ---- */
  const createRunningTotal = useMemo(() => {
    const productsTotal = selectedProducts.reduce(
      (sum, sp) => sum + parseFloat(String(sp.salePrice)) * sp.quantity,
      0,
    );
    const fee = parseFloat(createForm.serviceFee) || 0;
    return productsTotal + fee;
  }, [selectedProducts, createForm.serviceFee]);

  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.isActive);
    if (!productSearch.trim()) return active;
    const q = productSearch.toLowerCase();
    return active.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

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

  /* ---- Clone: open create modal pre-filled ---- */
  function openClone(concept: Concept) {
    setCreateForm({
      name: `Kopya - ${concept.name}`,
      description: concept.description,
      classId: concept.classId ?? "",
      serviceFee: String(parseFloat(String(concept.serviceFee)) || 0),
    });
    setSelectedProducts(
      concept.products.map((cp) => ({
        id: cp.productId,
        name: cp.product.name,
        salePrice: parseFloat(String(cp.product.salePrice)),
        quantity: cp.quantity,
      })),
    );
    setCreateError("");
    setProductSearch("");
    setShowCreate(true);
  }

  /* ================================================================ */
  /*  CRUD Handlers                                                    */
  /* ================================================================ */

  /* ---- Create ---- */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      // 1) Create concept with productIds
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          classId: createForm.classId || undefined,
          serviceFee: createForm.serviceFee
            ? parseFloat(createForm.serviceFee)
            : 0,
          productIds: selectedProducts.map((p) => p.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Konsept oluşturulamadı.");
      }
      const created = await res.json();

      // 2) Update quantities for products that aren't 1
      const qtyUpdates = selectedProducts.filter((sp) => sp.quantity > 1);
      if (qtyUpdates.length > 0) {
        await Promise.all(
          qtyUpdates.map((sp) =>
            fetch(`/api/concepts/${created.id}/products`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: sp.id, quantity: sp.quantity }),
            }),
          ),
        );
      }

      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      setSelectedProducts([]);
      setProductSearch("");
      showSuccess("Konsept başarıyla oluşturuldu.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCreateLoading(false);
    }
  }

  /* ---- Edit ---- */
  function openEdit(concept: Concept) {
    setEditConcept(concept);
    setEditForm({
      name: concept.name,
      description: concept.description,
      classId: concept.classId ?? "",
      serviceFee: String(parseFloat(String(concept.serviceFee)) || 0),
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editConcept) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/concepts/${editConcept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          classId: editForm.classId || null,
          serviceFee: editForm.serviceFee ? parseFloat(editForm.serviceFee) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Konsept güncellenemedi.");
      }
      setEditConcept(null);
      showSuccess("Konsept başarıyla güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  /* ---- Delete ---- */
  async function handleDelete() {
    if (!deleteConcept) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/concepts/${deleteConcept.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Konsept silinemedi.");
      setDeleteConcept(null);
      showSuccess("Konsept silindi.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  /* ---- Add product (inline in expanded panel) ---- */
  async function handleAddProduct(conceptId: string) {
    const productId = addProductForms[conceptId];
    if (!productId) return;
    setAddProductLoading((p) => ({ ...p, [conceptId]: true }));
    setAddProductError((p) => ({ ...p, [conceptId]: "" }));
    try {
      const res = await fetch(`/api/concepts/${conceptId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Ürün eklenemedi.");
      }
      setAddProductForms((p) => ({ ...p, [conceptId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setAddProductError((p) => ({
        ...p,
        [conceptId]: e instanceof Error ? e.message : "Bir hata oluştu.",
      }));
    } finally {
      setAddProductLoading((p) => ({ ...p, [conceptId]: false }));
    }
  }

  /* ---- Remove product ---- */
  async function handleRemoveProduct(conceptId: string, productId: string) {
    try {
      const res = await fetch(`/api/concepts/${conceptId}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Ürün kaldırılamadı.");
      }
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    }
  }

  /* ---- Update product quantity (inline) ---- */
  async function updateConceptProductQty(
    conceptId: string,
    productId: string,
    newQty: number,
  ) {
    if (newQty < 1) return;
    const key = `${conceptId}-${productId}`;
    setQtyUpdating((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/concepts/${conceptId}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newQty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Miktar güncellenemedi.");
      }
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setTimeout(() => setQtyUpdating((p) => ({ ...p, [key]: false })), 600);
    }
  }

  /* ---- Available products for inline add ---- */
  function availableProducts(concept: Concept) {
    const addedIds = new Set(concept.products.map((cp) => cp.productId));
    return products.filter((p) => p.isActive && !addedIds.has(p.id));
  }

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Konsept Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kabana konseptlerini ve ürünlerini yönetin
          </p>
        </div>
        <PermissionGate permission="concept.create">
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateError("");
              setCreateForm(defaultCreateForm);
              setSelectedProducts([]);
              setProductSearch("");
            }}
            className={primaryBtnCls}
          >
            + Yeni Konsept
          </button>
        </PermissionGate>
      </div>

      {/* Toast messages */}
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

      {/* Concepts list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : concepts.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Henüz konsept yok.
        </div>
      ) : (
        <div className="space-y-3">
          {concepts.map((concept) => {
            const totalValue = conceptTotalValue(concept);
            return (
              <div
                key={concept.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
              >
                {/* Concept row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-100 truncate">
                        {concept.name}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">
                        {concept.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {concept.cabanaClass && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-950/40 text-yellow-500 border border-yellow-800/30">
                          {concept.cabanaClass.name}
                        </span>
                      )}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {concept.products.length} ürün
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {concept._count.cabanas} kabana
                      </span>
                      {Number(concept.serviceFee) > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-950/40 text-green-400 border border-green-800/30">
                          Hizmet:{" "}
                          {formatPrice(Number(concept.serviceFee), currency)}
                        </span>
                      )}
                      {/* Summary: total value badge */}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/30 font-semibold">
                        Toplam: {formatPrice(totalValue, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === concept.id ? null : concept.id,
                        )
                      }
                      className={ghostBtnCls}
                    >
                      {expandedId === concept.id ? "Kapat" : "Ürünler"}
                    </button>
                    <PermissionGate permission="concept.create">
                      <button
                        onClick={() => openClone(concept)}
                        className={ghostBtnCls}
                        title="Kopyala"
                      >
                        Kopyala
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="concept.update">
                      <button
                        onClick={() => openEdit(concept)}
                        className={editBtnCls}
                      >
                        Düzenle
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="concept.delete">
                      <button
                        onClick={() => {
                          setDeleteConcept(concept);
                          setDeleteError("");
                        }}
                        className={dangerSoftBtnCls}
                      >
                        Sil
                      </button>
                    </PermissionGate>
                  </div>
                </div>

                {/* Expanded products panel */}
                {expandedId === concept.id && (
                  <div className="border-t border-neutral-800 px-5 py-4 bg-neutral-950/40">
                    {/* Summary card */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-neutral-800/60 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                          Ürün Toplamı
                        </p>
                        <p className="text-sm font-semibold text-neutral-100">
                          {formatPrice(
                            concept.products.reduce(
                              (s, cp) =>
                                s +
                                parseFloat(String(cp.product.salePrice)) *
                                  cp.quantity,
                              0,
                            ),
                            currency,
                          )}
                        </p>
                      </div>
                      <div className="bg-neutral-800/60 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                          Hizmet Ücreti
                        </p>
                        <p className="text-sm font-semibold text-neutral-100">
                          {formatPrice(Number(concept.serviceFee), currency)}
                        </p>
                      </div>
                      <div className="bg-amber-950/30 border border-amber-800/20 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-0.5">
                          Toplam Değer
                        </p>
                        <p className="text-sm font-bold text-amber-400">
                          {formatPrice(totalValue, currency)}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-neutral-400 mb-3">
                      Ürünler ({concept.products.length})
                    </p>

                    {concept.products.length === 0 ? (
                      <p className="text-xs text-neutral-600 mb-3">
                        Henüz ürün yok.
                      </p>
                    ) : (
                      <div className="space-y-1.5 mb-4">
                        {concept.products.map((cp) => {
                          const qtyKey = `${concept.id}-${cp.productId}`;
                          const isUpdating = qtyUpdating[qtyKey];
                          return (
                            <div
                              key={cp.id}
                              className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-3 text-xs flex-1 min-w-0">
                                <span className="text-neutral-200 font-medium truncate">
                                  {cp.product.name}
                                </span>

                                {/* Inline quantity editor */}
                                <PermissionGate
                                  permission="concept.update"
                                  fallback={
                                    <span className="text-neutral-500">
                                      Adet: {cp.quantity}
                                    </span>
                                  }
                                >
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() =>
                                        updateConceptProductQty(
                                          concept.id,
                                          cp.productId,
                                          cp.quantity - 1,
                                        )
                                      }
                                      disabled={cp.quantity <= 1 || isUpdating}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-sm transition-colors"
                                    >
                                      −
                                    </button>
                                    <span className="w-8 text-center text-neutral-200 font-medium tabular-nums">
                                      {cp.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateConceptProductQty(
                                          concept.id,
                                          cp.productId,
                                          cp.quantity + 1,
                                        )
                                      }
                                      disabled={isUpdating}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-sm transition-colors"
                                    >
                                      +
                                    </button>
                                    {isUpdating && (
                                      <span className="text-[10px] text-amber-400 ml-1 animate-pulse">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                </PermissionGate>

                                <span className="text-yellow-500 shrink-0">
                                  {formatPrice(
                                    parseFloat(String(cp.product.salePrice)) *
                                      cp.quantity,
                                    currency,
                                  )}
                                </span>
                              </div>
                              <PermissionGate permission="concept.update">
                                <button
                                  onClick={() =>
                                    handleRemoveProduct(
                                      concept.id,
                                      cp.productId,
                                    )
                                  }
                                  className="text-xs text-red-500 hover:text-red-400 transition-colors ml-4 shrink-0"
                                >
                                  Kaldır
                                </button>
                              </PermissionGate>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add product form */}
                    <PermissionGate permission="concept.update">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={addProductForms[concept.id] ?? ""}
                          onChange={(e) =>
                            setAddProductForms((p) => ({
                              ...p,
                              [concept.id]: e.target.value,
                            }))
                          }
                          className={selectCls + " flex-1"}
                        >
                          <option value="">Ürün seçin...</option>
                          {availableProducts(concept).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddProduct(concept.id)}
                          disabled={
                            addProductLoading[concept.id] ||
                            !addProductForms[concept.id]
                          }
                          className={primaryBtnCls + " shrink-0"}
                        >
                          {addProductLoading[concept.id] ? "..." : "Ekle"}
                        </button>
                      </div>
                      {addProductError[concept.id] && (
                        <p className="text-red-400 text-xs mt-2">
                          {addProductError[concept.id]}
                        </p>
                      )}
                    </PermissionGate>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Create Modal                                                 */}
      {/* ============================================================ */}
      {showCreate && (
        <Modal
          title="Yeni Konsept"
          onClose={() => setShowCreate(false)}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Konsept Adı">
              <input
                type="text"
                required
                minLength={2}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Örn: VIP Paket, Standart"
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                required
                minLength={1}
                rows={3}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls + " resize-none"}
                placeholder="Konsept açıklaması..."
              />
            </Field>
            <Field label={`Hizmet Ücreti (${currencySymbol(currency)})`}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.serviceFee}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, serviceFee: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Sınıf (opsiyonel)">
              <select
                value={createForm.classId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, classId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Sınıf seçin...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Product picker */}
            <Field label="Ürünler">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={inputCls + " mb-2"}
                placeholder="Ürün ara..."
              />
              <div className="space-y-1.5 max-h-60 overflow-y-auto rc-scrollbar">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-neutral-600 py-2">
                    Ürün bulunamadı.
                  </p>
                ) : (
                  filteredProducts.map((product) => {
                    const selected = selectedProducts.find(
                      (sp) => sp.id === product.id,
                    );
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                          selected
                            ? "bg-amber-950/30 border border-amber-800/30"
                            : "bg-neutral-800/60 border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleProduct(product)}
                          className="accent-amber-500 shrink-0"
                        />
                        <span className="flex-1 text-sm text-neutral-200 truncate">
                          {product.name}
                        </span>
                        <span className="text-xs text-neutral-500 shrink-0">
                          {formatPrice(product.salePrice, currency)}
                        </span>
                        {selected && (
                          <input
                            type="number"
                            min={1}
                            value={selected.quantity}
                            onChange={(e) =>
                              updateSelectedQuantity(
                                product.id,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="w-16 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-center text-neutral-100 shrink-0"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {selectedProducts.length > 0 && (
                <div className="mt-3 flex items-center justify-between bg-amber-950/20 border border-amber-800/20 rounded-lg px-3 py-2">
                  <span className="text-xs text-amber-400">
                    {selectedProducts.length} ürün seçili
                  </span>
                  <span className="text-xs font-semibold text-amber-300">
                    Toplam: {formatPrice(createRunningTotal, currency)}
                  </span>
                </div>
              )}
            </Field>

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

      {/* ============================================================ */}
      {/*  Edit Modal                                                   */}
      {/* ============================================================ */}
      {editConcept && (
        <Modal title="Konsept Düzenle" onClose={() => setEditConcept(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Konsept Adı">
              <input
                type="text"
                required
                minLength={2}
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                required
                minLength={1}
                rows={3}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls + " resize-none"}
              />
            </Field>
            <Field label={`Hizmet Ücreti (${currencySymbol(currency)})`}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.serviceFee}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, serviceFee: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Sınıf (opsiyonel)">
              <select
                value={editForm.classId}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, classId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Sınıf seçin...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </Field>
            {editError && <ErrorMsg msg={editError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditConcept(null)}
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

      {/* ============================================================ */}
      {/*  Delete Confirm Modal                                         */}
      {/* ============================================================ */}
      {deleteConcept && (
        <Modal title="Konsepti Sil" onClose={() => setDeleteConcept(null)}>
          {deleteError ? (
            <>
              <div className="px-4 py-3 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg mb-4">
                {deleteError}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setDeleteConcept(null)}
                  className={cancelBtnCls}
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-neutral-300 text-sm mb-6">
                <span className="text-yellow-400 font-medium">
                  {deleteConcept.name}
                </span>{" "}
                konseptini silmek istediğinizden emin misiniz?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConcept(null)}
                  className={cancelBtnCls}
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className={dangerBtnCls}
                >
                  {deleteLoading ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
