"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { Role, ReportType } from "@/types";

const PresentationCanvas = lazy(
  () => import("@/components/reports/PresentationCanvas"),
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassOption {
  id: string;
  name: string;
}

interface ConceptOption {
  id: string;
  name: string;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  classId: string;
  conceptId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.OCCUPANCY]: "Doluluk Oranı",
  [ReportType.REVENUE]: "Gelir Analizi",
  [ReportType.COST_ANALYSIS]: "Maliyet Analizi",
  [ReportType.REQUEST_STATS]: "Talep İstatistikleri",
};

const REPORT_TYPES = Object.values(ReportType);

const defaultFilters: ReportFilters = {
  startDate: "",
  endDate: "",
  classId: "",
  conceptId: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFilters(filters: ReportFilters) {
  const f: Record<string, string> = {};
  if (filters.startDate) f.startDate = filters.startDate;
  if (filters.endDate) f.endDate = filters.endDate;
  if (filters.classId) f.classId = filters.classId;
  if (filters.conceptId) f.conceptId = filters.conceptId;
  return Object.keys(f).length ? f : undefined;
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [reportType, setReportType] = useState<ReportType>(
    ReportType.OCCUPANCY,
  );
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [previewData, setPreviewData] = useState<unknown>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [exportLoading, setExportLoading] = useState<
    "pdf" | "excel" | "presentation" | "html-presentation" | null
  >(null);
  const [exportError, setExportError] = useState("");
  const [exportSuccess, setExportSuccess] = useState("");
  const [showCanvas, setShowCanvas] = useState(false);

  // ── Fetch meta ──────────────────────────────────────────────────────────────

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [classRes, conceptRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/concepts"),
      ]);
      if (classRes.ok) setClasses(await classRes.json());
      if (conceptRes.ok) setConcepts(await conceptRes.json());
    } catch {
      // meta yüklenemese de sayfa çalışmaya devam eder
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // ── Access guard ────────────────────────────────────────────────────────────

  if (sessionStatus === "loading" || loadingMeta) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  if (!session?.user || session.user.role !== Role.SYSTEM_ADMIN) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-8 py-10 text-center max-w-sm">
          <p className="text-red-400 font-semibold mb-2">Erişim Reddedildi</p>
          <p className="text-neutral-500 text-sm">
            Bu modüle erişim yetkiniz bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setExportSuccess(msg);
    setTimeout(() => setExportSuccess(""), 4000);
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewData(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          filters: buildFilters(filters),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Önizleme oluşturulamadı.");
      }
      const data = await res.json();
      setPreviewData(data);
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleExport(format: "pdf" | "excel") {
    setExportLoading(format);
    setExportError("");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          format,
          filters: buildFilters(filters),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Dışa aktarma başarısız.");
      }
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      await downloadBlob(blob, `rapor-${reportType.toLowerCase()}.${ext}`);
      showSuccess(`${format.toUpperCase()} başarıyla indirildi.`);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setExportLoading(null);
    }
  }

  async function handlePresentation() {
    setExportLoading("presentation");
    setExportError("");
    try {
      const res = await fetch("/api/reports/presentation", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Sunum oluşturulamadı.");
      }
      const blob = await res.blob();
      await downloadBlob(blob, "royal-cabana-sunum.pptx");
      showSuccess("Sunum başarıyla indirildi.");
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setExportLoading(null);
    }
  }

  async function handleHtmlPresentation() {
    setExportLoading("html-presentation");
    setExportError("");
    try {
      const res = await fetch("/api/reports/presentation?format=html", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "HTML sunum oluşturulamadı.");
      }
      const blob = await res.blob();
      await downloadBlob(blob, "royal-cabana-sunum.html");
      showSuccess("HTML sunum başarıyla indirildi.");
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setExportLoading(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Presentation Canvas (fullscreen modal) */}
      {showCanvas && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <PresentationCanvas onClose={() => setShowCanvas(false)} />
        </Suspense>
      )}
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-amber-400">
          Raporlama & Sunum
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Rapor oluşturun, dışa aktarın veya sunum hazırlayın
        </p>
      </div>

      {/* Feedback */}
      {exportSuccess && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {exportSuccess}
        </div>
      )}
      {exportError && (
        <div className="mb-4 px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
          {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Filters ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Rapor Tipi */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-amber-400 mb-4">
              Rapor Tipi
            </h2>
            <div className="space-y-2">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`w-full text-left px-4 py-3 min-h-[44px] rounded-lg text-sm transition-colors ${
                    reportType === type
                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                      : "bg-neutral-800/50 border border-neutral-700/50 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  {REPORT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Filtreler */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-amber-400 mb-4">
              Filtreler
            </h2>
            <div className="space-y-3">
              <Field label="Başlangıç Tarihi">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Bitiş Tarihi">
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Kabana Sınıfı">
                <select
                  value={filters.classId}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, classId: e.target.value }))
                  }
                  className={inputCls}
                >
                  <option value="">Tümü</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Konsept">
                <select
                  value={filters.conceptId}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, conceptId: e.target.value }))
                  }
                  className={inputCls}
                >
                  <option value="">Tümü</option>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                onClick={() => setFilters(defaultFilters)}
                className="w-full text-xs text-neutral-500 hover:text-neutral-300 transition-colors pt-1"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Actions + Preview ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Export Actions */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-amber-400 mb-4">
              Dışa Aktar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ActionButton
                label="PDF İndir"
                icon="📄"
                loading={exportLoading === "pdf"}
                onClick={() => handleExport("pdf")}
                disabled={exportLoading !== null}
                variant="primary"
              />
              <ActionButton
                label="Excel İndir"
                icon="📊"
                loading={exportLoading === "excel"}
                onClick={() => handleExport("excel")}
                disabled={exportLoading !== null}
                variant="primary"
              />
              <ActionButton
                label="PPTX Sunum"
                icon="🎯"
                loading={exportLoading === "presentation"}
                onClick={handlePresentation}
                disabled={exportLoading !== null}
                variant="secondary"
              />
              <ActionButton
                label="HTML Sunum"
                icon="🌐"
                loading={exportLoading === "html-presentation"}
                onClick={handleHtmlPresentation}
                disabled={exportLoading !== null}
                variant="secondary"
              />
              <ActionButton
                label="Sunum Düzenle"
                icon="🎨"
                loading={false}
                onClick={() => setShowCanvas(true)}
                disabled={exportLoading !== null}
                variant="secondary"
                className="sm:col-span-2"
              />
            </div>
          </div>

          {/* JSON Preview */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-amber-400">
                JSON Önizleme
              </h2>
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 transition-colors"
              >
                {previewLoading ? "Yükleniyor..." : "Önizle"}
              </button>
            </div>

            {previewError && (
              <div className="mb-3 px-3 py-2 bg-red-950/40 border border-red-800/40 text-red-400 text-xs rounded-lg">
                {previewError}
              </div>
            )}

            {previewData ? (
              <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-xs text-neutral-300 overflow-auto max-h-96 font-mono">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            ) : (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-8 text-center text-neutral-600 text-sm">
                {previewLoading
                  ? "Rapor verisi yükleniyor..."
                  : "Önizlemek için yukarıdaki butona tıklayın"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  loading,
  onClick,
  disabled,
  variant,
  className = "",
}: {
  label: string;
  icon: string;
  loading: boolean;
  onClick: () => void;
  disabled: boolean;
  variant: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-amber-600 hover:bg-amber-500 text-neutral-950"
      : "bg-neutral-800 hover:bg-neutral-700 border border-amber-500/30 text-amber-300";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      <span>{icon}</span>
      <span>{loading ? "İşleniyor..." : label}</span>
    </button>
  );
}

const inputCls =
  "w-full min-h-[44px] bg-neutral-800 border border-neutral-700 focus:border-amber-500 text-neutral-100 rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder:text-neutral-600";
