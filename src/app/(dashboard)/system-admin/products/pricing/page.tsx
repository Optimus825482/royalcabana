"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ImportModal from "@/components/products/ImportModal";
import PriceHistoryModal from "@/components/products/PriceHistoryModal";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  isActive: boolean;
  groupId: string | null;
  group: { id: string; name: string } | null;
}

function formatTRY(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export default function PricingPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["products-and-groups"],
    queryFn: async () => {
      const [pRes, gRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/product-groups"),
      ]);
      if (!pRes.ok) throw new Error("Ürünler yüklenemedi.");
      if (!gRes.ok) throw new Error("Gruplar yüklenemedi.");
      const [products, groups] = await Promise.all([pRes.json(), gRes.json()]);
      return { products: products as Product[], groups };
    },
  });

  const products = data?.products ?? [];

  const [showImport, setShowImport] = useState(false);
  const [priceHistoryProduct, setPriceHistoryProduct] =
    useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");

  // Manual price edit state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    purchasePrice: "",
    salePrice: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const filtered = search.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  function showSuccessMsg(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  function openPriceEdit(p: Product) {
    setEditProduct(p);
    setEditForm({
      purchasePrice: String(p.purchasePrice),
      salePrice: String(p.salePrice),
    });
    setEditError("");
  }

  async function handlePriceUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editProduct) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePrice: parseFloat(editForm.purchasePrice),
          salePrice: parseFloat(editForm.salePrice),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Fiyat güncellenemedi.");
      }
      setEditProduct(null);
      showSuccessMsg(`${editProduct.name} fiyatı güncellendi.`);
      queryClient.invalidateQueries({ queryKey: ["products-and-groups"] });
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  const costWarning =
    editForm.purchasePrice &&
    editForm.salePrice &&
    parseFloat(editForm.purchasePrice) > parseFloat(editForm.salePrice);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Fiyat İşlemleri
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Manuel fiyat güncelleme, toplu içe aktarma ve fiyat geçmişi
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          ↑ İçe Aktar (Excel/CSV)
        </button>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Ürün ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs min-h-[44px] bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder:text-neutral-600"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          {search ? "Eşleşen ürün bulunamadı." : "Henüz ürün yok."}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Desktop table */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Ürün Adı</th>
                <th className="text-left px-5 py-3 font-medium">Grup</th>
                <th className="text-right px-5 py-3 font-medium">Maliyet</th>
                <th className="text-right px-5 py-3 font-medium">
                  Satış Fiyatı
                </th>
                <th className="text-right px-5 py-3 font-medium">Kâr Marjı</th>
                <th className="text-right px-5 py-3 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const margin =
                  p.salePrice > 0
                    ? (
                        ((p.salePrice - p.purchasePrice) / p.salePrice) *
                        100
                      ).toFixed(1)
                    : "0.0";
                const isLoss = p.purchasePrice > p.salePrice;
                return (
                  <tr
                    key={p.id}
                    className={
                      i !== filtered.length - 1
                        ? "border-b border-neutral-800/60"
                        : ""
                    }
                  >
                    <td className="px-5 py-3.5 font-medium text-neutral-100">
                      {p.name}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-400 text-xs">
                      {p.group?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-300">
                      {formatTRY(p.purchasePrice)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-yellow-400 font-medium">
                      {formatTRY(p.salePrice)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right text-xs font-medium ${isLoss ? "text-red-400" : "text-emerald-400"}`}
                    >
                      %{margin}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPriceEdit(p)}
                          className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30 transition-colors"
                        >
                          Fiyat Güncelle
                        </button>
                        <button
                          onClick={() => setPriceHistoryProduct(p)}
                          className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        >
                          Geçmiş
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-neutral-800">
            {filtered.map((p) => {
              const margin =
                p.salePrice > 0
                  ? (
                      ((p.salePrice - p.purchasePrice) / p.salePrice) *
                      100
                    ).toFixed(1)
                  : "0.0";
              const isLoss = p.purchasePrice > p.salePrice;
              return (
                <div key={p.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium text-neutral-100 text-sm">
                        {p.name}
                      </span>
                      {p.group && (
                        <span className="ml-2 text-xs text-neutral-500">
                          {p.group.name}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLoss ? "bg-red-950/40 text-red-400" : "bg-emerald-950/40 text-emerald-400"}`}
                    >
                      %{margin}
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
                      onClick={() => openPriceEdit(p)}
                      className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30 transition-colors"
                    >
                      Fiyat Güncelle
                    </button>
                    <button
                      onClick={() => setPriceHistoryProduct(p)}
                      className="min-h-[44px] text-xs px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    >
                      Geçmiş
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Edit Modal */}
      {editProduct && (
        <Modal
          title={`Fiyat Güncelle — ${editProduct.name}`}
          onClose={() => setEditProduct(null)}
        >
          <form onSubmit={handlePriceUpdate} className="space-y-4">
            {editError && <ErrorMsg msg={editError} />}

            <Field label="Maliyet (₺)">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editForm.purchasePrice}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, purchasePrice: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>

            <Field label="Satış Fiyatı (₺)">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editForm.salePrice}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, salePrice: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>

            {costWarning && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
                ⚠ Maliyet, satış fiyatından yüksek — zarar oluşacak.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className={submitBtnCls}
              >
                {editLoading ? "Kaydediliyor..." : "Güncelle"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onComplete={() =>
          queryClient.invalidateQueries({ queryKey: ["products-and-groups"] })
        }
      />

      <PriceHistoryModal
        product={priceHistoryProduct}
        onClose={() => setPriceHistoryProduct(null)}
      />
    </div>
  );
}
