"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PriceBreakdown } from "@/types";
import {
  inputCls,
  cancelBtnCls,
  submitBtnCls,
  primaryBtnCls,
  dangerSoftBtnCls,
  editBtnCls,
  ghostBtnCls,
} from "@/components/shared/FormComponents";
import {
  formatPrice,
  currencySymbol,
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import PermissionGate from "@/components/shared/PermissionGate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cabana {
  id: string;
  name: string;
  conceptId?: string | null;
}

interface Concept {
  id: string;
  name: string;
  products: {
    product: {
      id: string;
      name: string;
      salePrice: number;
      group?: { name: string } | null;
    };
  }[];
}

interface CabanaPrice {
  id: string;
  cabanaId?: string;
  date: string;
  dailyPrice: number;
}

interface ConceptPrice {
  id: string;
  conceptId?: string;
  productId?: string | null;
  price: number;
  product?: { id: string; name: string; salePrice: number } | null;
}

interface CabanaPriceRange {
  id: string;
  cabanaId: string;
  startDate: string;
  endDate: string;
  dailyPrice: number;
  label: string | null;
  priority: number;
  cabana?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const SOURCE_LABEL: Record<string, string> = {
  CABANA_SPECIFIC: "Kabana Özel",
  CONCEPT_SPECIFIC: "Konsept Özel",
  GENERAL: "Genel",
};

/** 0=Sun 6=Sat — weekend check */
function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

function getDayName(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toLocaleDateString("tr-TR", {
    weekday: "short",
  });
}

const trDate = (dateStr: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));

// ─── Tab Button ───────────────────────────────────────────────────────────────

type TabKey = "cabana" | "concept" | "preview" | "ranges";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 min-h-[44px] text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
        active
          ? "bg-neutral-800 text-amber-400 border-b-2 border-amber-400"
          : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Tab 1: Kabana Fiyatları ──────────────────────────────────────────────────

function CabanaPricesTab({
  cabanas,
  currency,
}: {
  cabanas: Cabana[];
  currency: CurrencyCode;
}) {
  const [selectedCabana, setSelectedCabana] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [savedPrices, setSavedPrices] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [fillPrice, setFillPrice] = useState("");

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = month ? getDaysInMonth(year, mon) : 0;

  // Load prices via useQuery to avoid useEffect+setState
  useQuery({
    queryKey: ["cabana-prices-load", selectedCabana, month],
    queryFn: async () => {
      const res = await fetch(
        `/api/pricing/cabana-prices?cabanaId=${selectedCabana}&month=${month}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const map: Record<string, string> = {};
      const saved = new Set<string>();
      for (const p of (data.prices ?? data) as CabanaPrice[]) {
        const d = new Date(p.date);
        const key = formatDate(
          d.getUTCFullYear(),
          d.getUTCMonth() + 1,
          d.getUTCDate(),
        );
        map[key] = String(p.dailyPrice);
        saved.add(key);
      }
      setPrices(map);
      setSavedPrices(saved);
      setMessage("");
      return null;
    },
    enabled: !!selectedCabana && !!month,
  });

  // ── Fill helpers ──

  const fillAll = useCallback(
    (val: string) => {
      if (!val || !daysInMonth) return;
      setPrices((prev) => {
        const next = { ...prev };
        for (let d = 1; d <= daysInMonth; d++) {
          next[formatDate(year, mon, d)] = val;
        }
        return next;
      });
    },
    [year, mon, daysInMonth],
  );

  const fillWeekdays = useCallback(
    (val: string) => {
      if (!val || !daysInMonth) return;
      setPrices((prev) => {
        const next = { ...prev };
        for (let d = 1; d <= daysInMonth; d++) {
          if (!isWeekend(year, mon, d)) {
            next[formatDate(year, mon, d)] = val;
          }
        }
        return next;
      });
    },
    [year, mon, daysInMonth],
  );

  const fillWeekends = useCallback(
    (val: string) => {
      if (!val || !daysInMonth) return;
      setPrices((prev) => {
        const next = { ...prev };
        for (let d = 1; d <= daysInMonth; d++) {
          if (isWeekend(year, mon, d)) {
            next[formatDate(year, mon, d)] = val;
          }
        }
        return next;
      });
    },
    [year, mon, daysInMonth],
  );

  const clearAll = useCallback(() => {
    setPrices({});
  }, []);

  // ── Batch save ──

  const handleSave = async () => {
    if (!selectedCabana) return;
    setSaving(true);
    setMessage("");

    const entries = Array.from({ length: daysInMonth }, (_, i) => {
      const key = formatDate(year, mon, i + 1);
      return { date: key, dailyPrice: prices[key] };
    }).filter(
      (e): e is { date: string; dailyPrice: string } =>
        e.dailyPrice !== undefined && e.dailyPrice !== "",
    );

    if (entries.length === 0) {
      setMessage("Kaydedilecek fiyat yok.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/pricing/cabana-prices/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabanaId: selectedCabana,
          prices: entries.map((e) => ({
            date: e.date,
            dailyPrice: parseFloat(e.dailyPrice),
          })),
        }),
      });
      if (res.ok) {
        setMessage("Fiyatlar kaydedildi.");
        // Refresh saved state
        const newSaved = new Set<string>();
        for (const e of entries) newSaved.add(e.date);
        setSavedPrices(newSaved);
      } else {
        const err = await res.json().catch(() => null);
        setMessage(err?.error ?? "Kayıt sırasında hata oluştu.");
      }
    } catch {
      setMessage("Kayıt sırasında hata oluştu.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Kabana</label>
          <select
            value={selectedCabana}
            onChange={(e) => {
              setSelectedCabana(e.target.value);
              setPrices({});
              setSavedPrices(new Set());
            }}
            className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-w-[180px] min-h-[44px]"
          >
            <option value="">Kabana seçin</option>
            {cabanas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Ay</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-h-[44px]"
          />
        </div>
      </div>

      {selectedCabana && month && daysInMonth > 0 && (
        <>
          {/* Batch fill controls */}
          <div className="flex items-center gap-3 flex-wrap p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={`Fiyat (${currencySymbol(currency)})`}
              value={fillPrice}
              onChange={(e) => setFillPrice(e.target.value)}
              className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-sm text-neutral-100 w-32 min-h-[44px]"
            />
            <button
              onClick={() => fillAll(fillPrice)}
              disabled={!fillPrice}
              className={ghostBtnCls}
            >
              Tümüne Uygula
            </button>
            <button
              onClick={() => fillWeekdays(fillPrice)}
              disabled={!fillPrice}
              className={ghostBtnCls}
            >
              Hafta İçi
            </button>
            <button
              onClick={() => fillWeekends(fillPrice)}
              disabled={!fillPrice}
              className={ghostBtnCls}
            >
              Hafta Sonu
            </button>
            <button onClick={clearAll} className={dangerSoftBtnCls}>
              Temizle
            </button>
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const key = formatDate(year, mon, day);
              const weekend = isWeekend(year, mon, day);
              const hasSaved = savedPrices.has(key);
              const currentVal = prices[key] ?? "";
              const isNew = currentVal !== "" && !hasSaved;

              return (
                <div key={key} className="flex flex-col gap-1">
                  <span
                    className={`text-xs text-center ${weekend ? "text-amber-500 font-medium" : "text-neutral-500"}`}
                  >
                    {day} {getDayName(year, mon, day)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={currentVal}
                    onChange={(e) =>
                      setPrices((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className={`bg-neutral-800 border rounded px-2 py-1.5 text-sm text-neutral-100 text-center w-full min-h-[40px] transition-colors ${
                      isNew
                        ? "border-emerald-600/60 bg-emerald-950/20"
                        : hasSaved
                          ? "border-amber-700/40 bg-amber-950/10"
                          : "border-neutral-700"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-amber-700/40 bg-amber-950/10 inline-block" />
              Kayıtlı
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-emerald-600/60 bg-emerald-950/20 inline-block" />
              Yeni
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-neutral-700 inline-block" />
              Boş
            </span>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4">
            <PermissionGate permission="pricing.update">
              <button
                onClick={handleSave}
                disabled={saving}
                className={primaryBtnCls}
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </PermissionGate>
            {message && (
              <span
                className={`text-sm ${message.includes("hata") || message.includes("yok") ? "text-red-400" : "text-green-400"}`}
              >
                {message}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Konsept Fiyatları ─────────────────────────────────────────────────

function ConceptPricesTab({
  concepts,
  currency,
}: {
  concepts: Concept[];
  currency: CurrencyCode;
}) {
  const [selectedConcept, setSelectedConcept] = useState("");
  const [conceptPrices, setConceptPrices] = useState<Record<string, string>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const concept = concepts.find((c) => c.id === selectedConcept);

  // Load concept prices via useQuery to avoid useEffect+setState
  useQuery({
    queryKey: ["concept-prices-load", selectedConcept],
    queryFn: async () => {
      const res = await fetch(
        `/api/pricing/concept-prices?conceptId=${selectedConcept}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const p of (data.prices ?? data) as ConceptPrice[]) {
        if (p.productId) map[p.productId] = String(p.price);
      }
      setConceptPrices(map);
      return null;
    },
    enabled: !!selectedConcept,
  });

  // Group products by ProductGroup
  const groupedProducts = useMemo(() => {
    if (!concept) return [];
    const groups = new Map<
      string,
      { product: Concept["products"][number]["product"] }[]
    >();
    for (const cp of concept.products) {
      const groupName = cp.product.group?.name ?? "Diğer";
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName)!.push(cp);
    }
    return Array.from(groups.entries()).toSorted(([a], [b]) =>
      a === "Diğer" ? 1 : b === "Diğer" ? -1 : a.localeCompare(b, "tr"),
    );
  }, [concept]);

  // Concept summary
  const conceptSummary = useMemo(() => {
    if (!concept) return { total: 0, count: 0 };
    let total = 0;
    let count = 0;
    for (const cp of concept.products) {
      const customPrice = conceptPrices[cp.product.id];
      const price = customPrice
        ? parseFloat(customPrice)
        : cp.product.salePrice;
      if (!isNaN(price)) {
        total += price;
        count++;
      }
    }
    return { total, count };
  }, [concept, conceptPrices]);

  // Batch save
  const handleSave = async () => {
    if (!selectedConcept || !concept) return;
    setSaving(true);
    setMessage("");

    const entries = concept.products
      .map((cp) => ({
        productId: cp.product.id,
        val: conceptPrices[cp.product.id],
      }))
      .filter(
        (e): e is { productId: string; val: string } =>
          e.val !== undefined && e.val !== "",
      );

    if (entries.length === 0) {
      setMessage("Kaydedilecek fiyat yok.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/pricing/concept-prices/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: selectedConcept,
          prices: entries.map((e) => ({
            productId: e.productId,
            price: parseFloat(e.val),
          })),
        }),
      });
      if (res.ok) {
        setMessage("Fiyatlar kaydedildi.");
      } else {
        const err = await res.json().catch(() => null);
        setMessage(err?.error ?? "Kayıt sırasında hata oluştu.");
      }
    } catch {
      setMessage("Kayıt sırasında hata oluştu.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 max-w-xs">
        <label className="text-xs text-neutral-400">Konsept</label>
        <select
          value={selectedConcept}
          onChange={(e) => {
            setSelectedConcept(e.target.value);
            setConceptPrices({});
            setMessage("");
          }}
          className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-h-[44px]"
        >
          <option value="">Konsept seçin</option>
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {concept && concept.products.length > 0 && (
        <>
          <div className="space-y-5">
            {groupedProducts.map(([groupName, items]) => (
              <div key={groupName}>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">
                  {groupName}
                </h3>
                <div className="space-y-2">
                  {items.map(({ product }) => {
                    const customVal = conceptPrices[product.id];
                    const customNum = customVal ? parseFloat(customVal) : NaN;
                    const diff = !isNaN(customNum)
                      ? customNum - product.salePrice
                      : 0;
                    const diffPct =
                      !isNaN(customNum) && product.salePrice > 0
                        ? ((customNum - product.salePrice) /
                            product.salePrice) *
                          100
                        : 0;

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 bg-neutral-800 rounded px-4 py-3"
                      >
                        <span className="flex-1 text-sm text-neutral-200 min-w-0 truncate">
                          {product.name}
                        </span>
                        <span className="text-xs text-neutral-500 shrink-0">
                          Genel: {formatPrice(product.salePrice, currency)}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={String(product.salePrice)}
                          value={conceptPrices[product.id] ?? ""}
                          onChange={(e) =>
                            setConceptPrices((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                          className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-sm text-neutral-100 w-28 text-right min-h-[44px]"
                        />
                        <span className="text-xs text-neutral-500 w-6 shrink-0">
                          {currencySymbol(currency)}
                        </span>
                        {/* Diff indicator */}
                        {!isNaN(customNum) && diff !== 0 && (
                          <span
                            className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
                              diff < 0
                                ? "bg-emerald-950/50 text-emerald-400"
                                : "bg-red-950/50 text-red-400"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {diffPct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Concept summary */}
          <div className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-4 py-3 border border-neutral-700/50">
            <span className="text-sm text-neutral-400">
              Konsept Toplam ({conceptSummary.count} ürün)
            </span>
            <span className="text-base font-semibold text-amber-400">
              {formatPrice(conceptSummary.total, currency)}
            </span>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4">
            <PermissionGate permission="pricing.update">
              <button
                onClick={handleSave}
                disabled={saving}
                className={primaryBtnCls}
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </PermissionGate>
            {message && (
              <span
                className={`text-sm ${message.includes("hata") || message.includes("yok") ? "text-red-400" : "text-green-400"}`}
              >
                {message}
              </span>
            )}
          </div>
        </>
      )}

      {concept && concept.products.length === 0 && (
        <p className="text-sm text-neutral-500">Bu konsepte ürün eklenmemiş.</p>
      )}
    </div>
  );
}

// ─── Tab 3: Fiyat Önizleme ────────────────────────────────────────────────────

function PricePreviewTab({
  cabanas,
  concepts,
  currency,
}: {
  cabanas: Cabana[];
  concepts: Concept[];
  currency: CurrencyCode;
}) {
  const [form, setForm] = useState({
    cabanaId: "",
    conceptId: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [error, setError] = useState("");

  const handleCalculate = async () => {
    if (!form.cabanaId || !form.startDate || !form.endDate) {
      setError("Kabana, başlangıç ve bitiş tarihi zorunludur.");
      return;
    }
    setLoading(true);
    setError("");
    setBreakdown(null);
    try {
      const res = await fetch("/api/pricing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabanaId: form.cabanaId,
          conceptId: form.conceptId || null,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      if (!res.ok) {
        setError("Hesaplama başarısız.");
        return;
      }
      setBreakdown(await res.json());
    } catch {
      setError("Hesaplama sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Group items by source
  const groupedItems = useMemo(() => {
    if (!breakdown) return [];
    const groups = new Map<string, PriceBreakdown["items"]>();
    for (const item of breakdown.items) {
      const src = item.source;
      if (!groups.has(src)) groups.set(src, []);
      groups.get(src)!.push(item);
    }
    const order = ["CABANA_SPECIFIC", "CONCEPT_SPECIFIC", "GENERAL"];
    return order
      .filter((s) => groups.has(s))
      .map((s) => ({
        source: s,
        label: SOURCE_LABEL[s],
        items: groups.get(s)!,
      }));
  }, [breakdown]);

  // Detect serviceFee line
  const serviceFeeItem = breakdown?.items.find(
    (i) => i.name === "Konsept Hizmet Ücreti",
  );

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Kabana</label>
          <select
            value={form.cabanaId}
            onChange={(e) =>
              setForm((p) => ({ ...p, cabanaId: e.target.value }))
            }
            className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-w-[160px] min-h-[44px]"
          >
            <option value="">Seçin</option>
            {cabanas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">
            Konsept (opsiyonel)
          </label>
          <select
            value={form.conceptId}
            onChange={(e) =>
              setForm((p) => ({ ...p, conceptId: e.target.value }))
            }
            className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-w-[160px] min-h-[44px]"
          >
            <option value="">Yok</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Başlangıç</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, startDate: e.target.value }))
            }
            className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-h-[44px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Bitiş</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, endDate: e.target.value }))
            }
            className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-h-[44px]"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleCalculate}
            disabled={loading}
            className={primaryBtnCls}
          >
            {loading ? "Hesaplanıyor..." : "Hesapla"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {breakdown && (
        <div className="space-y-4 print:text-black" id="price-breakdown">
          {/* Day badge */}
          {breakdown.days > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-amber-900/50 text-amber-300 px-3 py-1 rounded-full font-medium">
                {breakdown.days} gün
              </span>
              <span className="text-neutral-500">
                ({form.startDate} → {form.endDate})
              </span>
            </div>
          )}

          {/* Grouped breakdown table */}
          {groupedItems.map(({ source, label, items }) => (
            <div key={source}>
              <h3
                className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${
                  source === "CABANA_SPECIFIC"
                    ? "text-amber-400"
                    : source === "CONCEPT_SPECIFIC"
                      ? "text-blue-400"
                      : "text-neutral-400"
                }`}
              >
                {label}
              </h3>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-left text-neutral-400 border-b border-neutral-700">
                    <th className="pb-2 font-medium">Kalem</th>
                    <th className="pb-2 font-medium text-right">Miktar</th>
                    <th className="pb-2 font-medium text-right">Birim Fiyat</th>
                    <th className="pb-2 font-medium text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const isServiceFee = item.name === "Konsept Hizmet Ücreti";
                    return (
                      <tr
                        key={i}
                        className={`border-b border-neutral-800 ${isServiceFee ? "bg-yellow-950/10" : ""}`}
                      >
                        <td className="py-2 text-neutral-200">
                          {item.name}
                          {isServiceFee && (
                            <span className="ml-2 text-xs text-yellow-500">
                              (Hizmet Ücreti)
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right text-neutral-300">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-right text-neutral-300">
                          {formatPrice(item.unitPrice, currency)}
                        </td>
                        <td className="py-2 text-right text-neutral-200 font-medium">
                          {formatPrice(item.total, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Summary */}
          <div className="flex justify-end">
            <div className="bg-neutral-800 rounded-lg px-6 py-4 text-right space-y-1 min-w-[280px]">
              {breakdown.days > 0 && (
                <div className="text-xs text-neutral-500 mb-1">
                  Kullanım: {breakdown.days} gün
                </div>
              )}
              <div className="text-xs text-neutral-400">
                Kabana ({breakdown.days} gün):{" "}
                {formatPrice(breakdown.cabanaDaily, currency)}
              </div>
              <div className="text-xs text-neutral-400">
                Konsept ({breakdown.days} gün):{" "}
                {formatPrice(breakdown.conceptTotal, currency)}
              </div>
              {serviceFeeItem && (
                <div className="text-xs text-yellow-500">
                  Hizmet Ücreti: {formatPrice(serviceFeeItem.total, currency)}
                </div>
              )}
              <div className="text-xs text-neutral-400">
                Ekstralar: {formatPrice(breakdown.extrasTotal, currency)}
              </div>
              <div className="text-lg font-bold text-amber-400 border-t border-neutral-700 pt-2 mt-2">
                Toplam: {formatPrice(breakdown.grandTotal, currency)}
              </div>
            </div>
          </div>

          {/* Print button */}
          <div className="flex justify-end print:hidden">
            <button onClick={handlePrint} className={ghostBtnCls}>
              🖨️ Yazdır
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Sezonluk Fiyatlar (Price Ranges) ─────────────────────────────────

function PriceRangesTab({
  cabanas,
  currency,
}: {
  cabanas: Cabana[];
  currency: CurrencyCode;
}) {
  const queryClient = useQueryClient();
  const [selectedCabana, setSelectedCabana] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    dailyPrice: "",
    label: "",
    priority: "0",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: ranges = [], isLoading } = useQuery<CabanaPriceRange[]>({
    queryKey: ["cabana-price-ranges-tab", selectedCabana],
    queryFn: async () => {
      if (!selectedCabana) return [];
      const params = new URLSearchParams({ cabanaId: selectedCabana });
      const res = await fetch(`/api/pricing/cabana-price-ranges?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.priceRanges ?? data;
    },
    enabled: !!selectedCabana,
  });

  const resetForm = () => {
    setFormData({
      startDate: "",
      endDate: "",
      dailyPrice: "",
      label: "",
      priority: "0",
    });
    setEditingId(null);
    setShowForm(false);
    setMessage("");
  };

  const openEdit = (range: CabanaPriceRange) => {
    setEditingId(range.id);
    setFormData({
      startDate: range.startDate.slice(0, 10),
      endDate: range.endDate.slice(0, 10),
      dailyPrice: String(range.dailyPrice),
      label: range.label ?? "",
      priority: String(range.priority),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (
      !selectedCabana ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.dailyPrice
    ) {
      setMessage("Tüm zorunlu alanları doldurun.");
      return;
    }
    setSaving(true);
    setMessage("");

    const payload = {
      cabanaId: selectedCabana,
      startDate: formData.startDate,
      endDate: formData.endDate,
      dailyPrice: parseFloat(formData.dailyPrice),
      label: formData.label || null,
      priority: parseInt(formData.priority, 10) || 0,
    };

    try {
      const url = editingId
        ? `/api/pricing/cabana-price-ranges/${editingId}`
        : "/api/pricing/cabana-price-ranges";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage(editingId ? "Güncellendi." : "Oluşturuldu.");
        queryClient.invalidateQueries({
          queryKey: ["cabana-price-ranges-tab", selectedCabana],
        });
        resetForm();
      } else {
        const err = await res.json().catch(() => null);
        setMessage(err?.error ?? err?.message ?? "İşlem başarısız.");
      }
    } catch {
      setMessage("İşlem sırasında hata oluştu.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/pricing/cabana-price-ranges/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        queryClient.invalidateQueries({
          queryKey: ["cabana-price-ranges-tab", selectedCabana],
        });
        setMessage("Silindi.");
      } else {
        setMessage("Silme başarısız.");
      }
    } catch {
      setMessage("Silme sırasında hata oluştu.");
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      {/* Cabana selector */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Kabana</label>
          <select
            value={selectedCabana}
            onChange={(e) => {
              setSelectedCabana(e.target.value);
              resetForm();
            }}
            className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-w-[180px] min-h-[44px]"
          >
            <option value="">Kabana seçin</option>
            {cabanas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {selectedCabana && (
          <PermissionGate permission="pricing.create">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className={primaryBtnCls}
            >
              + Yeni Aralık
            </button>
          </PermissionGate>
        )}
      </div>

      {message && (
        <span
          className={`text-sm ${message.includes("hata") || message.includes("başarısız") ? "text-red-400" : "text-green-400"}`}
        >
          {message}
        </span>
      )}

      {/* Inline form */}
      {showForm && selectedCabana && (
        <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-4 space-y-4">
          <h3 className="text-sm font-medium text-amber-400">
            {editingId ? "Aralık Düzenle" : "Yeni Fiyat Aralığı"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Başlangıç</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, startDate: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Bitiş</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, endDate: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">
                Günlük Fiyat ({currencySymbol(currency)})
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.dailyPrice}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, dailyPrice: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Etiket</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, label: e.target.value }))
                }
                className={inputCls}
                placeholder="Yaz Sezonu, Bayram vb."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Öncelik</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, priority: e.target.value }))
                }
                className={inputCls}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={submitBtnCls}
            >
              {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
            </button>
            <button onClick={resetForm} className={cancelBtnCls}>
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Ranges table */}
      {selectedCabana && (
        <>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Yükleniyor...</p>
          ) : ranges.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Bu kabana için fiyat aralığı bulunamadı.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-400 border-b border-neutral-700">
                      <th className="pb-2 font-medium">Başlangıç</th>
                      <th className="pb-2 font-medium">Bitiş</th>
                      <th className="pb-2 font-medium text-right">
                        Günlük Fiyat
                      </th>
                      <th className="pb-2 font-medium">Etiket</th>
                      <th className="pb-2 font-medium text-center">Öncelik</th>
                      <th className="pb-2 font-medium text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranges.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors"
                      >
                        <td className="py-2.5 text-neutral-300">
                          {trDate(r.startDate)}
                        </td>
                        <td className="py-2.5 text-neutral-300">
                          {trDate(r.endDate)}
                        </td>
                        <td className="py-2.5 text-right text-amber-400 font-medium">
                          {formatPrice(r.dailyPrice, currency)}
                        </td>
                        <td className="py-2.5">
                          {r.label ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/40">
                              {r.label}
                            </span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-neutral-400">
                          {r.priority}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <PermissionGate permission="pricing.update">
                              <button
                                onClick={() => openEdit(r)}
                                className={editBtnCls}
                              >
                                Düzenle
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="pricing.delete">
                              <button
                                onClick={() => handleDelete(r.id)}
                                disabled={deleting === r.id}
                                className={dangerSoftBtnCls}
                              >
                                {deleting === r.id ? "..." : "Sil"}
                              </button>
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {ranges.map((r) => (
                  <div
                    key={r.id}
                    className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-neutral-400">
                          {trDate(r.startDate)} – {trDate(r.endDate)}
                        </p>
                        {r.label && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/40 mt-1 inline-block">
                            {r.label}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-amber-400">
                        {formatPrice(r.dailyPrice, currency)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <PermissionGate permission="pricing.update">
                        <button
                          onClick={() => openEdit(r)}
                          className={`flex-1 ${editBtnCls}`}
                        >
                          Düzenle
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="pricing.delete">
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                          className={`flex-1 ${dangerSoftBtnCls}`}
                        >
                          {deleting === r.id ? "..." : "Sil"}
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [tab, setTab] = useState<TabKey>("cabana");

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const { data: cabanas = [] } = useQuery<Cabana[]>({
    queryKey: ["cabanas-pricing"],
    queryFn: async () => {
      const r = await fetch("/api/cabanas");
      const d = await r.json();
      return Array.isArray(d) ? d : (d.cabanas ?? []);
    },
  });

  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["concepts-pricing"],
    queryFn: async () => {
      const r = await fetch("/api/concepts");
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-amber-400 mb-6">
        Fiyatlandırma Yönetimi
      </h1>

      <div className="border-b border-neutral-800 mb-6 flex gap-1 overflow-x-auto">
        <TabButton active={tab === "cabana"} onClick={() => setTab("cabana")}>
          Kabana Fiyatları
        </TabButton>
        <TabButton active={tab === "concept"} onClick={() => setTab("concept")}>
          Konsept Fiyatları
        </TabButton>
        <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
          Fiyat Önizleme
        </TabButton>
        <TabButton active={tab === "ranges"} onClick={() => setTab("ranges")}>
          Sezonluk Fiyatlar
        </TabButton>
      </div>

      <div className="bg-neutral-900 rounded-lg p-4 sm:p-6">
        {tab === "cabana" && (
          <CabanaPricesTab cabanas={cabanas} currency={currency} />
        )}
        {tab === "concept" && (
          <ConceptPricesTab concepts={concepts} currency={currency} />
        )}
        {tab === "preview" && (
          <PricePreviewTab
            cabanas={cabanas}
            concepts={concepts}
            currency={currency}
          />
        )}
        {tab === "ranges" && (
          <PriceRangesTab cabanas={cabanas} currency={currency} />
        )}
      </div>
    </div>
  );
}
