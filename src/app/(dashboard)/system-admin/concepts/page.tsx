"use client";

import { useState, useEffect, useCallback } from "react";

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
  classId: string | null;
  cabanaClass: CabanaClass | null;
  products: ConceptProduct[];
  _count: { cabanas: number };
}

const defaultCreateForm = { name: "", description: "", classId: "" };

export default function ConceptsPage() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [classes, setClasses] = useState<CabanaClass[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editConcept, setEditConcept] = useState<Concept | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    classId: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [deleteConcept, setDeleteConcept] = useState<Concept | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Add product per concept
  const [addProductForms, setAddProductForms] = useState<
    Record<string, string>
  >({});
  const [addProductLoading, setAddProductLoading] = useState<
    Record<string, boolean>
  >({});
  const [addProductError, setAddProductError] = useState<
    Record<string, string>
  >({});

  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/concepts");
      if (!res.ok) throw new Error("Konseptler yüklenemedi.");
      setConcepts(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) setClasses(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) setProducts(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchConcepts();
    fetchClasses();
    fetchProducts();
  }, [fetchConcepts, fetchClasses, fetchProducts]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  // --- Create ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          classId: createForm.classId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Konsept oluşturulamadı.");
      }
      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      showSuccess("Konsept başarıyla oluşturuldu.");
      fetchConcepts();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCreateLoading(false);
    }
  }

  // --- Edit ---
  function openEdit(concept: Concept) {
    setEditConcept(concept);
    setEditForm({
      name: concept.name,
      description: concept.description,
      classId: concept.classId ?? "",
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
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Konsept güncellenemedi.");
      }
      setEditConcept(null);
      showSuccess("Konsept başarıyla güncellendi.");
      fetchConcepts();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  // --- Delete ---
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
      fetchConcepts();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- Add Product ---
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
      fetchConcepts();
    } catch (e: unknown) {
      setAddProductError((p) => ({
        ...p,
        [conceptId]: e instanceof Error ? e.message : "Bir hata oluştu.",
      }));
    } finally {
      setAddProductLoading((p) => ({ ...p, [conceptId]: false }));
    }
  }

  // --- Remove Product ---
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
      fetchConcepts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    }
  }

  // Available products for a concept (not already added)
  function availableProducts(concept: Concept) {
    const addedIds = new Set(concept.products.map((cp) => cp.productId));
    return products.filter((p) => p.isActive && !addedIds.has(p.id));
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Konsept Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kabana konseptlerini ve ürünlerini yönetin
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setCreateError("");
            setCreateForm(defaultCreateForm);
          }}
          className="bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Yeni Konsept
        </button>
      </div>

      {/* Toast messages */}
      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
          {error}
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
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
            >
              {/* Concept row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
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
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === concept.id ? null : concept.id,
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
                  >
                    {expandedId === concept.id ? "Kapat" : "Ürünler"}
                  </button>
                  <button
                    onClick={() => openEdit(concept)}
                    className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConcept(concept);
                      setDeleteError("");
                    }}
                    className="text-xs px-3 py-1.5 rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>

              {/* Products panel */}
              {expandedId === concept.id && (
                <div className="border-t border-neutral-800 px-5 py-4 bg-neutral-950/40">
                  <p className="text-xs font-medium text-neutral-400 mb-3">
                    Ürünler
                  </p>

                  {concept.products.length === 0 ? (
                    <p className="text-xs text-neutral-600 mb-3">
                      Henüz ürün yok.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mb-4">
                      {concept.products.map((cp) => (
                        <div
                          key={cp.id}
                          className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-neutral-200 font-medium">
                              {cp.product.name}
                            </span>
                            <span className="text-neutral-500">
                              Adet: {cp.quantity}
                            </span>
                            <span className="text-yellow-500">
                              {cp.product.salePrice.toLocaleString("tr-TR", {
                                style: "currency",
                                currency: "TRY",
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveProduct(concept.id, cp.productId)
                            }
                            className="text-xs text-red-500 hover:text-red-400 transition-colors ml-4"
                          >
                            Kaldır
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add product form */}
                  <div className="flex items-center gap-2">
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
                      className="text-xs px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-neutral-950 font-semibold transition-colors shrink-0"
                    >
                      {addProductLoading[concept.id] ? "..." : "Ekle"}
                    </button>
                  </div>
                  {addProductError[concept.id] && (
                    <p className="text-red-400 text-xs mt-2">
                      {addProductError[concept.id]}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Konsept" onClose={() => setShowCreate(false)}>
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

      {/* Delete Confirm Modal */}
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
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
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

// --- Shared sub-components ---

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-yellow-400">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
      {msg}
    </p>
  );
}

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-3 py-2 text-sm outline-none transition-colors placeholder:text-neutral-600";

const selectCls =
  "w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-3 py-2 text-sm outline-none transition-colors";

const cancelBtnCls =
  "px-4 py-2 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors";

const submitBtnCls =
  "px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors";
