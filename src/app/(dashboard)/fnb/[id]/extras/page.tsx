"use client";

import { useState, use } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  salePrice: number;
  isActive: boolean;
}

interface SelectedItem {
  productId: string;
  quantity: number;
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Ürünler yüklenemedi.");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.products ?? []);
}

export default function FnBExtrasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  useSession({ required: true });
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const activeProducts = products.filter((p) => p.isActive);

  function setQuantity(productId: string, qty: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
  }

  const items: SelectedItem[] = Array.from(selected.entries()).map(
    ([productId, quantity]) => ({ productId, quantity }),
  );
  const total = items.reduce((sum, item) => {
    const p = activeProducts.find((p) => p.id === item.productId);
    return sum + (p?.salePrice ?? 0) * item.quantity;
  }, 0);

  async function handleSubmit() {
    if (items.length === 0) {
      setError("En az bir ürün seçin.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reservations/${id}/extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ekstra eklenemedi.");
        return;
      }
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setTimeout(() => router.push("/fnb"), 1500);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="min-h-[44px] px-3 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Geri
          </button>
          <div>
            <h1 className="text-xl font-semibold text-yellow-400">
              Ekstra Ürün Ekle
            </h1>
            <p className="text-sm text-neutral-500">
              Rezervasyon #{id.slice(-8)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-neutral-500 text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <span>Ürünler yükleniyor...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {activeProducts.map((product) => {
              const qty = selected.get(product.id) ?? 0;
              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                    qty > 0
                      ? "bg-neutral-800 border-yellow-700/40"
                      : "bg-neutral-900 border-neutral-800"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-100">
                      {product.name}
                    </p>
                    <p className="text-xs text-yellow-400 mt-0.5">
                      {product.salePrice.toLocaleString("tr-TR")} ₺
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(product.id, qty - 1)}
                      disabled={qty === 0}
                      className="w-11 h-11 rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-200 text-sm font-bold transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-neutral-100">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQuantity(product.id, qty + 1)}
                      className="w-11 h-11 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary + submit */}
        {items.length > 0 && (
          <div className="mt-6 p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">
                {items.length} ürün seçildi
              </span>
              <span className="text-yellow-400 font-semibold">
                {total.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 px-4 py-3 bg-green-950/40 border border-green-700/40 text-green-400 text-sm rounded-lg">
            Ekstralar başarıyla eklendi. Yönlendiriliyorsunuz...
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 min-h-[44px] py-2.5 text-sm font-medium rounded-lg border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || items.length === 0 || success}
            className="flex-1 min-h-[44px] py-2.5 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 transition-colors"
          >
            {submitting ? "Ekleniyor..." : "Ekstraları Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
