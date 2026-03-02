"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ConceptProduct {
  product: { name: string; salePrice: number };
  quantity: number;
}

interface Concept {
  id: string;
  name: string;
  description: string;
  products: ConceptProduct[];
  serviceFee: number | string;
}

interface PriceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  source: string;
}

interface PriceBreakdown {
  days: number;
  cabanaDaily: number;
  conceptTotal: number;
  extrasTotal: number;
  grandTotal: number;
  items: PriceLineItem[];
}

interface ReservationRequestFormProps {
  cabanaId: string;
  cabanaName: string;
  initialDate?: string;
  onSuccess: (reservation: unknown) => void;
  onCancel: () => void;
}

export default function ReservationRequestForm({
  cabanaId,
  cabanaName,
  initialDate,
  onSuccess,
  onCancel,
}: ReservationRequestFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [guestName, setGuestName] = useState("");
  const [startDate, setStartDate] = useState(initialDate ?? today);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isGuestPrivate, setIsGuestPrivate] = useState(false);
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Concepts
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(true);

  // Price preview
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(
    null,
  );
  const [priceLoading, setPriceLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch concepts on mount
  useEffect(() => {
    fetch("/api/concepts")
      .then((r) => r.json())
      .then((data) => setConcepts(Array.isArray(data) ? data : []))
      .catch(() => setConcepts([]))
      .finally(() => setConceptsLoading(false));
  }, []);

  // Price preview with debounce
  const fetchPreview = useCallback(async () => {
    if (!startDate || !endDate || endDate <= startDate) {
      setPriceBreakdown(null);
      return;
    }
    setPriceLoading(true);
    try {
      const res = await fetch("/api/pricing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabanaId,
          conceptId: conceptId || null,
          startDate,
          endDate,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPriceBreakdown(data);
      } else {
        setPriceBreakdown(null);
      }
    } catch {
      setPriceBreakdown(null);
    } finally {
      setPriceLoading(false);
    }
  }, [cabanaId, conceptId, startDate, endDate]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPreview, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPreview]);

  const selectedConcept = concepts.find((c) => c.id === conceptId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!guestName.trim()) {
      setError("Misafir adı zorunludur.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Başlangıç ve bitiş tarihleri zorunludur.");
      return;
    }
    if (startDate < today) {
      setError("Geçmiş tarihler için talep oluşturulamaz.");
      return;
    }
    if (endDate <= startDate) {
      setError("Bitiş tarihi başlangıç tarihinden sonra olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabanaId,
          guestName,
          startDate,
          endDate,
          notes: notes || undefined,
          isGuestPrivate,
          conceptId: conceptId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Talep oluşturulamadı.");
        return;
      }
      onSuccess(data);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  function formatPriceVal(val: number) {
    return val.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs text-neutral-500 mb-1">Kabana</p>
        <p className="text-sm font-semibold text-yellow-400">{cabanaName}</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-400">Misafir Adı *</label>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Ad Soyad"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-yellow-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Başlangıç *</label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Bitiş *</label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-yellow-500"
          />
        </div>
      </div>

      {/* Konsept Seçimi */}
      <div className="space-y-1">
        <label className="text-xs text-neutral-400">Konsept</label>
        <select
          value={conceptId ?? ""}
          onChange={(e) => setConceptId(e.target.value || null)}
          disabled={conceptsLoading}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-yellow-500"
        >
          <option value="">Konsept Seçin (Opsiyonel)</option>
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedConcept && (
          <p className="text-[11px] text-neutral-500 mt-1">
            {selectedConcept.description} · {selectedConcept.products.length}{" "}
            ürün
          </p>
        )}
      </div>

      {/* Fiyat Önizleme */}
      {(priceLoading || priceBreakdown) && (
        <div className="rounded-xl border border-neutral-700/60 bg-neutral-800/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="text-neutral-400">Tahmini Fiyat</span>
            {priceLoading ? (
              <span className="text-neutral-500 text-xs">Hesaplanıyor...</span>
            ) : priceBreakdown ? (
              <span className="text-yellow-400 font-semibold">
                {formatPriceVal(priceBreakdown.grandTotal)} ₺
              </span>
            ) : null}
          </button>
          {showBreakdown &&
            priceBreakdown &&
            priceBreakdown.items.length > 0 && (
              <div className="px-4 pb-3 space-y-1.5 border-t border-neutral-700/40 pt-2">
                {priceBreakdown.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-neutral-400">
                      {item.name}{" "}
                      <span className="text-neutral-600">×{item.quantity}</span>
                    </span>
                    <span className="text-neutral-300">
                      {formatPriceVal(item.total)} ₺
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1.5 border-t border-neutral-700/30">
                  <span className="text-neutral-300 font-medium">Toplam</span>
                  <span className="text-yellow-400 font-semibold">
                    {formatPriceVal(priceBreakdown.grandTotal)} ₺
                  </span>
                </div>
              </div>
            )}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-neutral-400">Notlar</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Özel istekler veya notlar..."
          rows={2}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-yellow-500 resize-none"
        />
      </div>

      <label className="flex items-start gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={isGuestPrivate}
          onChange={(e) => setIsGuestPrivate(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0"
        />
        <span className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors leading-relaxed">
          Misafir bilgileri paylaşılmasın
          <br />
          <span className="text-neutral-600 text-[10px]">
            İşaretlenirse misafir bilgileri yalnızca Casino kullanıcıları
            tarafından görüntülenebilir.
          </span>
        </span>
      </label>

      {error && (
        <div className="px-3 py-2 bg-red-950/50 border border-red-800/40 text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm font-medium rounded-lg border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors"
        >
          {loading ? "Gönderiliyor..." : "Talep Oluştur"}
        </button>
      </div>
    </form>
  );
}
