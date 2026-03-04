"use client";

import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Role, ReportType, ReportGroupBy } from "@/types";
import {
  Field,
  inputCls,
  ghostBtnCls,
  primaryBtnCls,
} from "@/components/shared/FormComponents";
import {
  BarChart3,
  Building2,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ArrowUpDown,
  Presentation,
  DollarSign,
  ClipboardList,
} from "lucide-react";

const SlidevEditor = lazy(() => import("@/components/reports/SlidevEditor"));
const SystemPresentation = lazy(
  () => import("@/components/reports/SystemPresentation"),
);

// ─── Types ─────────────────────────────────────────────────────────────────────

type GroupByKey = ReportGroupBy;

interface ReportTab {
  type: ReportType;
  label: string;
  icon: typeof BarChart3;
  description: string;
}

interface QuickFilter {
  label: string;
  getRange: () => [string, string];
}

interface ClassOption {
  id: string;
  name: string;
}

interface ConceptOption {
  id: string;
  name: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const REPORT_TABS: ReportTab[] = [
  {
    type: ReportType.OCCUPANCY,
    label: "Doluluk",
    icon: Building2,
    description: "Cabana doluluk oranları ve kapasite analizi",
  },
  {
    type: ReportType.REVENUE,
    label: "Gelir",
    icon: TrendingUp,
    description: "Rezervasyon, FnB ve ekstra hizmet gelirleri",
  },
  {
    type: ReportType.PERFORMANCE,
    label: "Performans",
    icon: BarChart3,
    description: "Onay süreleri, iptal oranları ve popülerlik",
  },
  {
    type: ReportType.FNB,
    label: "F&B",
    icon: UtensilsCrossed,
    description: "Sipariş analizi, ürün satışları ve trendler",
  },
  {
    type: ReportType.GUEST,
    label: "Misafir",
    icon: Users,
    description: "VIP dağılımı, sadakat ve harcama analizi",
  },
  {
    type: ReportType.COST_ANALYSIS,
    label: "Maliyet",
    icon: DollarSign,
    description: "Ürün maliyet-satış karşılaştırması ve kâr marjı",
  },
  {
    type: ReportType.REQUEST_STATS,
    label: "Talep İstatistikleri",
    icon: ClipboardList,
    description: "Onay, red, iptal ve değişiklik talep oranları",
  },
];

const GROUP_OPTIONS: { value: GroupByKey; label: string }[] = [
  { value: ReportGroupBy.DAILY, label: "Günlük" },
  { value: ReportGroupBy.WEEKLY, label: "Haftalık" },
  { value: ReportGroupBy.MONTHLY, label: "Aylık" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    label: "Bu Hafta",
    getRange: () => {
      const d = new Date();
      const day = d.getDay();
      const mon = new Date(d);
      mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      return [mon.toISOString().slice(0, 10), todayISO()];
    },
  },
  {
    label: "Bu Ay",
    getRange: () => {
      const d = new Date();
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      return [first.toISOString().slice(0, 10), todayISO()];
    },
  },
  {
    label: "Son 3 Ay",
    getRange: () => {
      const d = new Date();
      const past = new Date(d);
      past.setMonth(past.getMonth() - 3);
      return [past.toISOString().slice(0, 10), todayISO()];
    },
  },
  {
    label: "Bu Yıl",
    getRange: () => {
      const first = new Date(new Date().getFullYear(), 0, 1);
      return [first.toISOString().slice(0, 10), todayISO()];
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${fmtNum(n, 2)} ₺`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `%${fmtNum(n, 1)}`;
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

// ─── Data fetcher ──────────────────────────────────────────────────────────────

async function fetchReport(params: {
  type: ReportType;
  startDate: string;
  endDate: string;
  classId: string;
  conceptId: string;
  groupBy: GroupByKey;
}) {
  const qs = new URLSearchParams();
  qs.set("type", params.type);
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.classId) qs.set("classId", params.classId);
  if (params.conceptId) qs.set("conceptId", params.conceptId);
  qs.set("groupBy", params.groupBy);

  const res = await fetch(`/api/reports/generate?${qs.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Rapor yüklenemedi.");
  }
  const json = await res.json();
  return json.data;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [reportType, setReportType] = useState<ReportType>(
    ReportType.OCCUPANCY,
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classId, setClassId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByKey>(ReportGroupBy.MONTHLY);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [showSlidev, setShowSlidev] = useState(false);
  const [showSystemPresentation, setShowSystemPresentation] = useState(false);

  const { data: rawClasses } = useQuery<ClassOption[]>({
    queryKey: ["report-classes"],
    queryFn: async () => {
      const r = await fetch("/api/classes");
      if (!r.ok) return [];
      const json = await r.json();
      const resolved = json.data ?? json;
      return Array.isArray(resolved) ? resolved : [];
    },
  });
  const classes = Array.isArray(rawClasses) ? rawClasses : [];

  const { data: rawConcepts } = useQuery<ConceptOption[]>({
    queryKey: ["report-concepts"],
    queryFn: async () => {
      const r = await fetch("/api/concepts");
      if (!r.ok) return [];
      const json = await r.json();
      const resolved = json.data ?? json;
      return Array.isArray(resolved) ? resolved : [];
    },
  });
  const concepts = Array.isArray(rawConcepts) ? rawConcepts : [];

  const queryParams = useMemo(
    () => ({ type: reportType, startDate, endDate, classId, conceptId, groupBy }),
    [reportType, startDate, endDate, classId, conceptId, groupBy],
  );

  const {
    data: reportData,
    isLoading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: ["report", queryParams],
    queryFn: () => fetchReport(queryParams),
    enabled: true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const handleQuickFilter = useCallback((qf: QuickFilter) => {
    const [s, e] = qf.getRange();
    setStartDate(s);
    setEndDate(e);
  }, []);

  const handleClearFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setClassId("");
    setConceptId("");
    setGroupBy(ReportGroupBy.MONTHLY);
  }, []);

  const handleExport = useCallback(
    async (format: "csv" | "excel" | "pdf") => {
      setExportLoading(format);
      try {
        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: reportType,
            format,
            filters: {
              ...(startDate && { startDate }),
              ...(endDate && { endDate }),
              ...(classId && { classId }),
              ...(conceptId && { conceptId }),
              groupBy,
            },
          }),
        });
        if (!res.ok) throw new Error("Dışa aktarma başarısız.");
        const blob = await res.blob();
        const ext =
          format === "csv" ? "csv" : format === "pdf" ? "pdf" : "xlsx";
        await downloadBlob(
          blob,
          `rapor-${reportType.toLowerCase()}-${todayISO()}.${ext}`,
        );
      } catch {
        // silent
      } finally {
        setExportLoading(null);
      }
    },
    [reportType, startDate, endDate, classId, conceptId, groupBy],
  );

  // ── Access guard ──────────────────────────────────────────────────────────

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (
    !session?.user ||
    (session.user.role !== Role.SYSTEM_ADMIN &&
      session.user.role !== Role.ADMIN)
  ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl px-8 py-10 text-center max-w-sm">
          <p className="text-red-400 font-semibold mb-2">Erişim Reddedildi</p>
          <p className="text-[var(--rc-text-muted)] text-sm">
            Bu modüle erişim yetkiniz bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  const activeTab = REPORT_TABS.find((t) => t.type === reportType)!;

  return (
    <div className="text-[var(--rc-text-primary)] p-4 sm:p-6 max-w-[1440px] mx-auto">
      {showSlidev && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          }
        >
          <SlidevEditor onClose={() => setShowSlidev(false)} />
        </Suspense>
      )}

      {showSystemPresentation && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          }
        >
          <SystemPresentation
            onClose={() => setShowSystemPresentation(false)}
          />
        </Suspense>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--rc-gold)]">
          Akıllı Raporlama
        </h1>
        <p className="text-sm text-[var(--rc-text-muted)] mt-0.5">
          Doluluk, gelir, performans ve misafir analizlerini keşfedin
        </p>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setReportType(tab.type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 font-medium"
                  : "bg-[var(--rc-surface)] border border-transparent text-[var(--rc-text-muted)] hover:text-[var(--rc-text-secondary)] hover:bg-[var(--rc-input-bg)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--rc-text-muted)] mr-1">
              Hızlı:
            </span>
            {QUICK_FILTERS.map((qf) => (
              <button
                key={qf.label}
                onClick={() => handleQuickFilter(qf)}
                className={`${ghostBtnCls} !min-h-[32px] !py-1 !px-3 !text-xs`}
              >
                {qf.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Date + Group Controls */}
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="Başlangıç">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputCls} !min-h-[36px] !py-1.5 !text-xs w-[140px]`}
              />
            </Field>
            <Field label="Bitiş">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputCls} !min-h-[36px] !py-1.5 !text-xs w-[140px]`}
              />
            </Field>

            {(reportType === ReportType.OCCUPANCY ||
              reportType === ReportType.REVENUE) && (
              <Field label="Sınıf">
                <div className="relative">
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className={`${inputCls} !min-h-[36px] !py-1.5 !text-xs w-[130px] appearance-none pr-7`}
                  >
                    <option value="">Tümü</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rc-text-muted)] pointer-events-none" />
                </div>
              </Field>
            )}

            {reportType === ReportType.REVENUE && (
              <Field label="Konsept">
                <div className="relative">
                  <select
                    value={conceptId}
                    onChange={(e) => setConceptId(e.target.value)}
                    className={`${inputCls} !min-h-[36px] !py-1.5 !text-xs w-[130px] appearance-none pr-7`}
                  >
                    <option value="">Tümü</option>
                    {concepts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rc-text-muted)] pointer-events-none" />
                </div>
              </Field>
            )}

            <Field label="Gruplama">
              <div className="relative">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByKey)}
                  className={`${inputCls} !min-h-[36px] !py-1.5 !text-xs w-[110px] appearance-none pr-7`}
                >
                  {GROUP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rc-text-muted)] pointer-events-none" />
              </div>
            </Field>

            <button
              onClick={handleClearFilters}
              className="text-xs text-[var(--rc-text-muted)] hover:text-[var(--rc-text-secondary)] transition-colors pb-1"
            >
              Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ReportSkeleton />
      ) : queryError ? (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">
            {queryError instanceof Error
              ? queryError.message
              : "Rapor yüklenirken hata oluştu."}
          </p>
        </div>
      ) : reportData ? (
        <>
          {/* Warnings */}
          {reportData.warnings?.length > 0 && (
            <div className="mb-4 px-4 py-2.5 bg-amber-950/30 border border-amber-700/30 text-amber-400 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{reportData.warnings.join(" · ")}</span>
            </div>
          )}

          {/* Fetching indicator */}
          {isFetching && (
            <div className="mb-4 flex items-center gap-2 text-xs text-[var(--rc-text-muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Güncelleniyor...
            </div>
          )}

          {/* Report-specific content */}
          <ReportContent
            type={reportType}
            data={reportData.data}
            activeTab={activeTab}
          />

          {/* Export actions */}
          <div className="mt-6 bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-[var(--rc-text-muted)]">
                Dışa Aktar
              </span>
              <div className="flex gap-2 flex-wrap">
                <ExportButton
                  label="CSV"
                  icon={FileText}
                  loading={exportLoading === "csv"}
                  disabled={exportLoading !== null}
                  onClick={() => handleExport("csv")}
                />
                <ExportButton
                  label="Excel"
                  icon={FileSpreadsheet}
                  loading={exportLoading === "excel"}
                  disabled={exportLoading !== null}
                  onClick={() => handleExport("excel")}
                />
                <ExportButton
                  label="PDF"
                  icon={Download}
                  loading={exportLoading === "pdf"}
                  disabled={exportLoading !== null}
                  onClick={() => handleExport("pdf")}
                />
                <button
                  onClick={() => setShowSlidev(true)}
                  className={`${primaryBtnCls} !min-h-[36px] !py-1.5 !px-4 !text-xs flex items-center gap-1.5`}
                >
                  <Presentation className="w-3.5 h-3.5" />
                  Sunum
                </button>
                <button
                  onClick={() => setShowSystemPresentation(true)}
                  className={`${primaryBtnCls} !min-h-[36px] !py-1.5 !px-4 !text-xs flex items-center gap-1.5 !bg-amber-700 hover:!bg-amber-600`}
                >
                  <Presentation className="w-3.5 h-3.5" />
                  Sistem Sunumu
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmptyState description={activeTab.description} />
      )}
    </div>
  );
}

// ─── Report Content Router ─────────────────────────────────────────────────────

function ReportContent({
  type,
  data,
  activeTab,
}: {
  type: ReportType;
  data: Record<string, unknown>;
  activeTab: ReportTab;
}) {
  switch (type) {
    case ReportType.OCCUPANCY:
      return <OccupancyView data={data} />;
    case ReportType.REVENUE:
      return <RevenueView data={data} />;
    case ReportType.PERFORMANCE:
      return <PerformanceView data={data} />;
    case ReportType.FNB:
      return <FnbView data={data} />;
    case ReportType.GUEST:
      return <GuestView data={data} />;
    default:
      return <EmptyState description={activeTab.description} />;
  }
}

// ─── Occupancy View ─────────────────────────────────────────────────────────────

function OccupancyView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as {
    averageOccupancy: number;
    totalReservationDays: number;
    totalCabanas: number;
    totalRevenue: number;
  };
  const breakdown = (data.breakdown as {
    period: string;
    occupancy: number;
    reservations: number;
    revenue: number;
  }[]) ?? [];
  const byClass = (data.byClass as { class: string; occupancy: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ort. Doluluk"
          value={fmtPct(summary.averageOccupancy)}
          accent
        />
        <KpiCard
          label="Toplam Rez. Günü"
          value={fmtNum(summary.totalReservationDays)}
        />
        <KpiCard
          label="Cabana Sayısı"
          value={fmtNum(summary.totalCabanas)}
        />
        <KpiCard
          label="Toplam Gelir"
          value={fmtCurrency(summary.totalRevenue)}
        />
      </div>

      {byClass.length > 0 && (
        <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[var(--rc-gold)] mb-3">
            Sınıf Bazlı Doluluk
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {byClass.map((c) => (
              <div
                key={c.class}
                className="bg-[var(--rc-input-bg)] rounded-lg p-3 flex items-center justify-between"
              >
                <span className="text-sm text-[var(--rc-text-secondary)]">
                  {c.class}
                </span>
                <OccupancyBar pct={c.occupancy} />
              </div>
            ))}
          </div>
        </div>
      )}

      {breakdown.length > 0 && (
        <DataTable
          title="Dönem Kırılımı"
          columns={["Dönem", "Doluluk", "Rezervasyon", "Gelir"]}
          rows={breakdown.map((r) => [
            r.period,
            fmtPct(r.occupancy),
            fmtNum(r.reservations),
            fmtCurrency(r.revenue),
          ])}
        />
      )}
    </div>
  );
}

// ─── Revenue View ────────────────────────────────────────────────────────────────

function RevenueView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as {
    totalRevenue: number;
    reservationRevenue: number;
    fnbRevenue: number;
    extraRevenue: number;
    reservationCount: number;
  };
  const breakdown = (data.breakdown as {
    period: string;
    reservation: number;
    fnb: number;
    extra: number;
    total: number;
  }[]) ?? [];
  const byConcept = (data.byConcept as {
    concept: string;
    revenue: number;
  }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Toplam Gelir"
          value={fmtCurrency(summary.totalRevenue)}
          accent
        />
        <KpiCard
          label="Rezervasyon"
          value={fmtCurrency(summary.reservationRevenue)}
        />
        <KpiCard label="F&B" value={fmtCurrency(summary.fnbRevenue)} />
        <KpiCard
          label="Ekstra Hizmet"
          value={fmtCurrency(summary.extraRevenue)}
        />
        <KpiCard
          label="Rez. Sayısı"
          value={fmtNum(summary.reservationCount)}
        />
      </div>

      {byConcept.length > 0 && (
        <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[var(--rc-gold)] mb-3">
            Konsept Bazlı Gelir
          </h3>
          <div className="space-y-2">
            {byConcept.slice(0, 10).map((c) => {
              const pct =
                summary.totalRevenue > 0
                  ? (c.revenue / summary.totalRevenue) * 100
                  : 0;
              return (
                <div key={c.concept} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--rc-text-secondary)] w-28 truncate shrink-0">
                    {c.concept}
                  </span>
                  <div className="flex-1 h-5 bg-[var(--rc-input-bg)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500/40 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--rc-text-muted)] w-24 text-right shrink-0">
                    {fmtCurrency(c.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {breakdown.length > 0 && (
        <DataTable
          title="Dönem Kırılımı"
          columns={["Dönem", "Rezervasyon", "F&B", "Ekstra", "Toplam"]}
          rows={breakdown.map((r) => [
            r.period,
            fmtCurrency(r.reservation),
            fmtCurrency(r.fnb),
            fmtCurrency(r.extra),
            fmtCurrency(r.total),
          ])}
        />
      )}
    </div>
  );
}

// ─── Performance View ────────────────────────────────────────────────────────────

function PerformanceView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as {
    totalReservations: number;
    cancelRate: number;
    modificationRate: number;
    avgApprovalHours: number | null;
    avgCheckInHours: number | null;
    modifications: number;
    cancellations: number;
  };
  const topCabanas = (data.topCabanas as {
    name: string;
    count: number;
  }[]) ?? [];
  const topConcepts = (data.topConcepts as {
    concept: string;
    count: number;
  }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Toplam Rezervasyon"
          value={fmtNum(summary.totalReservations)}
          accent
        />
        <KpiCard label="İptal Oranı" value={fmtPct(summary.cancelRate)} />
        <KpiCard
          label="Değişiklik Oranı"
          value={fmtPct(summary.modificationRate)}
        />
        <KpiCard
          label="Ort. Onay Süresi"
          value={
            summary.avgApprovalHours != null
              ? `${fmtNum(summary.avgApprovalHours, 1)} saat`
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topCabanas.length > 0 && (
          <RankTable
            title="En Çok Talep Edilen Cabanalar"
            items={topCabanas.map((c) => ({
              label: c.name,
              value: `${c.count} rez.`,
            }))}
          />
        )}

        {topConcepts.length > 0 && (
          <RankTable
            title="En Popüler Konseptler"
            items={topConcepts.map((c) => ({
              label: c.concept,
              value: `${c.count} rez.`,
            }))}
          />
        )}
      </div>
    </div>
  );
}

// ─── FnB View ────────────────────────────────────────────────────────────────────

function FnbView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as {
    totalOrders: number;
    totalItems: number;
    totalRevenue: number;
    avgOrderAmount: number;
  };
  const topProducts = (data.topProducts as {
    name: string;
    group: string;
    quantity: number;
    revenue: number;
  }[]) ?? [];
  const breakdown = (data.breakdown as {
    period: string;
    orders: number;
    revenue: number;
  }[]) ?? [];
  const byCabana = (data.byCabana as {
    cabana: string;
    orders: number;
    revenue: number;
  }[]) ?? [];
  const byGroup = (data.byGroup as {
    group: string;
    quantity: number;
    revenue: number;
  }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Toplam Sipariş"
          value={fmtNum(summary.totalOrders)}
          accent
        />
        <KpiCard
          label="Toplam Gelir"
          value={fmtCurrency(summary.totalRevenue)}
        />
        <KpiCard label="Toplam Ürün" value={fmtNum(summary.totalItems)} />
        <KpiCard
          label="Ort. Sipariş"
          value={fmtCurrency(summary.avgOrderAmount)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topProducts.length > 0 && (
          <DataTable
            title="En Çok Satılan Ürünler"
            columns={["Ürün", "Grup", "Adet", "Gelir"]}
            rows={topProducts.slice(0, 15).map((p) => [
              p.name,
              p.group,
              fmtNum(p.quantity),
              fmtCurrency(p.revenue),
            ])}
          />
        )}

        {byGroup.length > 0 && (
          <DataTable
            title="Ürün Grubu Kırılımı"
            columns={["Grup", "Adet", "Gelir"]}
            rows={byGroup.map((g) => [
              g.group,
              fmtNum(g.quantity),
              fmtCurrency(g.revenue),
            ])}
          />
        )}
      </div>

      {byCabana.length > 0 && (
        <DataTable
          title="Cabana Bazlı Sipariş"
          columns={["Cabana", "Sipariş", "Gelir"]}
          rows={byCabana.map((c) => [
            c.cabana,
            fmtNum(c.orders),
            fmtCurrency(c.revenue),
          ])}
        />
      )}

      {breakdown.length > 0 && (
        <DataTable
          title="Dönem Kırılımı"
          columns={["Dönem", "Sipariş", "Gelir"]}
          rows={breakdown.map((r) => [
            r.period,
            fmtNum(r.orders),
            fmtCurrency(r.revenue),
          ])}
        />
      )}
    </div>
  );
}

// ─── Guest View ──────────────────────────────────────────────────────────────────

function GuestView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as {
    totalGuests: number;
    newGuests: number;
    returningGuests: number;
    avgSpendPerGuest: number;
  };
  const vipDistribution = (data.vipDistribution as {
    level: string;
    count: number;
  }[]) ?? [];
  const topGuests = (data.topGuests as {
    name: string;
    vipLevel: string;
    reservationCount: number;
    totalSpend: number;
  }[]) ?? [];

  const vipLabels: Record<string, string> = {
    STANDARD: "Standard",
    SILVER: "Silver",
    GOLD: "Gold",
    PLATINUM: "Platinum",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Toplam Misafir"
          value={fmtNum(summary.totalGuests)}
          accent
        />
        <KpiCard label="Yeni Misafir" value={fmtNum(summary.newGuests)} />
        <KpiCard
          label="Tekrar Gelen"
          value={fmtNum(summary.returningGuests)}
        />
        <KpiCard
          label="Ort. Harcama"
          value={fmtCurrency(summary.avgSpendPerGuest)}
        />
      </div>

      {vipDistribution.length > 0 && (
        <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[var(--rc-gold)] mb-3">
            VIP Seviye Dağılımı
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {vipDistribution.map((v) => (
              <div
                key={v.level}
                className="bg-[var(--rc-input-bg)] rounded-lg p-3 text-center"
              >
                <div className="text-lg font-bold text-[var(--rc-text-primary)]">
                  {v.count}
                </div>
                <div className="text-xs text-[var(--rc-text-muted)]">
                  {vipLabels[v.level] ?? v.level}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topGuests.length > 0 && (
        <DataTable
          title="En Sık Gelen Misafirler"
          columns={["Misafir", "VIP", "Rez. Sayısı", "Toplam Harcama"]}
          rows={topGuests.map((g) => [
            g.name,
            vipLabels[g.vipLevel] ?? g.vipLevel,
            fmtNum(g.reservationCount),
            fmtCurrency(g.totalSpend),
          ])}
        />
      )}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4">
      <div className="text-xs text-[var(--rc-text-muted)] mb-1">{label}</div>
      <div
        className={`text-lg font-bold ${accent ? "text-[var(--rc-gold)]" : "text-[var(--rc-text-primary)]"}`}
      >
        {value}
      </div>
    </div>
  );
}

function OccupancyBar({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? "bg-green-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-[var(--rc-input-bg)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-[var(--rc-text-muted)] w-12 text-right">
        {fmtPct(pct)}
      </span>
    </div>
  );
}

function DataTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--rc-surface-border)]">
        <h3 className="text-xs font-semibold text-[var(--rc-gold)]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--rc-surface-border)]">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left font-medium text-[var(--rc-text-muted)]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--rc-surface-border)] last:border-0 hover:bg-[var(--rc-input-bg)] transition-colors"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-2.5 ${j === 0 ? "text-[var(--rc-text-secondary)]" : "text-[var(--rc-text-muted)]"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankTable({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4">
      <h3 className="text-xs font-semibold text-[var(--rc-gold)] mb-3">
        {title}
      </h3>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-xs py-1.5"
          >
            <span className="w-5 text-[var(--rc-text-muted)] text-right shrink-0">
              {i + 1}.
            </span>
            <span className="flex-1 text-[var(--rc-text-secondary)] truncate">
              {item.label}
            </span>
            <span className="text-[var(--rc-text-muted)] shrink-0">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportButton({
  label,
  icon: Icon,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof FileText;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${ghostBtnCls} !min-h-[36px] !py-1.5 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4 h-20"
          >
            <div className="h-3 bg-[var(--rc-input-bg)] rounded w-16 mb-2" />
            <div className="h-5 bg-[var(--rc-input-bg)] rounded w-24" />
          </div>
        ))}
      </div>
      <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4 h-48" />
      <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-4 h-64" />
    </div>
  );
}

function EmptyState({ description }: { description: string }) {
  return (
    <div className="bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-xl p-12 text-center">
      <Calendar className="w-10 h-10 text-[var(--rc-text-muted)] mx-auto mb-3 opacity-50" />
      <p className="text-sm text-[var(--rc-text-muted)]">{description}</p>
      <p className="text-xs text-[var(--rc-text-muted)] mt-1 opacity-60">
        Rapor verisi yükleniyor...
      </p>
    </div>
  );
}
