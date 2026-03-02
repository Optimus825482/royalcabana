"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchSystemCurrency,
    formatPrice,
    currencySymbol,
    type CurrencyCode,
    DEFAULT_CURRENCY,
} from "@/lib/currency";
import type { PriceBreakdown } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cabana {
    id: string;
    name: string;
    conceptId?: string | null;
    cabanaClass?: { name: string };
}

interface Concept {
    id: string;
    name: string;
    products: { product: { id: string; name: string; salePrice: number } }[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
            className={`px-5 py-2.5 min-h-[44px] text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${active
                    ? "bg-neutral-800 text-amber-400 border-b-2 border-amber-400"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
        >
            {children}
        </button>
    );
}

// ─── Tab 1: Kabana Fiyatları (Salt Okunur) ────────────────────────────────────

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

    const loadPrices = useCallback(async () => {
        if (!selectedCabana || !month) return;
        const res = await fetch(
            `/api/pricing/cabana-prices?cabanaId=${selectedCabana}&month=${month}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const p of data.prices as CabanaPrice[]) {
            const d = new Date(p.date);
            const key = formatDate(
                d.getUTCFullYear(),
                d.getUTCMonth() + 1,
                d.getUTCDate(),
            );
            map[key] = String(p.dailyPrice);
        }
        setPrices(map);
    }, [selectedCabana, month]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadPrices();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadPrices]);

    const [year, m] = month.split("-").map(Number);
    const days = getDaysInMonth(year, m);
    const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

    return (
        <div className="space-y-6">
            <div className="flex gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                    <label htmlFor="readonly-cabana-select" className="text-xs text-neutral-400">Kabana</label>
                    <select
                        id="readonly-cabana-select"
                        value={selectedCabana}
                        onChange={(e) => {
                            setSelectedCabana(e.target.value);
                            setPrices({});
                        }}
                        className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-w-[200px] min-h-[44px]"
                    >
                        <option value="">Kabana seçin</option>
                        {cabanas.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.cabanaClass ? `(${c.cabanaClass.name})` : ""}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="readonly-month-input" className="text-xs text-neutral-400">Ay</label>
                    <input
                        id="readonly-month-input"
                        type="month"
                        value={month}
                        onChange={(e) => {
                            setMonth(e.target.value);
                            setPrices({});
                        }}
                        className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-h-[44px]"
                    />
                </div>
            </div>

            {selectedCabana && (
                <div className="overflow-x-auto">
                    <div className="grid grid-cols-7 gap-1 min-w-[600px]">
                        {dayNames.map((d) => (
                            <div
                                key={d}
                                className="text-xs text-center text-neutral-500 font-medium py-1"
                            >
                                {d}
                            </div>
                        ))}
                        {/* Empty cells for first day offset */}
                        {Array.from({
                            length: (new Date(year, m - 1, 1).getDay() + 6) % 7,
                        }).map((_, i) => (
                            <div key={`e-${i}`} />
                        ))}
                        {Array.from({ length: days }).map((_, i) => {
                            const day = i + 1;
                            const key = formatDate(year, m, day);
                            const val = prices[key];
                            return (
                                <div
                                    key={day}
                                    className={`border rounded p-2 text-center ${val
                                            ? "border-neutral-700 bg-neutral-800"
                                            : "border-neutral-800 bg-neutral-900/50"
                                        }`}
                                >
                                    <div className="text-xs text-neutral-500 mb-1">{day}</div>
                                    {val ? (
                                        <div className="text-sm text-amber-400 font-medium">
                                            {formatPrice(parseFloat(val), currency)}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-neutral-600">—</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Tab 2: Konsept Fiyatları (Salt Okunur) ───────────────────────────────────

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

    const concept = concepts.find((c) => c.id === selectedConcept);

    const loadConceptPrices = useCallback(async () => {
        if (!selectedConcept) return;
        const res = await fetch(
            `/api/pricing/concept-prices?conceptId=${selectedConcept}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const p of data.prices as ConceptPrice[]) {
            if (p.productId) map[p.productId] = String(p.price);
        }
        setConceptPrices(map);
    }, [selectedConcept]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadConceptPrices();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadConceptPrices]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 max-w-xs">
                <label htmlFor="readonly-concept-select" className="text-xs text-neutral-400">Konsept</label>
                <select
                    id="readonly-concept-select"
                    value={selectedConcept}
                    onChange={(e) => {
                        setSelectedConcept(e.target.value);
                        setConceptPrices({});
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
                <div className="space-y-2">
                    {concept.products.map(({ product }) => {
                        const conceptPrice = conceptPrices[product.id];
                        return (
                            <div
                                key={product.id}
                                className="flex items-center gap-4 bg-neutral-800 rounded px-4 py-3"
                            >
                                <span className="flex-1 text-sm text-neutral-200">
                                    {product.name}
                                </span>
                                <span className="text-xs text-neutral-500">
                                    Genel: {formatPrice(product.salePrice, currency)}
                                </span>
                                {conceptPrice ? (
                                    <span className="text-sm text-amber-400 font-medium min-w-[100px] text-right">
                                        {formatPrice(parseFloat(conceptPrice), currency)}
                                    </span>
                                ) : (
                                    <span className="text-xs text-neutral-600 min-w-[100px] text-right">
                                        Fiyat girilmemiş
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
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
    const sym = currencySymbol(currency);

    const handleCalculate = async () => {
        if (!form.cabanaId || !form.startDate || !form.endDate) {
            setError("Kabana, başlangıç ve bitiş tarihi zorunludur.");
            return;
        }
        setLoading(true);
        setError("");
        setBreakdown(null);
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
        setLoading(false);
        if (!res.ok) {
            setError("Hesaplama başarısız.");
            return;
        }
        setBreakdown(await res.json());
    };

    const sourceLabel: Record<string, string> = {
        CABANA_SPECIFIC: "Kabana Özel",
        CONCEPT_SPECIFIC: "Konsept Özel",
        GENERAL: "Genel",
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                    <label htmlFor="calc-cabana-select" className="text-xs text-neutral-400">Kabana</label>
                    <select
                        id="calc-cabana-select"
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
                    <label htmlFor="calc-concept-select" className="text-xs text-neutral-400">
                        Konsept (opsiyonel)
                    </label>
                    <select
                        id="calc-concept-select"
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
                    <label htmlFor="calc-start-date" className="text-xs text-neutral-400">Başlangıç</label>
                    <input
                        id="calc-start-date"
                        type="date"
                        value={form.startDate}
                        onChange={(e) =>
                            setForm((p) => ({ ...p, startDate: e.target.value }))
                        }
                        className="bg-neutral-800 border border-neutral-700 rounded px-4 py-3 text-base sm:text-sm text-neutral-100 min-h-[44px]"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="calc-end-date" className="text-xs text-neutral-400">Bitiş</label>
                    <input
                        id="calc-end-date"
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
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-semibold px-5 py-2 min-h-[44px] rounded text-sm transition-colors"
                    >
                        {loading ? "Hesaplanıyor..." : "Hesapla"}
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {breakdown && (
                <div className="space-y-4">
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
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-neutral-400 border-b border-neutral-700">
                                <th className="pb-2 font-medium">Kalem</th>
                                <th className="pb-2 font-medium text-right">Miktar</th>
                                <th className="pb-2 font-medium text-right">Birim Fiyat</th>
                                <th className="pb-2 font-medium text-right">Toplam</th>
                                <th className="pb-2 font-medium text-right">Kaynak</th>
                            </tr>
                        </thead>
                        <tbody>
                            {breakdown.items.map((item, i) => (
                                <tr key={i} className="border-b border-neutral-800">
                                    <td className="py-2 text-neutral-200">{item.name}</td>
                                    <td className="py-2 text-right text-neutral-300">
                                        {item.quantity}
                                    </td>
                                    <td className="py-2 text-right text-neutral-300">
                                        {item.unitPrice.toFixed(2)} {sym}
                                    </td>
                                    <td className="py-2 text-right text-neutral-200">
                                        {item.total.toFixed(2)} {sym}
                                    </td>
                                    <td className="py-2 text-right">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${item.source === "CABANA_SPECIFIC"
                                                    ? "bg-amber-900 text-amber-300"
                                                    : item.source === "CONCEPT_SPECIFIC"
                                                        ? "bg-blue-900 text-blue-300"
                                                        : "bg-neutral-700 text-neutral-400"
                                                }`}
                                        >
                                            {sourceLabel[item.source]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <div className="bg-neutral-800 rounded-lg px-6 py-4 text-right space-y-1">
                            {breakdown.days > 0 && (
                                <div className="text-xs text-neutral-500 mb-1">
                                    Kullanım: {breakdown.days} gün
                                </div>
                            )}
                            <div className="text-xs text-neutral-400">
                                Kabana ({breakdown.days} gün): {breakdown.cabanaDaily.toFixed(2)} {sym}
                            </div>
                            <div className="text-xs text-neutral-400">
                                Konsept ({breakdown.days} gün): {breakdown.conceptTotal.toFixed(2)} {sym}
                            </div>
                            <div className="text-xs text-neutral-400">
                                Ekstralar: {breakdown.extrasTotal.toFixed(2)} {sym}
                            </div>
                            <div className="text-lg font-bold text-amber-400 border-t border-neutral-700 pt-2 mt-2">
                                Toplam: {breakdown.grandTotal.toFixed(2)} {sym}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SysAdminPricingPage() {
    const [tab, setTab] = useState<"cabana" | "concept" | "preview">("cabana");

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
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-amber-400">
                    Fiyatlandırma Görünümü
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Kabana günlük fiyatları, konsept fiyatları ve fiyat hesaplama
                </p>
            </div>

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
            </div>
        </div>
    );
}
