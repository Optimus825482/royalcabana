"use client";

import React, { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileSpreadsheet,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Field,
  ErrorMsg,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface ColumnMapping {
  nameCol: string;
  purchaseCol: string;
  saleCol: string;
  groupCol: string;
}

type MatchStatus = "MATCH" | "NO_CHANGE" | "NEW" | "UNMATCHED";

interface PreviewRow {
  row: number;
  name: string;
  purchasePrice: number;
  salePrice: number;
  status: MatchStatus;
  matchedProduct?: {
    id: string;
    name: string;
    purchasePrice: number;
    salePrice: number;
  };
  similarity?: number;
  suggestedProduct?: {
    id: string;
    name: string;
    purchasePrice: number;
    salePrice: number;
  };
  suggestedSimilarity?: number;
  error?: string;
}

interface ImportSummary {
  total: number;
  matched: number;
  unchanged: number;
  created: number;
  updated: number;
  errors: number;
}

type Step = 1 | 2 | 3 | 4;
type RowAction = "create" | "skip" | "link";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ACCEPT = ".xlsx,.xls,.csv";

const AUTO_DETECT: Record<keyof ColumnMapping, string[]> = {
  nameCol: ["ürün", "ad", "name", "ürün adı", "product"],
  purchaseCol: ["alış", "purchase", "alış fiyatı", "maliyet", "cost"],
  saleCol: ["satış", "sale", "satış fiyatı", "fiyat", "price"],
  groupCol: ["grup", "group", "kategori", "category"],
};

function detectColumn(headers: string[], keywords: string[]): string {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return headers[idx];
  }
  return "";
}

const statusRowCls: Record<MatchStatus, string> = {
  NEW: "bg-emerald-500/10",
  MATCH: "bg-blue-500/10",
  NO_CHANGE: "bg-neutral-800/50",
  UNMATCHED: "bg-amber-500/10",
};

const statusLabel: Record<MatchStatus, string> = {
  NEW: "Yeni",
  MATCH: "Güncelleme",
  NO_CHANGE: "Değişiklik Yok",
  UNMATCHED: "Belirsiz",
};

const fmt = (v: number | null | undefined) =>
  v != null
    ? v.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })
    : "—";

/* ------------------------------------------------------------------ */
/*  ActionButtonGroup                                                  */
/* ------------------------------------------------------------------ */

interface ActionBtnProps {
  label: string;
  active: boolean;
  color: "green" | "gray" | "blue";
  onClick: () => void;
}
const colorMap: Record<
  ActionBtnProps["color"],
  { active: string; idle: string }
> = {
  green: {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    idle: "text-neutral-500 border-neutral-700 hover:text-emerald-400 hover:border-emerald-500/30",
  },
  gray: {
    active: "bg-neutral-700/50 text-neutral-300 border-neutral-600",
    idle: "text-neutral-500 border-neutral-700 hover:text-neutral-300 hover:border-neutral-600",
  },
  blue: {
    active: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    idle: "text-neutral-500 border-neutral-700 hover:text-blue-400 hover:border-blue-500/30",
  },
};

function ActionBtn({ label, active, color, onClick }: ActionBtnProps) {
  const cls = active ? colorMap[color].active : colorMap[color].idle;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] sm:min-h-[28px] px-2 py-1 text-[10px] font-medium border rounded transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ImportModal({
  open,
  onClose,
  onComplete,
}: ImportModalProps) {
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    nameCol: "",
    purchaseCol: "",
    saleCol: "",
    groupCol: "",
  });
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [decisions, setDecisions] = useState<
    Record<number, { action: RowAction; linkProductId?: string }>
  >({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ---- Reset ---- */
  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setMapping({ nameCol: "", purchaseCol: "", saleCol: "", groupCol: "" });
    setPreview([]);
    setDecisions({});
    setSummary(null);
    setLoading(false);
    setError("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  /* ---- File parsing ---- */
  const parseFile = useCallback(async (f: File) => {
    setFile(f);
    setError("");
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
      if (!rows.length) {
        setError("Dosyada veri bulunamadı.");
        return;
      }
      const hdrs = (rows[0] as string[]).map(String).filter(Boolean);
      setHeaders(hdrs);

      /* auto-detect */
      setMapping({
        nameCol: detectColumn(hdrs, AUTO_DETECT.nameCol),
        purchaseCol: detectColumn(hdrs, AUTO_DETECT.purchaseCol),
        saleCol: detectColumn(hdrs, AUTO_DETECT.saleCol),
        groupCol: detectColumn(hdrs, AUTO_DETECT.groupCol),
      });
      setStep(2);
    } catch {
      setError("Dosya okunamadı. Lütfen geçerli bir Excel/CSV dosyası seçin.");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) parseFile(f);
    },
    [parseFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) parseFile(f);
    },
    [parseFile],
  );

  /* ---- Decision helpers ---- */
  const setRowDecision = useCallback(
    (row: number, action: RowAction, linkProductId?: string) => {
      setDecisions((prev) => ({
        ...prev,
        [row]: { action, linkProductId },
      }));
    },
    [],
  );

  /* ---- Build FormData ---- */
  const buildFormData = useCallback(() => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("nameCol", mapping.nameCol);
    fd.append("purchaseCol", mapping.purchaseCol);
    fd.append("saleCol", mapping.saleCol);
    if (mapping.groupCol) fd.append("groupCol", mapping.groupCol);
    return fd;
  }, [file, mapping]);

  /* ---- Preview ---- */
  const fetchPreview = useCallback(async () => {
    const fd = buildFormData();
    if (!fd) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/products/import?preview=true", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Önizleme alınamadı.");
      }
      const data = await res.json();
      const items: PreviewRow[] = data.items ?? [];
      setPreview(items);

      /* auto-set default decisions */
      const defaultDecs: Record<
        number,
        { action: RowAction; linkProductId?: string }
      > = {};
      for (const item of items) {
        if (item.status === "NEW") {
          defaultDecs[item.row] = { action: "create" };
        } else if (item.status === "UNMATCHED") {
          defaultDecs[item.row] = { action: "skip" };
        }
      }
      setDecisions(defaultDecs);

      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [buildFormData]);

  /* ---- Apply ---- */
  const applyImport = useCallback(async () => {
    const fd = buildFormData();
    if (!fd) return;

    /* append decisions */
    fd.append(
      "decisions",
      JSON.stringify(
        Object.entries(decisions).map(([row, dec]) => ({
          row: Number(row),
          action: dec.action,
          linkProductId: dec.linkProductId,
        })),
      ),
    );

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/products/import?preview=false", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "İçe aktarma başarısız.");
      }
      const data = await res.json();
      setSummary(data.summary);
      setStep(4);
      qc.invalidateQueries({ queryKey: ["products-and-groups"] });
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [buildFormData, decisions, qc, onComplete]);

  /* ---- Mapping valid? ---- */
  const mappingValid =
    mapping.nameCol && (mapping.purchaseCol || mapping.saleCol);

  /* ---- Summary counts ---- */
  const counts = preview.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  /* ---- Apply button label ---- */
  const matchCount = counts.MATCH || 0;
  const createOrLinkCount = Object.values(decisions).filter(
    (d) => d.action === "create" || d.action === "link",
  ).length;
  const applyTotal = matchCount + createOrLinkCount;

  if (!open) return null;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-2xl sm:mx-4 max-h-[90vh] flex flex-col">
        {/* ---- Header ---- */}
        <div className="sticky top-0 z-10 bg-neutral-900 flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-yellow-400">
              Ürün İçe Aktarma
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-11 h-11 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ---- Step indicator ---- */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-1 text-xs text-neutral-500 shrink-0">
          {(["Dosya", "Eşleştirme", "Önizleme", "Sonuç"] as const).map(
            (label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-neutral-700" />}
                <span
                  className={
                    step === i + 1
                      ? "text-yellow-400 font-medium"
                      : step > i + 1
                        ? "text-neutral-400"
                        : ""
                  }
                >
                  {label}
                </span>
              </React.Fragment>
            ),
          )}
        </div>

        {/* ---- Body ---- */}
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {error && <ErrorMsg msg={error} />}

          {/* ======== STEP 1: File Upload ======== */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${
                    dragOver
                      ? "border-yellow-500 bg-yellow-500/5"
                      : "border-neutral-700 hover:border-neutral-600 bg-neutral-800/40"
                  }
                `}
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-neutral-500" />
                <p className="text-sm text-neutral-300 mb-1">
                  Dosyayı sürükleyip bırakın veya tıklayın
                </p>
                <p className="text-xs text-neutral-500">
                  .xlsx, .xls veya .csv dosyaları
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-neutral-300 bg-neutral-800 rounded-lg px-3 py-2">
                  <FileSpreadsheet className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
              )}
            </div>
          )}

          {/* ======== STEP 2: Column Mapping ======== */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                Dosyadaki sütunları aşağıdaki alanlarla eşleştirin.
              </p>
              {(
                [
                  ["nameCol", "Ürün Adı *"] as const,
                  ["purchaseCol", "Maliyet"] as const,
                  ["saleCol", "Satış Fiyatı"] as const,
                  ["groupCol", "Grup (opsiyonel)"] as const,
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <select
                    value={mapping[key]}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [key]: e.target.value }))
                    }
                    className={selectCls}
                  >
                    <option value="">— Seçiniz —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className={cancelBtnCls + " flex items-center gap-1"}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Geri
                </button>
                <button
                  onClick={fetchPreview}
                  disabled={!mappingValid || loading}
                  className={submitBtnCls + " flex items-center gap-1"}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      Devam <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ======== STEP 3: Preview ======== */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-3 text-xs">
                {counts.NEW ? (
                  <span className="text-emerald-400">{counts.NEW} yeni</span>
                ) : null}
                {counts.MATCH ? (
                  <span className="text-blue-400">
                    {counts.MATCH} güncelleme
                  </span>
                ) : null}
                {counts.UNMATCHED ? (
                  <span className="text-amber-400">
                    {counts.UNMATCHED} belirsiz
                  </span>
                ) : null}
                {counts.NO_CHANGE ? (
                  <span className="text-neutral-400">
                    {counts.NO_CHANGE} değişiklik yok
                  </span>
                ) : null}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-neutral-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-800/60 text-neutral-400">
                      <th className="text-left px-3 py-2 font-medium">Ürün</th>
                      <th className="text-right px-3 py-2 font-medium">
                        Maliyet
                      </th>
                      <th className="text-right px-3 py-2 font-medium">
                        Satış
                      </th>
                      <th className="text-center px-3 py-2 font-medium">
                        Durum
                      </th>
                      <th className="text-center px-3 py-2 font-medium">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => {
                      const dec = decisions[row.row];
                      return (
                        <tr key={i} className={statusRowCls[row.status]}>
                          {/* Name */}
                          <td className="px-3 py-2 text-neutral-200">
                            {row.name}
                            {row.status === "MATCH" &&
                              row.matchedProduct &&
                              row.name !== row.matchedProduct.name && (
                                <span className="flex items-center gap-1 text-blue-400 mt-0.5 text-[10px]">
                                  <ArrowRightLeft className="w-3 h-3" />
                                  {row.matchedProduct.name} ({row.similarity}%)
                                </span>
                              )}
                            {row.status === "UNMATCHED" &&
                              row.suggestedProduct && (
                                <span className="flex items-center gap-1 text-amber-400/80 mt-0.5 text-[10px]">
                                  <AlertTriangle className="w-3 h-3" />
                                  Öneri: {row.suggestedProduct.name} (%
                                  {row.suggestedSimilarity} benzerlik)
                                </span>
                              )}
                          </td>
                          {/* Purchase */}
                          <td className="text-right px-3 py-2 text-neutral-300 whitespace-nowrap">
                            {fmt(row.purchasePrice)}
                          </td>
                          {/* Sale */}
                          <td className="text-right px-3 py-2 text-neutral-300 whitespace-nowrap">
                            {fmt(row.salePrice)}
                          </td>
                          {/* Status badge */}
                          <td className="text-center px-3 py-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                row.status === "NEW"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : row.status === "MATCH"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : row.status === "UNMATCHED"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-neutral-700/50 text-neutral-500"
                              }`}
                            >
                              {statusLabel[row.status]}
                            </span>
                          </td>
                          {/* Action */}
                          <td className="px-3 py-2">
                            {row.status === "MATCH" && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">
                                Güncelleme
                              </span>
                            )}
                            {row.status === "NO_CHANGE" && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-700/50 text-neutral-500">
                                Değişiklik Yok
                              </span>
                            )}
                            {row.status === "NEW" && dec && (
                              <div className="flex flex-wrap gap-1">
                                <ActionBtn
                                  label="Yeni Oluştur"
                                  active={dec.action === "create"}
                                  color="green"
                                  onClick={() =>
                                    setRowDecision(row.row, "create")
                                  }
                                />
                                <ActionBtn
                                  label="Atla"
                                  active={dec.action === "skip"}
                                  color="gray"
                                  onClick={() =>
                                    setRowDecision(row.row, "skip")
                                  }
                                />
                              </div>
                            )}
                            {row.status === "UNMATCHED" && dec && (
                              <div className="flex flex-wrap gap-1">
                                <ActionBtn
                                  label="Atla"
                                  active={dec.action === "skip"}
                                  color="gray"
                                  onClick={() =>
                                    setRowDecision(row.row, "skip")
                                  }
                                />
                                <ActionBtn
                                  label="Yeni Oluştur"
                                  active={dec.action === "create"}
                                  color="green"
                                  onClick={() =>
                                    setRowDecision(row.row, "create")
                                  }
                                />
                                {row.suggestedProduct && (
                                  <ActionBtn
                                    label={`Eşleştir ↗`}
                                    active={dec.action === "link"}
                                    color="blue"
                                    onClick={() =>
                                      setRowDecision(
                                        row.row,
                                        "link",
                                        row.suggestedProduct!.id,
                                      )
                                    }
                                  />
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={handleClose} className={cancelBtnCls}>
                  İptal
                </button>
                <button
                  onClick={applyImport}
                  disabled={loading || applyTotal === 0}
                  className={submitBtnCls + " flex items-center gap-1"}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    `Uygula (${matchCount} güncelleme, ${createOrLinkCount} yeni)`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ======== STEP 4: Result ======== */}
          {step === 4 && summary && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="text-sm font-medium text-neutral-200">
                İçe aktarma tamamlandı
              </p>
              <div className="flex justify-center gap-6 text-xs">
                <div>
                  <span className="block text-lg font-bold text-emerald-400">
                    {summary.created}
                  </span>
                  <span className="text-neutral-500">Yeni</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-blue-400">
                    {summary.updated}
                  </span>
                  <span className="text-neutral-500">Güncellenen</span>
                </div>
                {summary.errors > 0 && (
                  <div>
                    <span className="block text-lg font-bold text-red-400">
                      {summary.errors}
                    </span>
                    <span className="text-neutral-500">Hata</span>
                  </div>
                )}
              </div>
              <button onClick={handleClose} className={submitBtnCls}>
                Kapat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
