"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlidePreviewData {
  cabanas: {
    name: string;
    className: string;
    conceptName: string;
    status: string;
    statusLabel: string;
  }[];
  classes: {
    name: string;
    description: string;
    cabanaCount: number;
    attributes: { key: string; value: string }[];
  }[];
  concepts: {
    name: string;
    description: string;
    products: { name: string; salePrice: number; group: string }[];
  }[];
  prices: {
    cabanaName: string;
    className: string;
    date: string;
    dailyPrice: number;
  }[];
  stats: {
    totalCabanas: number;
    totalClasses: number;
    totalConcepts: number;
    available: number;
    reserved: number;
    closed: number;
  };
}

interface SlideConfig {
  id: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  type: "cover" | "classes" | "cabanas" | "concepts" | "pricing" | "closing";
}

interface PresentationCanvasProps {
  onClose: () => void;
}

const DEFAULT_SLIDES: SlideConfig[] = [
  {
    id: "cover",
    title: "Royal Cabana",
    subtitle: "Kabana Yönetim Sistemi",
    enabled: true,
    type: "cover",
  },
  {
    id: "classes",
    title: "Kabana Sınıfları",
    subtitle: "Sınıf detayları ve özellikler",
    enabled: true,
    type: "classes",
  },
  {
    id: "cabanas",
    title: "Kabana Yerleşimi",
    subtitle: "Tüm kabana listesi ve durumları",
    enabled: true,
    type: "cabanas",
  },
  {
    id: "concepts",
    title: "Konseptler & Ürünler",
    subtitle: "Konsept paketleri ve fiyatları",
    enabled: true,
    type: "concepts",
  },
  {
    id: "pricing",
    title: "Fiyatlandırma",
    subtitle: "Günlük fiyat tablosu",
    enabled: true,
    type: "pricing",
  },
  {
    id: "closing",
    title: "Royal Cabana",
    subtitle: "Teşekkürler",
    enabled: true,
    type: "closing",
  },
];

// ─── Status Colors ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  AVAILABLE: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  RESERVED: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  CLOSED: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PresentationCanvas({
  onClose,
}: PresentationCanvasProps) {
  const [data, setData] = useState<SlidePreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slides, setSlides] = useState<SlideConfig[]>(DEFAULT_SLIDES);
  const [activeSlide, setActiveSlide] = useState(0);
  const [presentationTitle, setPresentationTitle] = useState("Royal Cabana");
  const [exporting, setExporting] = useState<"pptx" | "html" | null>(null);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/presentation/preview");
      if (!res.ok) throw new Error("Veri yüklenemedi.");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // ── Slide Reorder ─────────────────────────────────────────────────────────

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
    setActiveSlide(target);
  }

  function toggleSlide(index: number) {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s)),
    );
  }

  function updateSlideTitle(index: number, title: string) {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, title } : s)),
    );
  }

  function updateSlideSubtitle(index: number, subtitle: string) {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, subtitle } : s)),
    );
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport(format: "pptx" | "html") {
    setExporting(format);
    try {
      const enabledSlides = slides.filter((s) => s.enabled).map((s) => s.type);
      const formatParam = format === "html" ? "?format=html" : "";
      const res = await fetch(`/api/reports/presentation${formatParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: presentationTitle,
          slides: enabledSlides,
        }),
      });
      if (!res.ok) throw new Error("Sunum oluşturulamadı.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "html"
          ? "royal-cabana-sunum.html"
          : "royal-cabana-sunum.pptx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export hatası.");
    } finally {
      setExporting(null);
    }
  }

  // ── Render Helpers ────────────────────────────────────────────────────────

  const enabledSlides = slides.filter((s) => s.enabled);
  const currentSlide = enabledSlides[activeSlide] ?? enabledSlides[0];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">
            Sunum verileri yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center">
        <div className="bg-neutral-900 border border-red-800/40 rounded-xl p-8 max-w-sm text-center">
          <p className="text-red-400 mb-4">{error || "Veri yüklenemedi."}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 rounded-lg text-sm text-neutral-300 hover:bg-neutral-700"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            aria-label="Kapat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div>
            <input
              value={presentationTitle}
              onChange={(e) => setPresentationTitle(e.target.value)}
              className="bg-transparent text-base font-semibold text-amber-400 border-none outline-none focus:ring-1 focus:ring-amber-500/40 rounded px-1 -ml-1 w-64"
              placeholder="Sunum Başlığı"
            />
            <p className="text-xs text-neutral-500 mt-0.5">
              {enabledSlides.length} slayt aktif
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("html")}
            disabled={exporting !== null}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 border border-amber-500/30 text-amber-300 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {exporting === "html" ? "Oluşturuluyor..." : "HTML İndir"}
          </button>
          <button
            onClick={() => handleExport("pptx")}
            disabled={exporting !== null}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-neutral-950 hover:bg-amber-500 disabled:opacity-50 transition-colors"
          >
            {exporting === "pptx" ? "Oluşturuluyor..." : "PPTX İndir"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Slide List ── */}
        <div className="w-72 border-r border-neutral-800 bg-neutral-900/50 overflow-y-auto shrink-0">
          <div className="p-3 space-y-1">
            {slides.map((slide, i) => {
              const enabledIndex = enabledSlides.findIndex(
                (s) => s.id === slide.id,
              );
              const isActive = currentSlide?.id === slide.id;
              return (
                <div
                  key={slide.id}
                  className={`group rounded-lg border transition-all ${
                    !slide.enabled
                      ? "opacity-40 border-neutral-800 bg-neutral-900/30"
                      : isActive
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-start gap-2 p-2.5">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleSlide(i)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        slide.enabled
                          ? "bg-amber-500 border-amber-500"
                          : "border-neutral-600 bg-transparent"
                      }`}
                      aria-label={
                        slide.enabled
                          ? "Slaytı devre dışı bırak"
                          : "Slaytı etkinleştir"
                      }
                    >
                      {slide.enabled && (
                        <svg
                          className="w-3 h-3 text-neutral-950"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    <button
                      onClick={() =>
                        slide.enabled &&
                        setActiveSlide(enabledIndex >= 0 ? enabledIndex : 0)
                      }
                      className="flex-1 text-left min-w-0"
                      disabled={!slide.enabled}
                    >
                      <p
                        className={`text-xs font-medium truncate ${isActive ? "text-amber-300" : "text-neutral-300"}`}
                      >
                        {slide.title}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                        {slide.subtitle}
                      </p>
                    </button>

                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveSlide(i, -1)}
                        disabled={i === 0}
                        className="p-0.5 text-neutral-500 hover:text-neutral-300 disabled:opacity-20"
                        aria-label="Yukarı taşı"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveSlide(i, 1)}
                        disabled={i === slides.length - 1}
                        className="p-0.5 text-neutral-500 hover:text-neutral-300 disabled:opacity-20"
                        aria-label="Aşağı taşı"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Center: Slide Preview ── */}
        <div className="flex-1 overflow-y-auto bg-neutral-950 p-6 flex flex-col items-center">
          {currentSlide && (
            <div className="w-full max-w-4xl">
              {/* Slide Number */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-neutral-500">
                  Slayt {activeSlide + 1} / {enabledSlides.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                    disabled={activeSlide === 0}
                    className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
                    aria-label="Önceki slayt"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setActiveSlide(
                        Math.min(enabledSlides.length - 1, activeSlide + 1),
                      )
                    }
                    disabled={activeSlide === enabledSlides.length - 1}
                    className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
                    aria-label="Sonraki slayt"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Slide Canvas */}
              <div className="aspect-[16/9] rounded-xl border border-neutral-800 overflow-hidden shadow-2xl shadow-black/40">
                <SlideRenderer slide={currentSlide} data={data} />
              </div>

              {/* Edit Panel */}
              <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-amber-400 mb-3">
                  Slayt Düzenle
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">
                      Başlık
                    </label>
                    <input
                      value={currentSlide.title}
                      onChange={(e) => {
                        const idx = slides.findIndex(
                          (s) => s.id === currentSlide.id,
                        );
                        if (idx >= 0) updateSlideTitle(idx, e.target.value);
                      }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">
                      Alt Başlık
                    </label>
                    <input
                      value={currentSlide.subtitle}
                      onChange={(e) => {
                        const idx = slides.findIndex(
                          (s) => s.id === currentSlide.id,
                        );
                        if (idx >= 0) updateSlideSubtitle(idx, e.target.value);
                      }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Slide Renderer ───────────────────────────────────────────────────────────

function SlideRenderer({
  slide,
  data,
}: {
  slide: SlideConfig;
  data: SlidePreviewData;
}) {
  switch (slide.type) {
    case "cover":
      return <CoverSlide slide={slide} stats={data.stats} />;
    case "classes":
      return <ClassesSlide slide={slide} classes={data.classes} />;
    case "cabanas":
      return <CabanasSlide slide={slide} cabanas={data.cabanas} />;
    case "concepts":
      return <ConceptsSlide slide={slide} concepts={data.concepts} />;
    case "pricing":
      return <PricingSlide slide={slide} prices={data.prices} />;
    case "closing":
      return <ClosingSlide slide={slide} />;
    default:
      return (
        <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-500">
          Bilinmeyen slayt
        </div>
      );
  }
}

// ─── Cover Slide ──────────────────────────────────────────────────────────────

function CoverSlide({
  slide,
  stats,
}: {
  slide: SlideConfig;
  stats: SlidePreviewData["stats"];
}) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f0f1a] flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[15%] right-[10%] w-48 h-48 bg-amber-600/5 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>

      <div className="relative z-10">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
          <span className="text-2xl font-black text-neutral-950">RC</span>
        </div>

        <h1 className="text-4xl font-bold text-amber-400 tracking-tight mb-2">
          {slide.title}
        </h1>
        <p className="text-lg text-neutral-400 mb-1">{slide.subtitle}</p>
        <p className="text-xs text-neutral-600 mb-8">
          {new Date().toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8">
          <StatBadge value={stats.totalCabanas} label="Kabana" />
          <div className="w-px h-10 bg-neutral-700" />
          <StatBadge value={stats.totalClasses} label="Sınıf" />
          <div className="w-px h-10 bg-neutral-700" />
          <StatBadge value={stats.totalConcepts} label="Konsept" />
        </div>

        {/* Mini status bar */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {stats.available} Müsait
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {stats.reserved} Rezerveli
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {stats.closed} Kapalı
          </span>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold text-amber-400">{value}</span>
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ─── Classes Slide ────────────────────────────────────────────────────────────

function ClassesSlide({
  slide,
  classes,
}: {
  slide: SlideConfig;
  classes: SlidePreviewData["classes"];
}) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0f0f1a] to-[#141425] p-8 flex flex-col">
      <SlideHeader num="01" title={slide.title} />
      <div className="flex-1 grid grid-cols-2 gap-3 mt-4 overflow-hidden">
        {classes.map((cls) => (
          <div
            key={cls.name}
            className="bg-[#1a1a2e] border border-[#2a2a40] rounded-lg p-4 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-amber-400">
                {cls.name}
              </span>
              <span className="text-[10px] bg-[#0f0f1a] text-neutral-400 px-2 py-0.5 rounded-full">
                {cls.cabanaCount} kabana
              </span>
            </div>
            <p className="text-xs text-neutral-400 line-clamp-2 mb-2">
              {cls.description}
            </p>
            {cls.attributes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {cls.attributes.slice(0, 4).map((a) => (
                  <span
                    key={a.key}
                    className="text-[9px] bg-[#0f0f1a] border border-[#2a2a40] text-neutral-300 px-1.5 py-0.5 rounded"
                  >
                    {a.key}: {a.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cabanas Slide ────────────────────────────────────────────────────────────

function CabanasSlide({
  slide,
  cabanas,
}: {
  slide: SlideConfig;
  cabanas: SlidePreviewData["cabanas"];
}) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0f0f1a] to-[#141425] p-8 flex flex-col">
      <SlideHeader num="02" title={slide.title} />
      <div className="flex-1 mt-4 overflow-hidden rounded-lg border border-[#2a2a40]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#1a1a2e]">
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                Kabana
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                Sınıf
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                Konsept
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                Durum
              </th>
            </tr>
          </thead>
          <tbody>
            {cabanas.slice(0, 8).map((c, i) => {
              const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.AVAILABLE;
              return (
                <tr
                  key={c.name}
                  className={i % 2 === 0 ? "bg-[#1e1e30]" : "bg-[#1a1a2e]"}
                >
                  <td className="px-4 py-2 font-medium text-neutral-200">
                    {c.name}
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{c.className}</td>
                  <td className="px-4 py-2 text-neutral-400">
                    {c.conceptName}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${sc.bg} ${sc.text} ${sc.border}`}
                    >
                      {c.statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {cabanas.length > 8 && (
          <div className="bg-[#1a1a2e] px-4 py-2 text-[10px] text-neutral-500 text-center border-t border-[#2a2a40]">
            +{cabanas.length - 8} kabana daha
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Concepts Slide ───────────────────────────────────────────────────────────

function ConceptsSlide({
  slide,
  concepts,
}: {
  slide: SlideConfig;
  concepts: SlidePreviewData["concepts"];
}) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0f0f1a] to-[#141425] p-8 flex flex-col">
      <SlideHeader num="03" title={slide.title} />
      <div className="flex-1 grid grid-cols-2 gap-3 mt-4 overflow-hidden">
        {concepts.map((con) => (
          <div
            key={con.name}
            className="bg-[#1a1a2e] border border-[#2a2a40] rounded-lg overflow-hidden"
          >
            <div className="bg-[#16213e] px-4 py-2.5 border-b border-[#2a2a40]">
              <span className="text-sm font-semibold text-amber-400">
                {con.name}
              </span>
            </div>
            <p className="px-4 py-2 text-[10px] text-neutral-400 border-b border-[#2a2a40]">
              {con.description}
            </p>
            <div className="px-4 py-2 space-y-1">
              {con.products.slice(0, 5).map((p) => (
                <div key={p.name} className="flex justify-between text-xs">
                  <span className="text-neutral-300">{p.name}</span>
                  <span className="text-amber-400 font-medium">
                    {p.salePrice.toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              ))}
              {con.products.length > 5 && (
                <p className="text-[10px] text-neutral-500">
                  +{con.products.length - 5} ürün daha
                </p>
              )}
              {con.products.length === 0 && (
                <p className="text-[10px] text-neutral-500 italic">
                  Ürün tanımlanmamış
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pricing Slide ────────────────────────────────────────────────────────────

function PricingSlide({
  slide,
  prices,
}: {
  slide: SlideConfig;
  prices: SlidePreviewData["prices"];
}) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0f0f1a] to-[#141425] p-8 flex flex-col">
      <SlideHeader num="04" title={slide.title} />
      {prices.length > 0 ? (
        <div className="flex-1 mt-4 overflow-hidden rounded-lg border border-[#2a2a40]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1a1a2e]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Kabana
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Sınıf
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Günlük Fiyat
                </th>
              </tr>
            </thead>
            <tbody>
              {prices.slice(0, 8).map((p, i) => (
                <tr
                  key={`${p.cabanaName}-${p.date}`}
                  className={i % 2 === 0 ? "bg-[#1e1e30]" : "bg-[#1a1a2e]"}
                >
                  <td className="px-4 py-2 font-medium text-neutral-200">
                    {p.cabanaName}
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{p.className}</td>
                  <td className="px-4 py-2 text-neutral-400">{p.date}</td>
                  <td className="px-4 py-2 text-right font-semibold text-amber-400">
                    {p.dailyPrice.toLocaleString("tr-TR")} ₺
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {prices.length > 8 && (
            <div className="bg-[#1a1a2e] px-4 py-2 text-[10px] text-neutral-500 text-center border-t border-[#2a2a40]">
              +{prices.length - 8} fiyat kaydı daha
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 mt-4 flex items-center justify-center bg-[#1a1a2e] rounded-lg border border-[#2a2a40]">
          <p className="text-sm text-neutral-500">Henüz fiyat tanımlanmamış.</p>
        </div>
      )}
    </div>
  );
}

// ─── Closing Slide ────────────────────────────────────────────────────────────

function ClosingSlide({ slide }: { slide: SlideConfig }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f0f1a] flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute bottom-[20%] left-[20%] w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-[20%] right-[15%] w-40 h-40 bg-amber-600/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/20">
          <span className="text-xl font-black text-neutral-950">RC</span>
        </div>
        <h2 className="text-3xl font-bold text-amber-400 mb-2">
          {slide.title}
        </h2>
        <p className="text-sm text-neutral-500">{slide.subtitle}</p>
        <p className="text-xs text-neutral-600 mt-4">
          {new Date().toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SlideHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 shrink-0">
      <span className="text-xs font-bold text-amber-500/50 tracking-widest">
        {num}
      </span>
      <h2 className="text-xl font-bold text-neutral-100">{title}</h2>
    </div>
  );
}
