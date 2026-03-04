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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SysAdminPricingPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [search, setSearch] = useState("");

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const { data: rows = [], isLoading } = useQuery<CabanaRow[]>({
    queryKey: ["cabana-daily-prices"],
    queryFn: async () => {
      const res = await fetch("/api/pricing/cabana-daily-prices");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
  });
  // ── Filtreler ──
  const classNames = useMemo(
    () => [...new Set(rows.map((r) => r.className))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (filterClass) list = list.filter((r) => r.className === filterClass);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.conceptName ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, filterClass, search]);

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-400">
          Cabana Fiyatlandırma
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Cabana günlük fiyatları konsept ürünleri + hizmet bedelinden otomatik
          hesaplanır.
        </p>
      </div>

      <div className="bg-neutral-900 rounded-lg p-4 sm:p-6 space-y-4">
        {/* Filtre */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Cabana veya konsept ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 w-56 min-h-[40px]"
          />
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 min-h-[40px]"
          >
            <option value="">Tüm Sınıflar</option>
            {classNames.map((cn) => (
              <option key={cn} value={cn}>
                {cn}
              </option>
            ))}
          </select>
        </div>

        {/* İstatistik */}
        <div className="flex gap-4 text-xs text-neutral-500">
          <span>
            Toplam:{" "}
            <span className="text-neutral-300 font-medium">
              {filtered.length}
            </span>
          </span>
        </div>

        {/* Tablo */}
        {isLoading ? (
          <div className="text-center py-12 text-neutral-500">
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            Cabana bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 text-left text-neutral-400">
                  <th className="py-3 px-3 font-medium">Cabana</th>
                  <th className="py-3 px-3 font-medium hidden sm:table-cell">
                    Sınıf
                  </th>
                  <th className="py-3 px-3 font-medium hidden md:table-cell">
                    Konsept
                  </th>
                  <th className="py-3 px-3 font-medium text-right">
                    Hesaplanan Fiyat
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isExpanded = expandedId === row.id;

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-neutral-800 hover:bg-neutral-800/40 transition-colors group"
                    >
                      {/* Cabana Adı */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : row.id)
                          }
                          className="text-left font-medium text-neutral-100 hover:text-amber-400 transition-colors"
                          title="Detayı göster/gizle"
                        >
                          {row.name}
                          {row.breakdown.products.length > 0 && (
                            <span className="ml-1.5 text-[10px] text-neutral-500">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          )}
                        </button>
                        {/* Mobil: sınıf + konsept */}
                        <div className="sm:hidden text-xs text-neutral-500 mt-0.5">
                          {row.className}
                          {row.conceptName && ` · ${row.conceptName}`}
                        </div>
                        {/* Breakdown */}
                        {isExpanded && row.breakdown.products.length > 0 && (
                          <div className="mt-2 ml-2 space-y-1 text-xs">
                            {row.breakdown.products.map((p) => (
                              <div
                                key={p.productId}
                                className="flex items-center justify-between gap-4 text-neutral-400"
                              >
                                <span>{p.productName}</span>
                                <span className="text-neutral-500 whitespace-nowrap">
                                  {p.quantity}×
                                  {formatPrice(p.unitPrice, currency)} ={" "}
                                  <span className="text-neutral-300">
                                    {formatPrice(p.total, currency)}
                                  </span>
                                </span>
                              </div>
                            ))}
                            {row.breakdown.serviceFee > 0 && (
                              <div className="flex items-center justify-between gap-4 text-neutral-400 pt-1 border-t border-neutral-700/30">
                                <span>Hizmet Bedeli</span>
                                <span className="text-neutral-300">
                                  {formatPrice(
                                    row.breakdown.serviceFee,
                                    currency,
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Sınıf */}
                      <td className="py-3 px-3 text-neutral-400 hidden sm:table-cell">
                        {row.className}
                      </td>

                      {/* Konsept */}
                      <td className="py-3 px-3 text-neutral-400 hidden md:table-cell">
                        {row.conceptName ?? (
                          <span className="text-neutral-600 italic">—</span>
                        )}
                      </td>

                      {/* Hesaplanan Fiyat */}
                      <td className="py-3 px-3 text-right">
                        {row.calculatedDaily > 0 ? (
                          <span className="text-emerald-400 font-medium">
                            {formatPrice(row.calculatedDaily, currency)}
                          </span>
                        ) : (
                          <span className="text-neutral-600 italic text-xs">
                            Konsept yok
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
