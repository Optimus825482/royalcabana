"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";

interface ProductGroup {
  id: string;
  name: string;
  sortOrder: number;
  _count?: { products: number };
}

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  isActive: boolean;
  groupId: string | null;
  group: ProductGroup | null;
}

const defaultProductForm = {
  name: "",
  purchasePrice: "",
  salePrice: "",
  groupId: "",
};
const defaultGroupForm = { name: "", sortOrder: "0" };

function formatTRY(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

function hasPriceWarning(p: string, s: string) {
  const pv = parseFloat(p),
    sv = parseFloat(s);
  return !isNaN(pv) && !isNaN(sv) && pv > sv;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();

  const {
    data: productsAndGroups,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["products-and-groups"],
    queryFn: async () => {
      const [pRes, gRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/product-groups"),
      ]);
      if (!pRes.ok) throw new Error("Ürünler yüklenemedi.");
      if (!gRes.ok) throw new Error("Gruplar yüklenemedi.");
      const [products, groups] = await Promise.all([pRes.json(), gRes.json()]);
      return {
        products: products as Product[],
        groups: groups as ProductGroup[],
      };
    },
  });

  const products = productsAndGroups?.products ?? [];
  const groups = productsAndGroups?.groups ?? [];

  const [error, setError] = useState(queryError ? String(queryError) : "");
  const [success, setSuccess] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Product modals
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultProductForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createPriceWarn, setCreatePriceWarn] = useState(false);
  const [createPriceOk, setCreatePriceOk] = useState(false);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    purchasePrice: "",
    salePrice: "",
    isActive: true,
    groupId: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editPriceWarn, setEditPriceWarn] = useState(false);
  const [editPriceOk, setEditPriceOk] = useState(false);

  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Group modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState("");

  const [editGroup, setEditGroup] = useState<ProductGroup | null>(null);
  const [editGroupForm, setEditGroupForm] = useState(defaultGroupForm);
  const [editGroupLoading, setEditGroupLoading] = useState(false);
  const [editGroupError, setEditGroupError] = useState("");

  const [deleteGroup, setDeleteGroup] = useState<ProductGroup | null>(null);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState("");

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  function toggleCollapse(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // --- Product CRUD ---
  function handleCreateChange(field: string, value: string) {
    const next = { ...createForm, [field]: value };
    setCreateForm(next);
    if (field === "purchasePrice" || field === "salePrice") {
      const w = hasPriceWarning(next.purchasePrice, next.salePrice);
      setCreatePriceWarn(w);
      if (!w) setCreatePriceOk(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (createPriceWarn && !createPriceOk) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          purchasePrice: parseFloat(createForm.purchasePrice),
          salePrice: parseFloat(createForm.salePrice),
          groupId: createForm.groupId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Ürün oluşturulamadı.");
      }
      setShowCreate(false);
      setCreateForm(defaultProductForm);
      setCreatePriceWarn(false);
      setCreatePriceOk(false);
      showSuccess("Ürün oluşturuldu.");
      queryClient.invalidateQueries({ queryKey: ["products-and-groups"] });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setEditForm({
      name: p.name,
      purchasePrice: String(p.purchasePrice),
      salePrice: String(p.salePrice),
      isActive: p.isActive,
      groupId: p.groupId ?? "",
    });
    setEditError("");
    setEditPriceWarn(false);
    setEditPriceOk(false);
  }

  function handleEditChange(field: string, value: string | boolean) {
    const next = { ...editForm, [field]: value };
    setEditForm(next);
    if (field === "purchasePrice" || field === "salePrice") {
      const w = hasPriceWarning(
        String(next.purchasePrice),
        String(next.salePrice),
      );
      setEditPriceWarn(w);
      if (!w) setEditPriceOk(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProduct || (editPriceWarn && !editPriceOk)) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          purchasePrice: parseFloat(editForm.purchasePrice),
          salePrice: parseFloat(editForm.salePrice),
          isActive: editForm.isActive,
          groupId: editForm.groupId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Güncellenemedi.");
      }
      setEditProduct(null);
      showSuccess("Ürün güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["products-and-groups"] });
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/products/${deleteProduct.id}`, {
        method: "DELETE",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Silinemedi.");
      setDeleteProduct(null);
      showSuccess("Ürün silindi.");
      queryClient.invalidateQueries({ queryKey: ["products-and-groups"] });
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- Group CRUD ---
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setGroupLoading(true);
    setGroupError("");
    try {
      const res = await fetch("/api/product-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name,
          sortOrder: parseInt(groupForm.sortOrder) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Grup oluşturulamadı.");
      }
      setShowCreateGroup(false);
      setGroupForm(defaultGroupForm);
      showSuccess("Grup oluşturuldu.");
      queryClient.invalidateQueries({ queryKey: ["products-and-groups"] });
    } catch (e: unknown) {
      setGroupError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setGroupLoading(false);
    }
  }

  function openEditGroup(g: ProductGroup) {
    setEditGroup(g);
    setEditGroupForm({ name: g.name, sortOrder: String(g.sortOrder) });
    setEditGroupError("");
  }

  async function handleEditGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!editGroup) return;
    setEditGroupLoading(true);
    setEditGroupError("");
    try {
      const res = await fetch(`/api/product-groups/${editGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editGroupForm.name,
          sortOrder: parseInt(editGroupForm.sortOrder) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Güncellenemedi.");
      }
      setEditGroup(null);
      showSuccess("Grup güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["products-and-groups"] });
    } catch (e: unknown) {
      setEditGroupError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditGroupLoading(false);
    }
  }

  async function handleDeleteGroup() {
    if (!deleteGroup) return;
    setDeleteGroupLoading(true);
    setDeleteGroupError("");
    try {
      const res = await fetch(`/api/product-groups/${deleteGroup.id}`, {
        method: "DELETE",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Silinemedi.");
      setDeleteGroup(null);
      showSuccess("Grup silindi.");
      queryClient.invalidateQueries({ queryKey: ["products-and-groups"] });
    } catch (e: unknown) {
      setDeleteGroupError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteGroupLoading(false);
    }
  }

  // --- Grouped data ---
  const groupedProducts = groups.map((g) => ({
    group: g,
    items: products.filter((p) => p.groupId === g.id),
  }));
  const ungrouped = products.filter((p) => p.groupId === null);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Ürün Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Konseptlerde kullanılan ürünleri yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCreateGroup(true);
              setGroupForm(defaultGroupForm);
              setGroupError("");
            }}
            className="min-h-[44px] border border-yellow-600/50 hover:border-yellow-500 text-yellow-500 hover:text-yellow-400 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Yeni Grup
          </button>
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateError("");
              setCreateForm(defaultProductForm);
              setCreatePriceWarn(false);
              setCreatePriceOk(false);
            }}
            className="min-h-[44px] bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Yeni Ürün
          </button>
        </div>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : (
        <div className="space-y-4">
          {groupedProducts.map(({ group, items }) => (
            <div
              key={group.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
            >
              {/* Group header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-800">
                <button
                  onClick={() => toggleCollapse(group.id)}
                  className="min-h-[44px] flex items-center gap-2 text-left flex-1"
                >
                  <ChevronIcon collapsed={!!collapsed[group.id]} />
                  <span className="text-sm font-semibold text-yellow-400">
                    {group.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                    {items.length} ürün
                  </span>
                </button>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openEditGroup(group)}
                    className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      setDeleteGroup(group);
                      setDeleteGroupError("");
                    }}
                    className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
              {/* Group products */}
              {!collapsed[group.id] &&
                (items.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-neutral-600">
                    Bu grupta henüz ürün yok.
                  </div>
                ) : (
                  <ProductTable
                    products={items}
                    onEdit={openEdit}
                    onDelete={(p) => {
                      setDeleteProduct(p);
                      setDeleteError("");
                    }}
                  />
                ))}
            </div>
          ))}

          {/* Ungrouped */}
          {ungrouped.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-neutral-800">
                <button
                  onClick={() => toggleCollapse("__ungrouped")}
                  className="min-h-[44px] flex items-center gap-2 flex-1 text-left"
                >
                  <ChevronIcon collapsed={!!collapsed["__ungrouped"]} />
                  <span className="text-sm font-semibold text-neutral-400">
                    Grupsuz Ürünler
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">
                    {ungrouped.length} ürün
                  </span>
                </button>
              </div>
              {!collapsed["__ungrouped"] && (
                <ProductTable
                  products={ungrouped}
                  onEdit={openEdit}
                  onDelete={(p) => {
                    setDeleteProduct(p);
                    setDeleteError("");
                  }}
                />
              )}
            </div>
          )}

          {products.length === 0 && groups.length === 0 && (
            <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
              Henüz ürün veya grup yok.
            </div>
          )}
        </div>
      )}

      {/* Create Product Modal */}
      {showCreate && (
        <Modal title="Yeni Ürün" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Ürün Adı">
              <input
                type="text"
                required
                minLength={2}
                value={createForm.name}
                onChange={(e) => handleCreateChange("name", e.target.value)}
                className={inputCls}
                placeholder="Örn: Havlu, Şezlong"
              />
            </Field>
            <Field label="Grup (opsiyonel)">
              <select
                value={createForm.groupId}
                onChange={(e) => handleCreateChange("groupId", e.target.value)}
                className={selectCls}
              >
                <option value="">Grupsuz</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Maliyet (₺)">
              <input
                type="number"
                required
                min={0.01}
                step="0.01"
                value={createForm.purchasePrice}
                onChange={(e) =>
                  handleCreateChange("purchasePrice", e.target.value)
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Satış Fiyatı (₺)">
              <input
                type="number"
                required
                min={0.01}
                step="0.01"
                value={createForm.salePrice}
                onChange={(e) =>
                  handleCreateChange("salePrice", e.target.value)
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            {createPriceWarn && (
              <PriceWarning
                confirmed={createPriceOk}
                onChange={setCreatePriceOk}
              />
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
                disabled={createLoading || (createPriceWarn && !createPriceOk)}
                className={submitBtnCls}
              >
                {createLoading ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <Modal title="Ürün Düzenle" onClose={() => setEditProduct(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Ürün Adı">
              <input
                type="text"
                required
                minLength={2}
                value={editForm.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Grup">
              <select
                value={editForm.groupId}
                onChange={(e) => handleEditChange("groupId", e.target.value)}
                className={selectCls}
              >
                <option value="">Grupsuz</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Maliyet (₺)">
              <input
                type="number"
                required
                min={0.01}
                step="0.01"
                value={editForm.purchasePrice}
                onChange={(e) =>
                  handleEditChange("purchasePrice", e.target.value)
                }
                className={inputCls}
              />
            </Field>
            <Field label="Satış Fiyatı (₺)">
              <input
                type="number"
                required
                min={0.01}
                step="0.01"
                value={editForm.salePrice}
                onChange={(e) => handleEditChange("salePrice", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Durum">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() =>
                    handleEditChange("isActive", !editForm.isActive)
                  }
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${editForm.isActive ? "bg-yellow-600" : "bg-neutral-700"}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editForm.isActive ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </div>
                <span className="text-sm text-neutral-300">
                  {editForm.isActive ? "Aktif" : "Pasif"}
                </span>
              </label>
            </Field>
            {editPriceWarn && (
              <PriceWarning confirmed={editPriceOk} onChange={setEditPriceOk} />
            )}
            {editError && <ErrorMsg msg={editError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={editLoading || (editPriceWarn && !editPriceOk)}
                className={submitBtnCls}
              >
                {editLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Product Modal */}
      {deleteProduct && (
        <Modal title="Ürünü Sil" onClose={() => setDeleteProduct(null)}>
          {deleteError ? (
            <>
              <div className="px-4 py-3 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg mb-4">
                {deleteError}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setDeleteProduct(null)}
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
                  {deleteProduct.name}
                </span>{" "}
                ürününü silmek istediğinizden emin misiniz?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteProduct(null)}
                  className={cancelBtnCls}
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
                >
                  {deleteLoading ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <Modal title="Yeni Grup" onClose={() => setShowCreateGroup(false)}>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <Field label="Grup Adı">
              <input
                type="text"
                required
                minLength={2}
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Örn: İçecekler, Yiyecekler"
              />
            </Field>
            <Field label="Sıra No">
              <input
                type="number"
                value={groupForm.sortOrder}
                onChange={(e) =>
                  setGroupForm((f) => ({ ...f, sortOrder: e.target.value }))
                }
                className={inputCls}
                placeholder="0"
              />
            </Field>
            {groupError && <ErrorMsg msg={groupError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={groupLoading}
                className={submitBtnCls}
              >
                {groupLoading ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Group Modal */}
      {editGroup && (
        <Modal title="Grubu Düzenle" onClose={() => setEditGroup(null)}>
          <form onSubmit={handleEditGroup} className="space-y-4">
            <Field label="Grup Adı">
              <input
                type="text"
                required
                minLength={2}
                value={editGroupForm.name}
                onChange={(e) =>
                  setEditGroupForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Sıra No">
              <input
                type="number"
                value={editGroupForm.sortOrder}
                onChange={(e) =>
                  setEditGroupForm((f) => ({ ...f, sortOrder: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            {editGroupError && <ErrorMsg msg={editGroupError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditGroup(null)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={editGroupLoading}
                className={submitBtnCls}
              >
                {editGroupLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Group Modal */}
      {deleteGroup && (
        <Modal title="Grubu Sil" onClose={() => setDeleteGroup(null)}>
          {deleteGroupError ? (
            <>
              <div className="px-4 py-3 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg mb-4">
                {deleteGroupError}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setDeleteGroup(null)}
                  className={cancelBtnCls}
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-neutral-300 text-sm mb-2">
                <span className="text-yellow-400 font-medium">
                  {deleteGroup.name}
                </span>{" "}
                grubunu silmek istediğinizden emin misiniz?
              </p>
              <p className="text-neutral-500 text-xs mb-6">
                Gruptaki ürünler silinmez, grupsuz olarak kalır.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteGroup(null)}
                  className={cancelBtnCls}
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteGroup}
                  disabled={deleteGroupLoading}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
                >
                  {deleteGroupLoading ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// --- Sub-components ---

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-neutral-500 transition-transform shrink-0 ${collapsed ? "-rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function ProductTable({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  return (
    <>
      {/* Desktop table */}
      <table className="w-full text-sm hidden md:table">
        <thead>
          <tr className="border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wide">
            <th className="text-left px-5 py-3 font-medium">Ürün Adı</th>
            <th className="text-right px-5 py-3 font-medium">Maliyet</th>
            <th className="text-right px-5 py-3 font-medium">Satış Fiyatı</th>
            <th className="text-center px-5 py-3 font-medium">Durum</th>
            <th className="text-right px-5 py-3 font-medium">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr
              key={p.id}
              className={
                i !== products.length - 1
                  ? "border-b border-neutral-800/60"
                  : ""
              }
            >
              <td className="px-5 py-3.5 font-medium text-neutral-100">
                {p.name}
              </td>
              <td className="px-5 py-3.5 text-right text-neutral-300">
                {formatTRY(p.purchasePrice)}
              </td>
              <td className="px-5 py-3.5 text-right text-yellow-400 font-medium">
                {formatTRY(p.salePrice)}
              </td>
              <td className="px-5 py-3.5 text-center">
                <span
                  className={
                    p.isActive
                      ? "text-xs px-2.5 py-1 rounded-full bg-green-950/40 text-green-400 border border-green-800/30"
                      : "text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700"
                  }
                >
                  {p.isActive ? "Aktif" : "Pasif"}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(p)}
                    className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-neutral-800">
        {products.map((p) => (
          <div key={p.id} className="px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-neutral-100 text-sm">
                {p.name}
              </span>
              <span
                className={
                  p.isActive
                    ? "text-xs px-2.5 py-1 rounded-full bg-green-950/40 text-green-400 border border-green-800/30 shrink-0"
                    : "text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700 shrink-0"
                }
              >
                {p.isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-neutral-500">
                Maliyet:{" "}
                <span className="text-neutral-300">
                  {formatTRY(p.purchasePrice)}
                </span>
              </span>
              <span className="text-neutral-500">
                Satış:{" "}
                <span className="text-yellow-400 font-medium">
                  {formatTRY(p.salePrice)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onEdit(p)}
                className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Düzenle
              </button>
              <button
                onClick={() => onDelete(p)}
                className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// --- Shared sub-components imported from @/components/shared/FormComponents ---

function PriceWarning({
  confirmed,
  onChange,
}: {
  confirmed: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-yellow-950/40 border border-yellow-700/40 rounded-lg px-3 py-3">
      <p className="text-yellow-400 text-xs mb-2">
        Maliyet satış fiyatından yüksek. Devam etmek istiyor musunuz?
      </p>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-yellow-500"
        />
        <span className="text-xs text-neutral-300">
          Evet, devam etmek istiyorum
        </span>
      </label>
    </div>
  );
}
