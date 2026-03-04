"use client";

import { useState, useCallback, useEffect } from "react";
import {
  X,
  Download,
  FileText,
  FileCode,
  Maximize2,
  Minimize2,
  RefreshCw,
  Loader2,
  Presentation,
  FileSpreadsheet,
} from "lucide-react";

interface SystemPresentationProps {
  onClose: () => void;
}

async function downloadFromUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`İndirme hatası: ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export default function SystemPresentation({ onClose }: SystemPresentationProps) {
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const loadPresentation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/presentation/comprehensive?format=html");
      if (!res.ok) throw new Error("Sunum yüklenemedi.");
      const html = await res.text();
      setPreviewHtml(html);
    } catch (e: unknown) {
      setFeedback({
        type: "error",
        msg: e instanceof Error ? e.message : "Sunum yüklenirken hata oluştu.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresentation();
  }, [loadPresentation]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, fullscreen]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleExport = useCallback(async (format: "html" | "pptx" | "pdf") => {
    setExporting(format);
    try {
      if (format === "html") {
        if (!previewHtml) {
          setFeedback({ type: "error", msg: "Önce sunum yüklenmelidir." });
          return;
        }
        const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Royal-Cabana-Sistem-Sunumu.html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setFeedback({ type: "success", msg: "HTML sunum indirildi." });
      } else if (format === "pptx") {
        await downloadFromUrl(
          "/api/reports/presentation/comprehensive?format=pptx",
          "Royal-Cabana-Sistem-Sunumu.pptx",
        );
        setFeedback({ type: "success", msg: "PowerPoint sunum indirildi." });
      } else if (format === "pdf") {
        await downloadFromUrl(
          "/api/reports/presentation/comprehensive?format=pdf",
          "Royal-Cabana-Sistem-Sunumu.pdf",
        );
        setFeedback({ type: "success", msg: "PDF sunum indirildi." });
      }
    } catch (e: unknown) {
      setFeedback({
        type: "error",
        msg: e instanceof Error ? e.message : "İndirme sırasında hata oluştu.",
      });
    } finally {
      setExporting(null);
    }
  }, [previewHtml]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-white text-sm">Sistem sunumu hazırlanıyor...</p>
          <p className="text-neutral-500 text-xs">Tüm veriler veritabanından çekiliyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <Presentation className="h-5 w-5 text-amber-500" />
          <div>
            <span className="text-sm font-semibold text-white">Sistem Tanıtım Sunumu</span>
            <span className="text-xs text-neutral-500 ml-2">Otomatik — Tüm Sistem</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Reload */}
          <button
            onClick={loadPresentation}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 transition-colors"
            title="Yeniden yükle"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Yenile
          </button>

          {/* HTML Download */}
          <button
            onClick={() => handleExport("html")}
            disabled={!!exporting}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            title="HTML olarak indir"
          >
            {exporting === "html" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileCode className="h-3.5 w-3.5" />
            )}
            HTML
          </button>

          {/* PPTX Download */}
          <button
            onClick={() => handleExport("pptx")}
            disabled={!!exporting}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            title="PowerPoint olarak indir"
          >
            {exporting === "pptx" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            PPTX
          </button>

          {/* PDF Download */}
          <button
            onClick={() => handleExport("pdf")}
            disabled={!!exporting}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            title="PDF olarak indir"
          >
            {exporting === "pdf" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            PDF
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="rounded-lg bg-neutral-800 p-1.5 text-neutral-300 hover:bg-neutral-700 transition-colors"
            title={fullscreen ? "Küçült" : "Tam ekran"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-800 p-1.5 text-neutral-400 hover:bg-red-900/50 hover:text-red-400 transition-colors"
            title="Kapat (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mx-4 mt-2 rounded-lg px-4 py-2 text-sm shrink-0 ${
            feedback.type === "success"
              ? "bg-green-900/40 text-green-300 border border-green-800/50"
              : "bg-red-900/40 text-red-300 border border-red-800/50"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Presentation Viewer */}
      <div className={`flex-1 overflow-hidden ${fullscreen ? "fixed inset-0 z-[60]" : ""}`}>
        {fullscreen && (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <button
              onClick={() => setFullscreen(false)}
              className="rounded-lg bg-black/70 p-2 text-neutral-300 hover:bg-black/90 transition-colors backdrop-blur"
              title="Tam ekrandan çık (Esc)"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
        )}
        <iframe
          srcDoc={previewHtml}
          className="h-full w-full border-0"
          title="Sistem Tanıtım Sunumu"
          sandbox="allow-same-origin"
        />
      </div>

      {/* Bottom Bar with Download All */}
      <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900/80 px-4 py-2 shrink-0">
        <span className="text-xs text-neutral-500">
          Otomatik oluşturulan sistem tanıtım sunumu — Otel üst yönetimi ve kullanıcılar için
        </span>
        <button
          onClick={() => handleExport("pptx")}
          disabled={!!exporting}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "İndiriliyor..." : "Sunumu İndir (PPTX)"}
        </button>
      </div>
    </div>
  );
}
