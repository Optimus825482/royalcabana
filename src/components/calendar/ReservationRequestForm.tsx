"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface GuestSuggestion {
  id: string;
  name: string;
  phone: string | null;
  vipLevel: string;
  totalVisits: number;
  lastVisitAt: string | null;
}

interface GuestHistory {
  guest: {
    id: string;
    name: string;
    vipLevel: string;
    totalVisits: number;
    lastVisitAt: string | null;
    isBlacklisted: boolean;
  };
  reservations: Array<{
    id: string;
    cabanaName: string;
    conceptName: string | null;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
    totalPrice: number | null;
    hasExtras: boolean;
    extras: Array<{ productName: string; quantity: number; unitPrice: number }>;
  }>;
  summary: {
    totalVisits: number;
    totalSpent: number;
    favoriteCabana: string | null;
    favoriteConcept: string | null;
  };
}

interface AvailableProduct {
  id: string;
  name: string;
  salePrice: number;
  groupName: string | null;
}

interface ExtraSelection {
  productId: string;
  quantity: number;
}

interface CustomExtraRequest {
  id: string;
  customName: string;
  customDesc: string;
  quantity: number;
}

interface ReservationRequestFormProps {
  cabanaId: string;
  cabanaName: string;
  initialDate?: string;
  onSuccess: (reservation: unknown) => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { key: "guest", label: "Misafir & Tarih", icon: "👤" },
  { key: "customize", label: "Konsept & Ürünler", icon: "🎨" },
  { key: "summary", label: "Özet & Gönder", icon: "✓" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPriceVal(val: number) {
  return val.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// ─── Stepper Header ──────────────────────────────────────────────────────────

function StepperHeader({ currentStep }: { currentStep: number }) {
  return (
    <nav
      aria-label="Rezervasyon adımları"
      className="flex items-center justify-between px-1 mb-6"
    >
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <div
            key={step.key}
            className="flex items-center flex-1 last:flex-none"
          >
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isDone
                    ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20"
                    : isActive
                      ? "bg-amber-500/20 text-amber-400 border-2 border-amber-500 shadow-lg shadow-amber-500/10"
                      : "bg-neutral-800 text-neutral-600 border border-neutral-700"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium text-center leading-tight transition-colors ${
                  isActive
                    ? "text-amber-400"
                    : isDone
                      ? "text-amber-500/70"
                      : "text-neutral-600"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 mt-[-18px]">
                <div
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    isDone ? "bg-amber-500" : "bg-neutral-800"
                  }`}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReservationRequestForm({
  cabanaId,
  cabanaName,
  initialDate,
  onSuccess,
  onCancel,
}: ReservationRequestFormProps) {
  const today = new Date().toISOString().split("T")[0];

  // ── Stepper ──
  const [step, setStep] = useState(0);

  // ── Step 1: Guest & Date ──
  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(initialDate ?? today);
  const [endDate, setEndDate] = useState("");
  const [guestSuggestions, setGuestSuggestions] = useState<GuestSuggestion[]>(
    [],
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [guestHistory, setGuestHistory] = useState<GuestHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const guestSearchRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ── Step 2: Concept & Products ──
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(true);
  const [defaultConceptId, setDefaultConceptId] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<
    AvailableProduct[]
  >([]);
  const [selectedExtras, setSelectedExtras] = useState<ExtraSelection[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [customRequests, setCustomRequests] = useState("");
  const [customExtraRequests, setCustomExtraRequests] = useState<CustomExtraRequest[]>([]);

  // ── Step 3: Summary ──
  const [notes, setNotes] = useState("");
  const [isGuestPrivate, setIsGuestPrivate] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(
    null,
  );
  const [priceLoading, setPriceLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Shared ──
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  // ── Data Fetching (parallel on mount) ──
  useEffect(() => {
    Promise.all([
      fetch("/api/concepts")
        .then((r) => r.json())
        .then((json) => {
          const raw = json.data ?? json;
          setConcepts(Array.isArray(raw) ? raw : []);
        })
        .catch(() => setConcepts([])),
      fetch("/api/system/config/default_concept_id")
        .then((r) => r.json())
        .then((json) => {
          if (json.data?.value) setDefaultConceptId(json.data.value);
        })
        .catch(() => {}),
      fetch("/api/products?active=true")
        .then((r) => r.json())
        .then((json) => {
          const raw = json.data ?? json;
          const products = Array.isArray(raw) ? raw : [];
          setAvailableProducts(
            products.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: p.name as string,
              salePrice:
                typeof p.salePrice === "string"
                  ? parseFloat(p.salePrice)
                  : (p.salePrice as number),
              groupName:
                ((p.group as Record<string, unknown> | null)?.name as string) ??
                null,
            })),
          );
        })
        .catch(() => setAvailableProducts([])),
    ]).finally(() => {
      setConceptsLoading(false);
      setProductsLoading(false);
    });
  }, []);

  // Auto-select default concept
  useEffect(() => {
    if (!conceptId && defaultConceptId && concepts.length > 0) {
      const exists = concepts.find((c) => c.id === defaultConceptId);
      if (exists) setConceptId(defaultConceptId);
    }
  }, [concepts, defaultConceptId, conceptId]);

  // ── Guest Search ──
  const handleGuestNameChange = useCallback(
    (value: string) => {
      setGuestName(value);
      if (guestId) {
        setGuestId(null);
        setGuestHistory(null);
      }
      if (guestSearchRef.current) clearTimeout(guestSearchRef.current);
      if (value.trim().length < 2) {
        setGuestSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      guestSearchRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/guests/search?q=${encodeURIComponent(value.trim())}`,
          );
          if (res.ok) {
            const json = await res.json();
            setGuestSuggestions(json.data ?? []);
            setShowSuggestions((json.data ?? []).length > 0);
          }
        } catch {
          setGuestSuggestions([]);
        }
      }, 300);
    },
    [guestId],
  );

  const selectGuest = useCallback(async (guest: GuestSuggestion) => {
    setGuestName(guest.name);
    setGuestId(guest.id);
    setShowSuggestions(false);
    setGuestSuggestions([]);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/guests/${guest.id}/history`);
      if (res.ok) {
        const json = await res.json();
        setGuestHistory(json.data ?? null);
      }
    } catch {
      setGuestHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleGuestKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || guestSuggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < guestSuggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : guestSuggestions.length - 1,
        );
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        selectGuest(guestSuggestions[highlightedIndex]);
        setHighlightedIndex(-1);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    },
    [showSuggestions, guestSuggestions, highlightedIndex, selectGuest],
  );

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [guestSuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Price Preview ──
  const fetchPreview = useCallback(async () => {
    if (!startDate || !endDate || endDate < startDate) {
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
          extraItems: selectedExtras,
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
  }, [cabanaId, conceptId, startDate, endDate, selectedExtras]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPreview, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPreview]);

  // ── Derived ──
  const selectedConcept = concepts.find((c) => c.id === conceptId);
  const days = daysBetween(startDate, endDate);

  const extrasTotal = useMemo(() => {
    return selectedExtras.reduce((sum, e) => {
      const p = availableProducts.find((ap) => ap.id === e.productId);
      return sum + (p ? p.salePrice * e.quantity : 0);
    }, 0);
  }, [selectedExtras, availableProducts]);

  // ── Step Validation ──
  const guestNameError =
    touched.guestName && guestName.trim().length < 2
      ? "Misafir adı en az 2 karakter olmalıdır."
      : null;
  const dateError =
    touched.endDate && startDate && endDate && endDate < startDate
      ? "Bitiş tarihi başlangıç tarihinden önce olamaz."
      : null;
  const pastDateError =
    touched.startDate && startDate && startDate < today
      ? "Geçmiş tarihler için talep oluşturulamaz."
      : null;

  const canGoStep2 =
    guestName.trim().length >= 2 && startDate && endDate && endDate >= startDate;
  const canSubmit = canGoStep2;

  function nextStep() {
    setError(null);
    if (step === 0) {
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
      if (endDate < startDate) {
        setError("Bitiş tarihi başlangıç tarihinden önce olamaz.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  // ── Submit ──
  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const extraRequests = customExtraRequests
        .filter((r) => r.customName.trim())
        .map((r) => ({
          type: "CUSTOM" as const,
          customName: r.customName.trim(),
          customDesc: r.customDesc.trim() || null,
          quantity: r.quantity,
        }));

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabanaId,
          guestName,
          guestId: guestId || undefined,
          startDate,
          endDate,
          notes: notes || undefined,
          isGuestPrivate,
          conceptId: conceptId || undefined,
          extraItems: selectedExtras.length > 0 ? selectedExtras : undefined,
          customRequests: customRequests.trim() || undefined,
          extraRequests: extraRequests.length > 0 ? extraRequests : undefined,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const inputBase =
    "w-full px-3.5 py-2.5 text-sm bg-neutral-900/60 border border-neutral-700/60 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 focus:bg-neutral-900/80 transition-all duration-200";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/25 flex items-center justify-center">
            <span className="text-amber-400 text-sm">☀</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400 tracking-tight">{cabanaName}</p>
            <p className="text-[10px] text-neutral-500 tracking-wide uppercase">Yeni Rezervasyon Talebi</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
            aria-label="Kapat"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <StepperHeader currentStep={step} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-neutral-700/50 to-transparent flex-shrink-0" />

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto rc-scrollbar min-h-0 px-5 py-4">
        {/* ═══ STEP 1: Misafir & Tarih ═══ */}
        {step === 0 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Guest Search */}
            <div className="space-y-2 relative" ref={suggestionsRef}>
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Misafir
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-amber-500/60 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => handleGuestNameChange(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, guestName: true }))}
                  onKeyDown={handleGuestKeyDown}
                  onFocus={() => {
                    if (guestSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Misafir adı veya mevcut kayıt ara..."
                  className={`${inputBase} pl-10 pr-10`}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSuggestions && guestSuggestions.length > 0}
                  aria-controls="guest-suggestions-listbox"
                  aria-activedescendant={
                    highlightedIndex >= 0
                      ? `guest-option-${highlightedIndex}`
                      : undefined
                  }
                />
                {guestId && (
                  <button
                    type="button"
                    onClick={() => {
                      setGuestId(null);
                      setGuestName("");
                      setGuestHistory(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/50 text-xs transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
              {guestId && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] text-emerald-400 font-medium">
                    Kayıtlı misafir eşleştirildi
                  </p>
                </div>
              )}

              {guestNameError && (
                <p className="text-[10px] text-red-400 px-1">{guestNameError}</p>
              )}

              {/* Autocomplete Dropdown */}
              {showSuggestions && guestSuggestions.length > 0 && (
                <div
                  role="listbox"
                  id="guest-suggestions-listbox"
                  aria-label="Misafir önerileri"
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700/60 rounded-xl shadow-2xl shadow-black/50 max-h-48 overflow-y-auto rc-scrollbar backdrop-blur-xl"
                >
                  {guestSuggestions.map((g, idx) => (
                    <button
                      key={g.id}
                      id={`guest-option-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={guestId === g.id}
                      onClick={() => selectGuest(g)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 transition-all text-left border-b border-neutral-800/40 last:border-0 ${
                        idx === highlightedIndex
                          ? "bg-amber-500/10"
                          : "hover:bg-neutral-800/60"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600/25 to-amber-700/10 flex items-center justify-center flex-shrink-0 border border-amber-600/15">
                        <span className="text-xs font-bold text-amber-400">
                          {g.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-100 truncate">{g.name}</p>
                        <p className="text-[10px] text-neutral-500">
                          {g.totalVisits} ziyaret
                          {g.vipLevel !== "STANDARD" && (
                            <span className="text-amber-400 ml-1.5 font-medium">VIP {g.vipLevel}</span>
                          )}
                          {g.phone && <span className="ml-1.5 text-neutral-600">· {g.phone}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Guest History Card */}
            {historyLoading && (
              <div className="px-3.5 py-3 bg-neutral-800/30 border border-neutral-700/20 rounded-xl">
                <p className="text-xs text-neutral-500 animate-pulse">Misafir geçmişi yükleniyor...</p>
              </div>
            )}
            {guestHistory && !historyLoading && (
              <div className="rounded-xl border border-amber-600/15 bg-gradient-to-b from-amber-950/15 to-neutral-900/0 overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-amber-700/10 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider">Misafir Geçmişi</span>
                  {guestHistory.guest.vipLevel !== "STANDARD" && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-600/15 text-amber-300 border border-amber-600/20 font-medium">
                      VIP {guestHistory.guest.vipLevel}
                    </span>
                  )}
                </div>
                <div className="px-3.5 py-3 grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="text-neutral-500">Ziyaret</span>
                    <p className="text-neutral-200 font-semibold text-xs mt-0.5">
                      {guestHistory.summary.totalVisits}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Harcama</span>
                    <p className="text-neutral-200 font-semibold text-xs mt-0.5">
                      {formatPriceVal(guestHistory.summary.totalSpent)} ₺
                    </p>
                  </div>
                  {guestHistory.summary.favoriteCabana && (
                    <div>
                      <span className="text-neutral-500">Favori Cabana</span>
                      <p className="text-neutral-200 font-medium text-xs mt-0.5">
                        {guestHistory.summary.favoriteCabana}
                      </p>
                    </div>
                  )}
                  {guestHistory.summary.favoriteConcept && (
                    <div>
                      <span className="text-neutral-500">Favori Konsept</span>
                      <p className="text-neutral-200 font-medium text-xs mt-0.5">
                        {guestHistory.summary.favoriteConcept}
                      </p>
                    </div>
                  )}
                </div>
                {guestHistory.reservations.length > 0 && (
                  <div className="px-3.5 pb-3 space-y-1">
                    <p className="text-[9px] text-neutral-600 uppercase tracking-wider font-medium mb-1">Son Ziyaretler</p>
                    {guestHistory.reservations.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-[10px] bg-neutral-800/25 rounded-lg px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-300">{r.cabanaName}</span>
                          <span className="text-neutral-700">·</span>
                          <span className="text-neutral-500">{r.days} gün</span>
                          {r.conceptName && (
                            <>
                              <span className="text-neutral-700">·</span>
                              <span className="text-amber-400/50">{r.conceptName}</span>
                            </>
                          )}
                        </div>
                        <span className="text-neutral-600 tabular-nums">
                          {new Date(r.startDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {guestHistory.guest.isBlacklisted && (
                  <div className="px-3.5 py-2 bg-red-950/30 border-t border-red-800/20">
                    <p className="text-[10px] text-red-400 font-semibold">⚠ Bu misafir kara listede</p>
                  </div>
                )}
              </div>
            )}

            {/* Date Pickers */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Tarih
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-500 font-medium">Başlangıç</span>
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => setStartDate(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, startDate: true }))}
                    className={`${inputBase} ${pastDateError ? "!border-red-500/50" : ""}`}
                  />
                  {pastDateError && <p className="text-[10px] text-red-400">{pastDateError}</p>}
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-500 font-medium">Bitiş</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate ?? today}
                    onChange={(e) => setEndDate(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, endDate: true }))}
                    className={`${inputBase} ${dateError ? "!border-red-500/50" : ""}`}
                  />
                  {dateError && <p className="text-[10px] text-red-400">{dateError}</p>}
                </div>
              </div>
            </div>

            {startDate && endDate && endDate >= startDate && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <span className="text-xs text-amber-300/80 font-medium">
                  {days === 0 ? "Günübirlik kullanım" : `${days} gün`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: Konsept & Ürünler ═══ */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Concept Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Konsept
              </label>
              <div className="relative">
                <select
                  value={conceptId ?? ""}
                  onChange={(e) => setConceptId(e.target.value || null)}
                  disabled={conceptsLoading}
                  className={`${inputBase} appearance-none pr-10 cursor-pointer`}
                >
                  <option value="">Konsept Seçin (Standart otomatik atanır)</option>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
              {selectedConcept && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-neutral-800/30 border border-neutral-700/20 rounded-lg">
                  <span className="text-[11px] text-neutral-400 flex-1">{selectedConcept.description}</span>
                  <span className="text-[10px] text-amber-400/60 whitespace-nowrap font-medium">
                    {selectedConcept.products.length} ürün
                  </span>
                </div>
              )}
            </div>

            {/* Extra Products */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Ekstra Ürünler
                </label>
                {selectedExtras.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-semibold tabular-nums">
                    {selectedExtras.length} ürün · {formatPriceVal(extrasTotal)} ₺
                  </span>
                )}
              </div>
              {productsLoading ? (
                <div className="flex items-center gap-2 px-3 py-3">
                  <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-xs text-neutral-500">Ürünler yükleniyor...</p>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="px-3.5 py-3 bg-neutral-800/20 border border-neutral-700/20 rounded-xl text-center">
                  <p className="text-xs text-neutral-600">Eklenebilir ürün bulunamadı</p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto rc-scrollbar space-y-1 rounded-xl border border-neutral-700/20 bg-neutral-900/30 p-1.5">
                  {availableProducts.map((product) => {
                    const existing = selectedExtras.find((e) => e.productId === product.id);
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between gap-2 py-2 px-3 rounded-lg transition-all duration-200 ${
                          existing
                            ? "bg-amber-500/[0.06] border border-amber-500/15 shadow-sm shadow-amber-500/5"
                            : "hover:bg-neutral-800/50 border border-transparent"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs truncate ${existing ? "text-amber-200 font-medium" : "text-neutral-200"}`}>
                            {product.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 tabular-nums">
                            {formatPriceVal(product.salePrice)} ₺
                            {product.groupName && (
                              <span className="text-neutral-600 ml-1">· {product.groupName}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {existing ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedExtras((prev) =>
                                    prev.map((e) => e.productId === product.id ? { ...e, quantity: Math.max(0, e.quantity - 1) } : e).filter((e) => e.quantity > 0)
                                  )
                                }
                                className="w-7 h-7 rounded-md bg-neutral-800/80 text-neutral-400 text-xs flex items-center justify-center hover:bg-neutral-700 hover:text-neutral-200 transition-all"
                                aria-label={`${product.name} azalt`}
                              >−</button>
                              <span className="text-xs text-amber-400 w-6 text-center font-bold tabular-nums" aria-live="polite">
                                {existing.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedExtras((prev) =>
                                    prev.map((e) => e.productId === product.id ? { ...e, quantity: Math.min(e.quantity + 1, 99) } : e)
                                  )
                                }
                                className="w-7 h-7 rounded-md bg-neutral-800/80 text-neutral-400 text-xs flex items-center justify-center hover:bg-neutral-700 hover:text-neutral-200 transition-all"
                                aria-label={`${product.name} artır`}
                              >+</button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedExtras((prev) => [...prev, { productId: product.id, quantity: 1 }])}
                              className="px-3 py-1.5 text-[10px] rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all font-semibold"
                            >Ekle</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Extra Requests (Structured) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Liste Dışı Talepler
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCustomExtraRequests((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), customName: "", customDesc: "", quantity: 1 },
                    ])
                  }
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all font-semibold"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Yeni Talep
                </button>
              </div>

              {customExtraRequests.length === 0 ? (
                <p className="text-[10px] text-neutral-600 px-1 leading-relaxed">
                  Sistemde bulunmayan özel taleplerinizi buradan ekleyebilirsiniz.
                </p>
              ) : (
                <div className="space-y-2">
                  {customExtraRequests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-orange-500/15 bg-orange-950/[0.06] p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={req.customName}
                          onChange={(e) =>
                            setCustomExtraRequests((prev) =>
                              prev.map((r) => r.id === req.id ? { ...r, customName: e.target.value } : r)
                            )
                          }
                          placeholder="Talep adı"
                          className="flex-1 px-3 py-2 text-xs bg-neutral-900/60 border border-neutral-700/50 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                        <div className="flex items-center bg-neutral-800/50 rounded-lg border border-neutral-700/30">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomExtraRequests((prev) =>
                                prev.map((r) => r.id === req.id ? { ...r, quantity: Math.max(1, r.quantity - 1) } : r)
                              )
                            }
                            className="w-7 h-7 text-neutral-400 text-xs flex items-center justify-center hover:text-neutral-200 transition-colors"
                          >−</button>
                          <span className="text-xs text-amber-400 w-5 text-center font-bold tabular-nums">{req.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomExtraRequests((prev) =>
                                prev.map((r) => r.id === req.id ? { ...r, quantity: Math.min(99, r.quantity + 1) } : r)
                              )
                            }
                            className="w-7 h-7 text-neutral-400 text-xs flex items-center justify-center hover:text-neutral-200 transition-colors"
                          >+</button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomExtraRequests((prev) => prev.filter((r) => r.id !== req.id))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-950/30 transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                      <textarea
                        value={req.customDesc}
                        onChange={(e) =>
                          setCustomExtraRequests((prev) =>
                            prev.map((r) => r.id === req.id ? { ...r, customDesc: e.target.value } : r)
                          )
                        }
                        placeholder="Açıklama (isteğe bağlı)"
                        rows={1}
                        className="w-full px-3 py-1.5 text-[11px] bg-neutral-900/40 border border-neutral-700/30 rounded-lg text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-amber-500/40 transition-all resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              {customExtraRequests.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-1 rounded-full bg-orange-400/60" />
                  <p className="text-[10px] text-orange-400/70 leading-relaxed">
                    Admin onayına tabidir. Fiyatlandırma onay sonrası yapılır.
                  </p>
                </div>
              )}
            </div>

            {/* Legacy Custom Request (free text) */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Ek Notlar
              </label>
              <textarea
                value={customRequests}
                onChange={(e) => setCustomRequests(e.target.value)}
                placeholder="Genel notlar veya ek bilgiler..."
                rows={2}
                className={`${inputBase} resize-none`}
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Özet & Gönder ═══ */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Reservation Summary Card */}
            <div className="rounded-xl border border-neutral-700/30 overflow-hidden">
              <div className="px-4 py-2.5 bg-neutral-800/30 border-b border-neutral-700/20">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Rezervasyon Özeti</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Misafir</span>
                    <p className="text-sm text-neutral-100 font-medium mt-0.5">{guestName}</p>
                    {guestId && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                        <div className="w-1 h-1 rounded-full bg-emerald-400" />
                        Kayıtlı
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Cabana</span>
                    <p className="text-sm text-amber-400 font-medium mt-0.5">{cabanaName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Giriş</span>
                    <p className="text-sm text-neutral-100 font-medium mt-0.5 tabular-nums">
                      {new Date(startDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Çıkış</span>
                    <p className="text-sm text-neutral-100 font-medium mt-0.5 tabular-nums">
                      {endDate
                        ? new Date(endDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Süre</span>
                    <p className="text-sm text-neutral-100 font-medium mt-0.5">
                      {days === 0 ? "Günübirlik" : `${days} gün`}
                    </p>
                  </div>
                  {selectedConcept && (
                    <div>
                      <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Konsept</span>
                      <p className="text-sm text-neutral-100 font-medium mt-0.5">{selectedConcept.name}</p>
                    </div>
                  )}
                </div>

                {/* Selected Extras Summary */}
                {selectedExtras.length > 0 && (
                  <div className="pt-3 border-t border-neutral-800/50">
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-medium mb-2">Ekstra Ürünler</p>
                    <div className="space-y-1.5">
                      {selectedExtras.map((e) => {
                        const p = availableProducts.find((ap) => ap.id === e.productId);
                        if (!p) return null;
                        return (
                          <div key={e.productId} className="flex justify-between text-xs">
                            <span className="text-neutral-300">
                              {p.name} <span className="text-neutral-600 tabular-nums">×{e.quantity}</span>
                            </span>
                            <span className="text-neutral-400 tabular-nums font-medium">
                              {formatPriceVal(p.salePrice * e.quantity)} ₺
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Extra Requests Summary */}
                {customExtraRequests.filter((r) => r.customName.trim()).length > 0 && (
                  <div className="pt-3 border-t border-neutral-800/50">
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-medium mb-2">Liste Dışı Talepler</p>
                    <div className="space-y-1.5">
                      {customExtraRequests.filter((r) => r.customName.trim()).map((r) => (
                        <div key={r.id} className="flex justify-between items-center text-xs">
                          <span className="text-orange-300/80">
                            {r.customName} <span className="text-neutral-600 tabular-nums">×{r.quantity}</span>
                          </span>
                          <span className="text-[9px] text-orange-400/50 italic bg-orange-500/5 px-2 py-0.5 rounded-md">
                            Onay bekliyor
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Request Summary */}
                {customRequests.trim() && (
                  <div className="pt-3 border-t border-neutral-800/50">
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-medium mb-1">Ek Notlar</p>
                    <p className="text-xs text-neutral-400 leading-relaxed">{customRequests}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Price Breakdown */}
            {(priceLoading || priceBreakdown) && (
              <div className="rounded-xl border border-amber-500/15 bg-gradient-to-b from-amber-950/10 to-transparent overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Tahmini Fiyat
                  </span>
                  {priceLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                      <span className="text-neutral-500 text-xs">Hesaplanıyor...</span>
                    </div>
                  ) : priceBreakdown ? (
                    <span className="text-amber-400 font-bold text-lg tabular-nums">
                      {formatPriceVal(priceBreakdown.grandTotal)} ₺
                    </span>
                  ) : null}
                </div>
                {priceBreakdown && priceBreakdown.items.length > 0 && (
                  <div className="px-4 pb-3 space-y-1.5 border-t border-amber-500/10 pt-2.5">
                    {priceBreakdown.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-neutral-400">
                          {item.name} <span className="text-neutral-600 tabular-nums">×{item.quantity}</span>
                        </span>
                        <span className="text-neutral-300 tabular-nums">{formatPriceVal(item.total)} ₺</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-2 border-t border-amber-500/10">
                      <span className="text-neutral-200 font-semibold">Toplam</span>
                      <span className="text-amber-400 font-bold tabular-nums">{formatPriceVal(priceBreakdown.grandTotal)} ₺</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Notlar</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Özel istekler veya notlar..."
                rows={2}
                className={`${inputBase} resize-none`}
              />
            </div>

            {/* Privacy Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group p-3.5 rounded-xl border border-neutral-700/20 bg-neutral-800/10 hover:bg-neutral-800/30 transition-all">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isGuestPrivate}
                  onChange={(e) => setIsGuestPrivate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 rounded-full peer-checked:bg-amber-500/80 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-neutral-300 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-all shadow-sm" />
              </div>
              <div>
                <span className="text-xs text-neutral-300 font-medium">Misafir bilgileri gizli</span>
                <p className="text-[10px] text-neutral-600 mt-0.5 leading-relaxed">
                  Yalnızca Casino kullanıcıları görüntüleyebilir
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-5 mb-2 px-3.5 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="h-px bg-gradient-to-r from-transparent via-neutral-700/50 to-transparent flex-shrink-0" />
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <button
          type="button"
          onClick={step === 0 ? onCancel : prevStep}
          className="px-4 py-2.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800/40 hover:bg-neutral-800/70 border border-neutral-700/40 rounded-xl transition-all"
        >
          {step === 0 ? "İptal" : "← Geri"}
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={step === 0 && !canGoStep2}
            className="px-6 py-2.5 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-xl shadow-lg shadow-amber-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            İleri →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="px-6 py-2.5 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-xl shadow-lg shadow-amber-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
          >
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-neutral-900/30 border-t-neutral-900 rounded-full animate-spin" />
            )}
            {loading ? "Gönderiliyor..." : "Talep Oluştur"}
          </button>
        )}
      </div>
    </div>
  );
}
