"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
} from "lucide-react";

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

interface MinibarTypeOption {
  id: string;
  name: string;
  description: string | null;
  products: Array<{
    product: { id: string; name: string; salePrice: number | string };
    quantity: number;
  }>;
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
  { key: "guest", label: "Misafir & Tarih" },
  { key: "concept", label: "Konsept & Minibar" },
  { key: "extras", label: "Ekstralar & Notlar" },
  { key: "summary", label: "Özet & Gönder" },
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

// ─── Weather (summary step) ───────────────────────────────────────────────────

interface DailyForecastSummary {
  dt: number;
  temp: { min: number; max: number; day?: number };
  description: string;
  icon: string;
}

interface ForecastApiResponse {
  success: boolean;
  data?: {
    daily?: DailyForecastSummary[];
  };
}

type WeatherIconComponent = typeof Cloud;
const WEATHER_ICON_MAP: Record<string, WeatherIconComponent> = {
  "01": Sun,
  "02": Cloud,
  "03": Cloud,
  "04": Cloud,
  "09": CloudRain,
  "10": CloudRain,
  "11": CloudLightning,
  "13": CloudSnow,
  "50": CloudFog,
};

function getWeatherIcon(iconCode?: string | null): WeatherIconComponent {
  if (!iconCode || typeof iconCode !== "string" || iconCode.length < 2)
    return Cloud;
  const prefix = iconCode.slice(0, 2);
  return WEATHER_ICON_MAP[prefix] ?? Cloud;
}

// ─── Stepper Header ──────────────────────────────────────────────────────────

function StepperHeader({ currentStep }: { currentStep: number }) {
  return (
    <nav
      aria-label="Rezervasyon adımları"
      className="flex items-center justify-between px-0.5 mb-3"
    >
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <div
            key={step.key}
            className="flex items-center flex-1 last:flex-none min-w-0"
          >
            <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shrink-0 ${
                  isDone
                    ? "bg-[var(--rc-gold)] text-[var(--rc-btn-primary-text)] shadow-[0_0_8px_color-mix(in_srgb,var(--rc-gold)_30%,transparent)]"
                    : isActive
                      ? "bg-[var(--rc-gold)]/20 text-[var(--rc-gold)] border-2 border-[var(--rc-gold)]"
                      : "bg-[var(--rc-card-hover)] text-[var(--rc-text-muted)] border border-[var(--rc-border-subtle)]"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={`text-[9px] font-medium text-center leading-tight transition-colors truncate w-full ${
                  isActive
                    ? "text-[var(--rc-gold)]"
                    : isDone
                      ? "text-[var(--rc-text-secondary)]"
                      : "text-[var(--rc-text-muted)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-1 mt-[-14px] min-w-2">
                <div
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    isDone ? "bg-[var(--rc-gold)]" : "bg-[var(--rc-border-subtle)]"
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
  const [customExtraRequests, setCustomExtraRequests] = useState<
    CustomExtraRequest[]
  >([]);

  // ── Minibar Types ──
  const [minibarTypeId, setMinibarTypeId] = useState<string | null>(null);
  const [minibarTypes, setMinibarTypes] = useState<MinibarTypeOption[]>([]);
  const [minibarTypesLoading, setMinibarTypesLoading] = useState(true);

  // ── Step 3: Summary ──
  const [notes, setNotes] = useState("");
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

  // ── Weather forecast (summary step only) ──
  const { data: forecastData, isLoading: forecastLoading, isError: forecastError } = useQuery<ForecastApiResponse>({
    queryKey: ["weather-forecast", startDate, endDate],
    queryFn: async () => {
      const res = await fetch("/api/weather/forecast");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Forecast failed");
      return json;
    },
    enabled: step === 3 && !!startDate && !!endDate,
    staleTime: 10 * 60 * 1000,
  });

  const summaryWeatherDays = useMemo((): DailyForecastSummary[] => {
    const daily = forecastData?.data?.daily ?? [];
    if (!startDate || !endDate) return [];
    return daily.filter((d) => {
      const dateStr = new Date(d.dt * 1000).toISOString().slice(0, 10);
      return dateStr >= startDate && dateStr <= endDate;
    });
  }, [forecastData?.data?.daily, startDate, endDate]);

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
      fetch("/api/minibar-types")
        .then((r) => r.json())
        .then((json) => {
          const raw = json.data ?? json;
          setMinibarTypes(Array.isArray(raw) ? raw : []);
        })
        .catch(() => setMinibarTypes([])),
    ]).finally(() => {
      setConceptsLoading(false);
      setProductsLoading(false);
      setMinibarTypesLoading(false);
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
          minibarTypeId: minibarTypeId || null,
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
  }, [cabanaId, conceptId, startDate, endDate, selectedExtras, minibarTypeId]);

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

  const selectedMinibarType = minibarTypes.find((m) => m.id === minibarTypeId);
  const minibarTotal = useMemo(() => {
    if (!selectedMinibarType?.products) return 0;
    return selectedMinibarType.products.reduce((sum, mp) => {
      const price =
        typeof mp.product.salePrice === "string"
          ? parseFloat(mp.product.salePrice)
          : mp.product.salePrice;
      return sum + price * mp.quantity;
    }, 0);
  }, [selectedMinibarType]);

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
    guestName.trim().length >= 2 &&
    startDate &&
    endDate &&
    endDate >= startDate;
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
          conceptId: conceptId || undefined,
          minibarTypeId: minibarTypeId || undefined,
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
    "w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-xl text-[var(--rc-text-primary)] placeholder-[var(--rc-placeholder)] focus:outline-none focus:border-[var(--rc-input-focus)] focus:bg-[var(--rc-input-bg)] transition-all duration-200 touch-manipulation";

  return (
    <div className="flex flex-col h-full">
      {/* Header — mobile-first padding */}
      <div className="px-4 sm:px-5 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--rc-gold)]/20 border border-[var(--rc-gold)]/30 flex items-center justify-center">
            <span className="text-[var(--rc-gold)] text-sm">☀</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--rc-gold)] tracking-tight">
              {cabanaName}
            </p>
            <p className="text-[10px] text-[var(--rc-text-muted)] tracking-wide uppercase">
              Yeni Rezervasyon Talebi
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--rc-text-muted)] hover:text-[var(--rc-text-primary)] hover:bg-[var(--rc-card-hover)] active:bg-[var(--rc-card-hover)] transition-all touch-manipulation"
            aria-label="Kapat"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <StepperHeader currentStep={step} />
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--rc-border-subtle)] flex-shrink-0" />

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto rc-scrollbar min-h-0 px-4 sm:px-5 py-3">
        {/* ═══ STEP 1: Misafir & Tarih ═══ */}
        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Guest Search */}
            <div className="space-y-1.5 relative" ref={suggestionsRef}>
              <label className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
                Misafir
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rc-text-muted)] group-focus-within:text-[var(--rc-gold)] transition-colors">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[var(--rc-text-muted)] hover:text-[var(--rc-text-primary)] hover:bg-[var(--rc-card-hover)] text-xs transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
              {guestId && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--rc-success)] animate-pulse" />
                  <p className="text-[10px] text-[var(--rc-success)] font-medium">
                    Kayıtlı misafir eşleştirildi
                  </p>
                </div>
              )}

              {guestNameError && (
                <p className="text-[10px] text-[var(--rc-danger)] px-1">
                  {guestNameError}
                </p>
              )}

              {/* Autocomplete Dropdown */}
              {showSuggestions && guestSuggestions.length > 0 && (
                <div
                  role="listbox"
                  id="guest-suggestions-listbox"
                  aria-label="Misafir önerileri"
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--rc-card)] border border-[var(--rc-border-subtle)] rounded-xl shadow-2xl max-h-48 overflow-y-auto rc-scrollbar"
                >
                  {guestSuggestions.map((g, idx) => (
                    <button
                      key={g.id}
                      id={`guest-option-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={guestId === g.id}
                      onClick={() => selectGuest(g)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 transition-all text-left border-b border-[var(--rc-border-subtle)] last:border-0 ${
                        idx === highlightedIndex
                          ? "bg-[var(--rc-gold)]/10"
                          : "hover:bg-[var(--rc-card-hover)]"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--rc-gold)]/20 flex items-center justify-center flex-shrink-0 border border-[var(--rc-gold)]/20">
                        <span className="text-xs font-bold text-[var(--rc-gold)]">
                          {g.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--rc-text-primary)] truncate">
                          {g.name}
                        </p>
                        <p className="text-[10px] text-[var(--rc-text-muted)]">
                          {g.totalVisits} ziyaret
                          {g.vipLevel !== "STANDARD" && (
                            <span className="text-[var(--rc-gold)] ml-1.5 font-medium">
                              VIP {g.vipLevel}
                            </span>
                          )}
                          {g.phone && (
                            <span className="ml-1.5 text-[var(--rc-text-muted)]">
                              · {g.phone}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Guest History Card */}
            {historyLoading && (
              <div className="px-3.5 py-3 bg-[var(--rc-card-hover)]/50 border border-[var(--rc-border-subtle)] rounded-xl">
                <p className="text-xs text-[var(--rc-text-muted)] animate-pulse">
                  Misafir geçmişi yükleniyor...
                </p>
              </div>
            )}
            {guestHistory && !historyLoading && (
              <div className="rounded-xl border border-[var(--rc-gold)]/20 bg-[var(--rc-card)] overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-[var(--rc-border-subtle)] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--rc-gold)] uppercase tracking-wider">
                    Misafir Geçmişi
                  </span>
                  {guestHistory.guest.vipLevel !== "STANDARD" && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--rc-gold)]/15 text-[var(--rc-gold)] border border-[var(--rc-gold)]/25 font-medium">
                      VIP {guestHistory.guest.vipLevel}
                    </span>
                  )}
                </div>
                <div className="px-3.5 py-3 grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="text-[var(--rc-text-muted)]">Ziyaret</span>
                    <p className="text-[var(--rc-text-primary)] font-semibold text-xs mt-0.5">
                      {guestHistory.summary.totalVisits}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--rc-text-muted)]">Harcama</span>
                    <p className="text-[var(--rc-text-primary)] font-semibold text-xs mt-0.5">
                      {formatPriceVal(guestHistory.summary.totalSpent)} ₺
                    </p>
                  </div>
                  {guestHistory.summary.favoriteCabana && (
                    <div>
                      <span className="text-[var(--rc-text-muted)]">Favori Cabana</span>
                      <p className="text-[var(--rc-text-primary)] font-medium text-xs mt-0.5">
                        {guestHistory.summary.favoriteCabana}
                      </p>
                    </div>
                  )}
                  {guestHistory.summary.favoriteConcept && (
                    <div>
                      <span className="text-[var(--rc-text-muted)]">Favori Konsept</span>
                      <p className="text-[var(--rc-text-primary)] font-medium text-xs mt-0.5">
                        {guestHistory.summary.favoriteConcept}
                      </p>
                    </div>
                  )}
                </div>
                {guestHistory.reservations.length > 0 && (
                  <div className="px-3.5 pb-3 space-y-1">
                    <p className="text-[9px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-1">
                      Son Ziyaretler
                    </p>
                    {guestHistory.reservations.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-[10px] bg-[var(--rc-card-hover)]/40 rounded-lg px-2.5 py-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--rc-text-secondary)]">
                            {r.cabanaName}
                          </span>
                          <span className="text-[var(--rc-text-muted)]">·</span>
                          <span className="text-[var(--rc-text-muted)]">{r.days} gün</span>
                          {r.conceptName && (
                            <>
                              <span className="text-[var(--rc-text-muted)]">·</span>
                              <span className="text-[var(--rc-gold)]/80">
                                {r.conceptName}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-[var(--rc-text-muted)] tabular-nums">
                          {new Date(r.startDate).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {guestHistory.guest.isBlacklisted && (
                  <div className="px-3.5 py-2 bg-[var(--rc-danger)]/10 border-t border-[var(--rc-danger)]/20">
                    <p className="text-[10px] text-[var(--rc-danger)] font-semibold">
                      ⚠ Bu misafir kara listede
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Date Pickers */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
                Tarih
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[var(--rc-text-muted)] font-medium">Başlangıç</span>
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => setStartDate(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, startDate: true }))}
                    className={`${inputBase} ${pastDateError ? "!border-[var(--rc-danger)]" : ""}`}
                  />
                  {pastDateError && (
                    <p className="text-[10px] text-[var(--rc-danger)]">{pastDateError}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[var(--rc-text-muted)] font-medium">Bitiş</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate ?? today}
                    onChange={(e) => setEndDate(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, endDate: true }))}
                    className={`${inputBase} ${dateError ? "!border-[var(--rc-danger)]" : ""}`}
                  />
                  {dateError && (
                    <p className="text-[10px] text-[var(--rc-danger)]">{dateError}</p>
                  )}
                </div>
              </div>
            </div>

            {startDate && endDate && endDate >= startDate && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[var(--rc-gold)]/10 border border-[var(--rc-gold)]/20 rounded-xl">
                <div className="w-6 h-6 rounded-md bg-[var(--rc-gold)]/20 flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--rc-gold)]">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <span className="text-xs text-[var(--rc-gold)] font-medium">
                  {days === 0 ? "Günübirlik kullanım" : `${days} gün`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: Konsept & Minibar (kompakt, ekrana sığar) ═══ */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
                Konsept
              </label>
              <div className="relative">
                <select
                  value={conceptId ?? ""}
                  onChange={(e) => setConceptId(e.target.value || null)}
                  disabled={conceptsLoading}
                  className={`${inputBase} appearance-none pr-10 cursor-pointer`}
                >
                  <option value="">Konsept seçin (standart otomatik atanır)</option>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--rc-text-muted)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
              {selectedConcept && (
                <p className="text-[10px] text-[var(--rc-text-muted)] line-clamp-2">
                  {selectedConcept.description} · {selectedConcept.products.length} ürün
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
                Minibar (opsiyonel)
              </label>
              <div className="relative">
                <select
                  value={minibarTypeId ?? ""}
                  onChange={(e) => setMinibarTypeId(e.target.value || null)}
                  disabled={minibarTypesLoading}
                  className={`${inputBase} appearance-none pr-10 cursor-pointer`}
                >
                  <option value="">Minibar seçin</option>
                  {minibarTypes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--rc-text-muted)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
              {selectedMinibarType && selectedMinibarType.products.length > 0 && (
                <p className="text-[10px] text-[var(--rc-success)]">
                  {selectedMinibarType.products.length} ürün · {formatPriceVal(minibarTotal)} ₺
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Ekstralar & Notlar ═══ */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 overflow-y-auto max-h-[50vh] sm:max-h-none pr-1">
            {/* Extra Products */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Ekstra Ürünler
                </label>
                {selectedExtras.length > 0 && (
                  <span className="text-[10px] text-[var(--rc-gold)] font-semibold tabular-nums">
                    {selectedExtras.length} ürün · {formatPriceVal(extrasTotal)} ₺
                  </span>
                )}
              </div>
              {productsLoading ? (
                <div className="flex items-center gap-2 px-3 py-3">
                  <div className="w-3 h-3 border-2 border-[var(--rc-surface-border)] border-t-[var(--rc-gold)] rounded-full animate-spin" />
                  <p className="text-xs text-[var(--rc-text-muted)]">Ürünler yükleniyor...</p>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="px-3.5 py-3 bg-[var(--rc-card-hover)]/50 border border-[var(--rc-border-subtle)] rounded-xl text-center">
                  <p className="text-xs text-[var(--rc-text-muted)]">Eklenebilir ürün bulunamadı</p>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto rc-scrollbar space-y-1 rounded-xl border border-[var(--rc-border-subtle)] bg-[var(--rc-card-hover)]/30 p-1.5">
                  {availableProducts.map((product) => {
                    const existing = selectedExtras.find(
                      (e) => e.productId === product.id,
                    );
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between gap-2 py-2 px-3 rounded-lg transition-all duration-200 ${
                          existing
                            ? "bg-[var(--rc-gold)]/10 border border-[var(--rc-gold)]/20"
                            : "hover:bg-[var(--rc-card-hover)] border border-transparent"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs truncate ${existing ? "text-[var(--rc-gold)] font-medium" : "text-[var(--rc-text-primary)]"}`}>
                            {product.name}
                          </p>
                          <p className="text-[10px] text-[var(--rc-text-muted)] tabular-nums">
                            {formatPriceVal(product.salePrice)} ₺
                            {product.groupName && (
                              <span className="text-[var(--rc-text-muted)] ml-1">· {product.groupName}</span>
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
                                    prev
                                      .map((e) =>
                                        e.productId === product.id
                                          ? { ...e, quantity: Math.max(0, e.quantity - 1) }
                                          : e,
                                      )
                                      .filter((e) => e.quantity > 0),
                                  )
                                }
                                className="w-7 h-7 rounded-md bg-[var(--rc-card-hover)] text-[var(--rc-text-muted)] text-xs flex items-center justify-center hover:text-[var(--rc-text-primary)] transition-all min-h-[44px] min-w-[28px]"
                                aria-label={`${product.name} azalt`}
                              >
                                −
                              </button>
                              <span className="text-xs text-[var(--rc-gold)] w-6 text-center font-bold tabular-nums" aria-live="polite">
                                {existing.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedExtras((prev) =>
                                    prev.map((e) =>
                                      e.productId === product.id
                                        ? { ...e, quantity: Math.min(e.quantity + 1, 99) }
                                        : e,
                                    ),
                                  )
                                }
                                className="w-7 h-7 rounded-md bg-[var(--rc-card-hover)] text-[var(--rc-text-muted)] text-xs flex items-center justify-center hover:text-[var(--rc-text-primary)] transition-all min-h-[44px] min-w-[28px]"
                                aria-label={`${product.name} artır`}
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedExtras((prev) => [...prev, { productId: product.id, quantity: 1 }])
                              }
                              className="px-3 py-1.5 text-[10px] rounded-md bg-[var(--rc-gold)]/15 text-[var(--rc-gold)] hover:bg-[var(--rc-gold)]/25 transition-all font-semibold min-h-[44px]"
                            >
                              Ekle
                            </button>
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
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md bg-[var(--rc-warning)]/15 text-[var(--rc-warning)] hover:bg-[var(--rc-warning)]/25 transition-all font-semibold"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Yeni Talep
                </button>
              </div>

              {customExtraRequests.length === 0 ? (
                <p className="text-[10px] text-[var(--rc-text-muted)] px-1 leading-relaxed">
                  Sistemde bulunmayan özel taleplerinizi buradan ekleyebilirsiniz.
                </p>
              ) : (
                <div className="space-y-2">
                  {customExtraRequests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-[var(--rc-warning)]/20 bg-[var(--rc-warning)]/5 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={req.customName}
                          onChange={(e) =>
                            setCustomExtraRequests((prev) =>
                              prev.map((r) =>
                                r.id === req.id
                                  ? { ...r, customName: e.target.value }
                                  : r,
                              ),
                            )
                          }
                          placeholder="Talep adı"
                          className="flex-1 px-3 py-2 text-xs bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg text-[var(--rc-text-primary)] placeholder-[var(--rc-placeholder)] focus:outline-none focus:border-[var(--rc-input-focus)] transition-all"
                        />
                        <div className="flex items-center bg-[var(--rc-card-hover)] rounded-lg border border-[var(--rc-border-subtle)]">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomExtraRequests((prev) =>
                                prev.map((r) =>
                                  r.id === req.id ? { ...r, quantity: Math.max(1, r.quantity - 1) } : r,
                                ),
                              )
                            }
                            className="w-7 h-7 text-[var(--rc-text-muted)] text-xs flex items-center justify-center hover:text-[var(--rc-text-primary)] transition-colors"
                          >
                            −
                          </button>
                          <span className="text-xs text-[var(--rc-gold)] w-5 text-center font-bold tabular-nums">
                            {req.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomExtraRequests((prev) =>
                                prev.map((r) =>
                                  r.id === req.id
                                    ? {
                                        ...r,
                                        quantity: Math.min(99, r.quantity + 1),
                                      }
                                    : r,
                                ),
                              )
                            }
                            className="w-7 h-7 text-neutral-400 text-xs flex items-center justify-center hover:text-neutral-200 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomExtraRequests((prev) =>
                              prev.filter((r) => r.id !== req.id),
                            )
                          }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--rc-text-muted)] hover:text-[var(--rc-danger)] hover:bg-[var(--rc-danger)]/10 transition-all"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <textarea
                        value={req.customDesc}
                        onChange={(e) =>
                          setCustomExtraRequests((prev) =>
                            prev.map((r) =>
                              r.id === req.id
                                ? { ...r, customDesc: e.target.value }
                                : r,
                            ),
                          )
                        }
                        placeholder="Açıklama (isteğe bağlı)"
                        rows={1}
                        className="w-full px-3 py-1.5 text-[11px] bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] rounded-lg text-[var(--rc-text-secondary)] placeholder-[var(--rc-placeholder)] focus:outline-none focus:border-[var(--rc-input-focus)] transition-all resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              {customExtraRequests.length > 0 && (
                <p className="text-[10px] text-[var(--rc-warning)] leading-relaxed">
                  Admin onayına tabidir. Fiyatlandırma onay sonrası yapılır.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
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

        {/* ═══ STEP 4: Özet & Gönder ═══ */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Reservation Summary Card */}
            <div className="rounded-xl border border-[var(--rc-border-subtle)] overflow-hidden bg-[var(--rc-card)]">
              <div className="px-4 py-2.5 bg-[var(--rc-card-hover)]/50 border-b border-[var(--rc-border-subtle)]">
                <p className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
                  Rezervasyon Özeti
                </p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider">Misafir</span>
                    <p className="text-sm text-[var(--rc-text-primary)] font-medium mt-0.5">
                      {guestName}
                    </p>
                    {guestId && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-[var(--rc-success)] font-medium bg-[var(--rc-success)]/10 px-1.5 py-0.5 rounded-md">
                        <div className="w-1 h-1 rounded-full bg-[var(--rc-success)]" />
                        Kayıtlı
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider">Cabana</span>
                    <p className="text-sm text-[var(--rc-gold)] font-medium mt-0.5">
                      {cabanaName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider">Giriş</span>
                    <p className="text-sm text-[var(--rc-text-primary)] font-medium mt-0.5 tabular-nums">
                      {new Date(startDate).toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider">Çıkış</span>
                    <p className="text-sm text-[var(--rc-text-primary)] font-medium mt-0.5 tabular-nums">
                      {endDate
                        ? new Date(endDate).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider">Süre</span>
                    <p className="text-sm text-[var(--rc-text-primary)] font-medium mt-0.5">
                      {days === 0 ? "Günübirlik" : `${days} gün`}
                    </p>
                  </div>
                  {selectedConcept && (
                    <div>
                      <span className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider">Konsept</span>
                      <p className="text-sm text-[var(--rc-text-primary)] font-medium mt-0.5">
                        {selectedConcept.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--rc-border-subtle)]">
                  <p className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-2">
                    Seçilen Tarihlerde Hava Durumu
                  </p>
                  {forecastLoading && (
                    <p className="text-xs text-[var(--rc-text-muted)] py-2">Hava durumu yükleniyor…</p>
                  )}
                  {!forecastLoading && (forecastError || (!summaryWeatherDays.length && forecastData)) && (
                    <p className="text-xs text-[var(--rc-text-muted)] py-2">Hava durumu şu an gösterilemiyor</p>
                  )}
                  {!forecastLoading && !forecastError && summaryWeatherDays.length > 0 && (
                    <div className="space-y-2">
                      {summaryWeatherDays.map((d) => {
                        const IconComponent = getWeatherIcon(d.icon);
                        const dateStr = new Date(d.dt * 1000).toLocaleDateString("tr-TR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        });
                        return (
                          <div
                            key={d.dt}
                            className="flex items-center gap-3 rounded-lg border border-[var(--rc-border-subtle)] bg-[var(--rc-card-hover)]/30 px-3 py-2.5"
                          >
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--rc-gold)]/15 flex items-center justify-center text-[var(--rc-gold)]">
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--rc-text-primary)] tabular-nums">{dateStr}</p>
                              <p className="text-xs text-[var(--rc-text-muted)] truncate">{d.description}</p>
                            </div>
                            <p className="text-sm font-semibold text-[var(--rc-text-primary)] tabular-nums whitespace-nowrap">
                              {d.temp.min}° / {d.temp.max}°
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedExtras.length > 0 && (
                  <div className="pt-3 border-t border-[var(--rc-border-subtle)]">
                    <p className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-2">Ekstra Ürünler</p>
                    <div className="space-y-1.5">
                      {selectedExtras.map((e) => {
                        const p = availableProducts.find((ap) => ap.id === e.productId);
                        if (!p) return null;
                        return (
                          <div key={e.productId} className="flex justify-between text-xs">
                            <span className="text-[var(--rc-text-secondary)]">
                              {p.name} <span className="text-[var(--rc-text-muted)] tabular-nums">×{e.quantity}</span>
                            </span>
                            <span className="text-[var(--rc-text-primary)] tabular-nums font-medium">
                              {formatPriceVal(p.salePrice * e.quantity)} ₺
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedMinibarType && (
                  <div className="pt-3 border-t border-[var(--rc-border-subtle)]">
                    <p className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-2">
                      Minibar: {selectedMinibarType.name}
                    </p>
                    <div className="space-y-1.5">
                      {selectedMinibarType.products.map((mp, i) => {
                        const price =
                          typeof mp.product.salePrice === "string"
                            ? parseFloat(mp.product.salePrice)
                            : mp.product.salePrice;
                        return (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-[var(--rc-text-secondary)]">
                              {mp.product.name} <span className="text-[var(--rc-text-muted)] tabular-nums">×{mp.quantity}</span>
                            </span>
                            <span className="text-[var(--rc-text-primary)] tabular-nums font-medium">
                              {formatPriceVal(price * mp.quantity)} ₺
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {customExtraRequests.filter((r) => r.customName.trim()).length > 0 && (
                  <div className="pt-3 border-t border-[var(--rc-border-subtle)]">
                    <p className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-2">Liste Dışı Talepler</p>
                    <div className="space-y-1.5">
                      {customExtraRequests
                        .filter((r) => r.customName.trim())
                        .map((r) => (
                          <div key={r.id} className="flex justify-between items-center text-xs">
                            <span className="text-[var(--rc-warning)]">
                              {r.customName} <span className="text-[var(--rc-text-muted)] tabular-nums">×{r.quantity}</span>
                            </span>
                            <span className="text-[9px] text-[var(--rc-warning)]/80 italic bg-[var(--rc-warning)]/10 px-2 py-0.5 rounded-md">
                              Onay bekliyor
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {customRequests.trim() && (
                  <div className="pt-3 border-t border-[var(--rc-border-subtle)]">
                    <p className="text-[10px] text-[var(--rc-text-muted)] uppercase tracking-wider font-medium mb-1">Ek Notlar</p>
                    <p className="text-xs text-[var(--rc-text-secondary)] leading-relaxed">{customRequests}</p>
                  </div>
                )}
              </div>
            </div>

            {(priceLoading || priceBreakdown) && (
              <div className="rounded-xl border border-[var(--rc-gold)]/20 bg-[var(--rc-gold)]/5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
                    Tahmini Fiyat
                  </span>
                  {priceLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-[var(--rc-surface-border)] border-t-[var(--rc-gold)] rounded-full animate-spin" />
                      <span className="text-[var(--rc-text-muted)] text-xs">Hesaplanıyor...</span>
                    </div>
                  ) : priceBreakdown ? (
                    <span className="text-[var(--rc-gold)] font-bold text-lg tabular-nums">
                      {formatPriceVal(priceBreakdown.grandTotal)} ₺
                    </span>
                  ) : null}
                </div>
                {priceBreakdown && priceBreakdown.items.length > 0 && (
                  <div className="px-4 pb-3 space-y-1.5 border-t border-[var(--rc-gold)]/15 pt-2.5">
                    {priceBreakdown.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-[var(--rc-text-secondary)]">
                          {item.name} <span className="text-[var(--rc-text-muted)] tabular-nums">×{item.quantity}</span>
                        </span>
                        <span className="text-[var(--rc-text-primary)] tabular-nums">
                          {formatPriceVal(item.total)} ₺
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-2 border-t border-[var(--rc-gold)]/15">
                      <span className="text-[var(--rc-text-primary)] font-semibold">Toplam</span>
                      <span className="text-[var(--rc-gold)] font-bold tabular-nums">
                        {formatPriceVal(priceBreakdown.grandTotal)} ₺
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[var(--rc-text-muted)] uppercase tracking-wider">
                Notlar
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Özel istekler veya notlar..."
                rows={2}
                className={`${inputBase} resize-none`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-5 mb-2 px-3.5 py-2.5 rounded-xl bg-[var(--rc-danger)]/10 border border-[var(--rc-danger)]/20 flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-[var(--rc-danger)] flex-shrink-0" />
          <p className="text-xs text-[var(--rc-danger)]">{error}</p>
        </div>
      )}

      <div className="h-px bg-[var(--rc-border-subtle)] flex-shrink-0" />
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 flex-shrink-0">
        <button
          type="button"
          onClick={step === 0 ? onCancel : prevStep}
          className="min-h-[48px] px-4 py-3 text-sm font-medium text-[var(--rc-text-muted)] hover:text-[var(--rc-text-primary)] bg-[var(--rc-card-hover)] hover:bg-[var(--rc-card-hover)] border border-[var(--rc-border-subtle)] rounded-xl transition-all touch-manipulation"
        >
          {step === 0 ? "İptal" : "← Geri"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={step === 0 && !canGoStep2}
            className="min-h-[48px] px-6 py-3 text-sm font-semibold text-[var(--rc-btn-primary-text)] bg-[var(--rc-gold)] hover:bg-[var(--rc-gold-hover)] active:bg-[var(--rc-gold-active)] rounded-xl shadow-[0_0_12px_color-mix(in_srgb,var(--rc-gold)_20%,transparent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
          >
            İleri →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="min-h-[48px] px-6 py-3 text-sm font-semibold text-[var(--rc-btn-primary-text)] bg-[var(--rc-gold)] hover:bg-[var(--rc-gold-hover)] active:bg-[var(--rc-gold-active)] rounded-xl shadow-[0_0_12px_color-mix(in_srgb,var(--rc-gold)_20%,transparent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
          >
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-[var(--rc-btn-primary-text)]/20 border-t-[var(--rc-btn-primary-text)] rounded-full animate-spin" />
            )}
            {loading ? "Gönderiliyor..." : "Talep Oluştur"}
          </button>
        )}
      </div>
    </div>
  );
}
