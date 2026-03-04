"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSystemCurrency,
  formatPrice,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CabanaRow {
  id: string;
  name: string;
  className: string;
  classId: string;
  conceptId: string | null;
  conceptName: string | null;
  calculatedDaily: number;
  breakdown: {
    conceptProductsTotal: number;
    serviceFee: number;
    products: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[];
  };
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchCabanaRows(): Promise<CabanaRow[]> {
  const res = await fetch("/api/pricing/cabana-daily-prices");
  if (!res.ok) throw new Error("Fiyat verileri yüklenemedi");
  const json = await res.json();
  const resolved = json.data ?? json;
  return Array.isArray(resolved) ? resolved : [];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
    staleTime: 5 * 60_000,
  });

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery<CabanaRow[]>({
    queryKey: ["cabana-daily-prices"],
    queryFn: fetchCabanaRows,
    staleTime: 60_000,
  });

  // Unique class names for filter
  const classNames = useMemo(() => {
    const set = new Set(rows.map((r) => r.className));
    return Array.from(set).sort();
  }, [rows]);

  const [classFilter, setClassFilter] = useState("");

  const filtered = useMemo(() => {
    let result = rows;
    if (classFilter) {
      result = result.filter((r) => r.classId === classFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.className.toLowerCase().includes(q) ||
          (r.conceptName ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, classFilter, search]);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">
            Fiyatlandırma Özeti
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Cabana günlük fiyatları konsept ürünlerinden otomatik hesaplanır.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cabana veya konsept ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 min-w-[220px] focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded px-4 py-2 text-sm text-neutral-100 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Tüm Sınıflar</option>
          {classNames.map((cn) => {
            const row = rows.find((r) => r.className === cn);
            return (
              <option key={row?.classId ?? cn} value={row?.classId ?? ""}>
                {cn}
              </option>
            );
          })}
        </select>
        {(search || classFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setClassFilter("");
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-2"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="text-center py-12 text-neutral-400">
          Fiyatlar yükleniyor...
        </div>
      )}
      {isError && (
        <div className="text-center py-12 text-red-400">
          {(error as Error)?.message ?? "Veriler yüklenirken hata oluştu."}
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-800/60 text-left text-neutral-400">
                <th className="px-4 py-3 font-medium">Cabana</th>
                <th className="px-4 py-3 font-medium">Sınıf</th>
                <th className="px-4 py-3 font-medium">Konsept</th>
                <th className="px-4 py-3 font-medium text-right">
                  Hesaplanan Fiyat
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    Sonuç bulunamadı.
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <RowWithBreakdown
                    key={row.id}
                    row={row}
                    currency={currency}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(row.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {!isLoading && !isError && filtered.length > 0 && (
        <p className="text-xs text-neutral-500 text-right">
          {filtered.length} Cabana gösteriliyor
        </p>
      )}
    </div>
  );
}

// ─── Row with expandable breakdown ───────────────────────────────────────────

function RowWithBreakdown({
  row,
  currency,
  isExpanded,
  onToggle,
}: {
  row: CabanaRow;
  currency: CurrencyCode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { breakdown } = row;
  const products = breakdown?.products ?? [];
  const hasProducts = products.length > 0;

  return (
    <>
      <tr
        className={`border-b border-neutral-800 hover:bg-neutral-800/40 transition-colors ${
          isExpanded ? "bg-neutral-800/30" : ""
        }`}
      >
        <td className="px-4 py-3">
          <button
            onClick={onToggle}
            disabled={!hasProducts}
            className={`text-left font-medium ${
              hasProducts
                ? "text-amber-400 hover:text-amber-300 cursor-pointer"
                : "text-neutral-200 cursor-default"
            }`}
          >
            {hasProducts && (
              <span className="inline-block w-4 mr-1 text-xs text-neutral-500">
                {isExpanded ? "▼" : "▶"}
              </span>
            )}
            {row.name}
          </button>
        </td>
        <td className="px-4 py-3 text-neutral-300">{row.className}</td>
        <td className="px-4 py-3 text-neutral-300">
          {row.conceptName ?? (
            <span className="text-neutral-600 italic">Konsept yok</span>
          )}
        </td>
        <td className="px-4 py-3 text-right font-semibold text-neutral-100">
          {formatPrice(row.calculatedDaily, currency)}
        </td>
      </tr>

      {/* Expanded breakdown */}
      {isExpanded && hasProducts && (
        <tr className="bg-neutral-850">
          <td colSpan={4} className="px-4 py-3">
            <div className="ml-6 space-y-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-neutral-500">
                    <th className="text-left pb-1 font-medium">Ürün</th>
                    <th className="text-right pb-1 font-medium">Miktar</th>
                    <th className="text-right pb-1 font-medium">Birim Fiyat</th>
                    <th className="text-right pb-1 font-medium">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.productId}
                      className="border-b border-neutral-800/50"
                    >
                      <td className="py-1.5 text-neutral-300">
                        {p.productName}
                      </td>
                      <td className="py-1.5 text-right text-neutral-400">
                        {p.quantity}
                      </td>
                      <td className="py-1.5 text-right text-neutral-400">
                        {formatPrice(p.unitPrice, currency)}
                      </td>
                      <td className="py-1.5 text-right text-neutral-200 font-medium">
                        {formatPrice(p.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Breakdown summary */}
              <div className="flex justify-end gap-6 text-xs pt-1 border-t border-neutral-800">
                <span className="text-neutral-500">
                  Ürünler:{" "}
                  <span className="text-neutral-300">
                    {formatPrice(breakdown?.conceptProductsTotal ?? 0, currency)}
                  </span>
                </span>
                {(breakdown?.serviceFee ?? 0) > 0 && (
                    <span className="text-yellow-600">
                    Hizmet Ücreti:{" "}
                    <span className="text-yellow-500">
                      {formatPrice(breakdown?.serviceFee ?? 0, currency)}
                    </span>
                  </span>
                )}
                <span className="text-neutral-400 font-semibold">
                  Toplam:{" "}
                  <span className="text-amber-400">
                    {formatPrice(row.calculatedDaily, currency)}
                  </span>
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
