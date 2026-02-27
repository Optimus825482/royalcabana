"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  InboxIcon,
} from "lucide-react";
import { Modal } from "@/components/shared/FormComponents";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PriceHistoryModalProps {
  product: { id: string; name: string } | null;
  onClose: () => void;
}

interface PriceRecord {
  id: string;
  createdAt: string;
  purchasePrice: number | null;
  salePrice: number | null;
  source: "MANUAL" | "IMPORT";
  changedByUser?: { id: string; username: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (v: number | null | undefined) =>
  v != null
    ? v.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })
    : "—";

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function PriceChange({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  if (current == null || previous == null)
    return <Minus className="w-3 h-3 text-neutral-600 inline" />;
  if (current > previous)
    return <TrendingUp className="w-3.5 h-3.5 text-red-400 inline" />;
  if (current < previous)
    return <TrendingDown className="w-3.5 h-3.5 text-emerald-400 inline" />;
  return <Minus className="w-3 h-3 text-neutral-600 inline" />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PriceHistoryModal({
  product,
  onClose,
}: PriceHistoryModalProps) {
  const { data, isLoading } = useQuery<PriceRecord[]>({
    queryKey: ["price-history", product?.id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product!.id}/price-history`);
      if (!res.ok) throw new Error("Fiyat geçmişi alınamadı.");
      return res.json();
    },
    enabled: !!product,
  });

  if (!product) return null;

  const records = data ?? [];

  return (
    <Modal title={`Fiyat Geçmişi — ${product.name}`} onClose={onClose}>
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && records.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <InboxIcon className="w-8 h-8 mx-auto text-neutral-600" />
          <p className="text-sm text-neutral-500">
            Henüz fiyat değişikliği kaydı yok.
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && records.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-800 -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-800/60 text-neutral-400">
                <th className="text-left px-3 py-2 font-medium">Tarih</th>
                <th className="text-right px-3 py-2 font-medium">Maliyet</th>
                <th className="text-right px-3 py-2 font-medium">
                  Satış Fiyatı
                </th>
                <th className="text-center px-3 py-2 font-medium">Kaynak</th>
                <th className="text-left px-3 py-2 font-medium">Değiştiren</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => {
                const prev = records[i + 1] ?? null;
                return (
                  <tr
                    key={rec.id}
                    className="border-t border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-neutral-300 whitespace-nowrap">
                      {fmtDate(rec.createdAt)}
                    </td>
                    <td className="text-right px-3 py-2 text-neutral-200 whitespace-nowrap">
                      <span className="mr-1">
                        <PriceChange
                          current={rec.purchasePrice}
                          previous={prev?.purchasePrice ?? null}
                        />
                      </span>
                      {fmt(rec.purchasePrice)}
                    </td>
                    <td className="text-right px-3 py-2 text-neutral-200 whitespace-nowrap">
                      <span className="mr-1">
                        <PriceChange
                          current={rec.salePrice}
                          previous={prev?.salePrice ?? null}
                        />
                      </span>
                      {fmt(rec.salePrice)}
                    </td>
                    <td className="text-center px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          rec.source === "MANUAL"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {rec.source === "MANUAL" ? "Manuel" : "İçe Aktarma"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-400">
                      {rec.changedByUser?.username || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
