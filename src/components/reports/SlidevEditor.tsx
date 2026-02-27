"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  ChevronUp,
  ChevronDown,
  Plus,
  Download,
  Eye,
  EyeOff,
  Presentation,
  FileText,
  FileCode,
  Sun,
  Moon,
  RefreshCw,
  Maximize2,
  Minimize2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlideItem {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

interface SlidevEditorProps {
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THEMES = [
  { value: "seriph", label: "Seriph" },
  { value: "default", label: "Default" },
  { value: "apple-basic", label: "Apple Basic" },
  { value: "bricks", label: "Bricks" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Slidev markdown formatını slaytlara ayır.
 */
function parseSlidevMarkdown(raw: string): SlideItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const lines = trimmed.split("\n");
  const fmStarts: number[] = [];
  let charPos = 0;
  let inCodeBlock = false;
  let inStyleBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      charPos += line.length + 1;
      continue;
    }
    if (/<style[\s>]/i.test(line)) inStyleBlock = true;
    if (/<\/style>/i.test(line)) {
      inStyleBlock = false;
      charPos += line.length + 1;
      continue;
    }
    if (!inCodeBlock && !inStyleBlock && line === "---") {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (/^[a-zA-Z_][a-zA-Z0-9_-]*\s*:/.test(nextLine)) {
          fmStarts.push(charPos);
        }
      }
    }
    charPos += line.length + 1;
  }

  if (fmStarts.length === 0) {
    const parts = trimmed.split(/\n---\n/).filter((p) => p.trim());
    return parts.map((chunk, idx) => {
      const headingMatch = chunk.match(/^#+\s+(.+)$/m);
      return {
        id: `slide-${idx}-${Date.now()}`,
        title: headingMatch?.[1] ?? `Slayt ${idx + 1}`,
        content: chunk.trim(),
        enabled: true,
      };
    });
  }

  const slideContents: string[] = [];
  for (let i = 0; i < fmStarts.length; i++) {
    const start = fmStarts[i];
    const end = i + 1 < fmStarts.length ? fmStarts[i + 1] : trimmed.length;
    const chunk = trimmed.substring(start, end).trim();
    if (chunk) slideContents.push(chunk);
  }

  return slideContents.map((chunk, idx) => {
    const bodyAfterFm = chunk.replace(/^---\n[\s\S]*?\n---\n*/m, "");
    const headingMatch = bodyAfterFm.match(/^#+\s+(.+)$/m);
    const title = headingMatch?.[1] ?? `Slayt ${idx + 1}`;
    return {
      id: `slide-${idx}-${Date.now()}`,
      title,
      content: chunk,
      enabled: true,
    };
  });
}

function extractSlideData(raw: string): {
  fm: Record<string, string>;
  body: string;
} {
  const trimmed = raw.trim();
  const fm: Record<string, string> = {};
  const fmMatch = trimmed.match(/^---\n([\s\S]*?)\n---\n*([\s\S]*)$/);
  if (fmMatch) {
    const fmBlock = fmMatch[1];
    const body = fmMatch[2] ?? "";
    for (const line of fmBlock.split("\n")) {
      const kv = line.match(/^([a-zA-Z_-]+)\s*:\s*(.+)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
    }
    return { fm, body: body.trim() };
  }
  return { fm, body: trimmed };
}

function convertMarkdownToHtml(content: string): string {
  let html = content;

  // Slidev direktiflerini temizle
  html = html.replace(/<\/?v-clicks(?:\s[^>]*)?>/g, "");
  html = html.replace(/<\/?v-click(?:\s[^>]*)?>/g, "");
  html = html.replace(/<\/?v-(?:after|mark|drag)(?:\s[^>]*)?>/g, "");

  // Style blokları ayıkla
  const styleBlocks: string[] = [];
  html = html.replace(/<style[\s\S]*?>([\s\S]*?)<\/style>/g, (_m, css) => {
    styleBlocks.push(css);
    return "";
  });

  // HTML blokları placeholder'a al (iç içe div'leri destekle)
  const htmlBlocks: string[] = [];
  function extractHtmlBlocks(input: string): string {
    let result = input;
    // Dıştaki div'leri bul — iç içe yapıları koruyarak
    const regex = /<div[\s\S]*?>/;
    let match = regex.exec(result);
    while (match) {
      const startIdx = match.index;
      let depth = 0;
      let i = startIdx;
      let endIdx = -1;
      while (i < result.length) {
        if (result.slice(i).startsWith("<div")) {
          depth++;
          i += 4;
        } else if (result.slice(i).startsWith("</div>")) {
          depth--;
          if (depth === 0) {
            endIdx = i + 6;
            break;
          }
          i += 6;
        } else {
          i++;
        }
      }
      if (endIdx === -1) break;
      const block = result.slice(startIdx, endIdx);
      const idx = htmlBlocks.length;
      htmlBlocks.push(block);
      result =
        result.slice(0, startIdx) +
        `%%HTMLBLOCK_${idx}%%` +
        result.slice(endIdx);
      match = regex.exec(result);
    }
    return result;
  }
  html = extractHtmlBlocks(html);

  // ::right:: / ::left:: two-cols layout
  if (html.includes("::right::")) {
    const parts = html.split(/^::right::\s*$/m);
    const left = parts[0] ?? "";
    const right = parts.slice(1).join("") ?? "";
    html = `%%COL_LEFT_START%%${left}%%COL_LEFT_END%%%%COL_RIGHT_START%%${right}%%COL_RIGHT_END%%`;
  }
  html = html.replace(/^::left::\s*$/gm, "");

  // Code blocks placeholder
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre><code class="language-${lang || "text"}">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim()}</code></pre>`,
    );
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Tables
  html = html.replace(
    /(?:^|\n)(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/g,
    (_m, header: string, _sep: string, body: string) => {
      const ths = header
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join("");
      const rows = body
        .trim()
        .split("\n")
        .map((row: string) => {
          const tds = row
            .split("|")
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      return `\n<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>\n`;
    },
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold & Italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Blockquotes
  html = html.replace(/^>\s?(.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(
    /(?:^|\n)((?:[-•] .+(?:\n|$))+)/g,
    (_m, block: string) => {
      const items = block
        .trim()
        .split("\n")
        .map((l: string) => `<li>${l.replace(/^[-•] /, "")}</li>`)
        .join("");
      return `\n<ul>${items}</ul>\n`;
    },
  );

  // Ordered lists
  html = html.replace(
    /(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g,
    (_m, block: string) => {
      const items = block
        .trim()
        .split("\n")
        .map((l: string) => `<li>${l.replace(/^\d+\.\s/, "")}</li>`)
        .join("");
      return `\n<ol>${items}</ol>\n`;
    },
  );

  // Paragraphs
  html = html
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t || /^</.test(t) || /^%%/.test(t)) return t;
      return `<p>${t}</p>`;
    })
    .join("\n");

  // Restore placeholders
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`%%CODEBLOCK_${idx}%%`, block);
  });

  // htmlBlocks geri konurken içindeki markdown'ı da parse et
  function parseMarkdownInsideBlock(block: string): string {
    // HTML tag'lerini tokenize et, aradaki text segmentlerini markdown olarak parse et
    const tagRegex = /<\/?[a-zA-Z][^>]*>/g;
    const segments: { type: "tag" | "text"; value: string }[] = [];
    let lastIndex = 0;
    let tagMatch: RegExpExecArray | null;

    while ((tagMatch = tagRegex.exec(block)) !== null) {
      if (tagMatch.index > lastIndex) {
        segments.push({
          type: "text",
          value: block.slice(lastIndex, tagMatch.index),
        });
      }
      segments.push({ type: "tag", value: tagMatch[0] });
      lastIndex = tagRegex.lastIndex;
    }
    if (lastIndex < block.length) {
      segments.push({ type: "text", value: block.slice(lastIndex) });
    }

    return segments
      .map((seg) => {
        if (seg.type === "tag") return seg.value;
        if (!seg.value.trim()) return seg.value;

        let parsed = seg.value;

        // Code blocks
        parsed = parsed.replace(
          /```(\w*)\n([\s\S]*?)```/g,
          (_cm: string, lang: string, code: string) =>
            `<pre><code class="language-${lang || "text"}">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim()}</code></pre>`,
        );

        // Tables
        parsed = parsed.replace(
          /(?:^|\n)(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/g,
          (_tm: string, header: string, _sep: string, body: string) => {
            const ths = header
              .split("|")
              .filter((c: string) => c.trim())
              .map((c: string) => `<th>${c.trim()}</th>`)
              .join("");
            const rows = body
              .trim()
              .split("\n")
              .map((row: string) => {
                const tds = row
                  .split("|")
                  .filter((c: string) => c.trim())
                  .map((c: string) => `<td>${c.trim()}</td>`)
                  .join("");
                return `<tr>${tds}</tr>`;
              })
              .join("");
            return `\n<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>\n`;
          },
        );

        // Headings
        parsed = parsed.replace(/^### (.+)$/gm, "<h3>$1</h3>");
        parsed = parsed.replace(/^## (.+)$/gm, "<h2>$1</h2>");
        parsed = parsed.replace(/^# (.+)$/gm, "<h1>$1</h1>");

        // Bold & Italic
        parsed = parsed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        parsed = parsed.replace(
          /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
          "<em>$1</em>",
        );

        // Unordered lists
        parsed = parsed.replace(
          /(?:^|\n)((?:[-•] .+(?:\n|$))+)/g,
          (_lm: string, listBlock: string) => {
            const items = listBlock
              .trim()
              .split("\n")
              .map((l: string) => `<li>${l.replace(/^[-•] /, "")}</li>`)
              .join("");
            return `\n<ul>${items}</ul>\n`;
          },
        );

        // Ordered lists
        parsed = parsed.replace(
          /(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g,
          (_lm: string, listBlock: string) => {
            const items = listBlock
              .trim()
              .split("\n")
              .map((l: string) => `<li>${l.replace(/^\d+\.\s/, "")}</li>`)
              .join("");
            return `\n<ol>${items}</ol>\n`;
          },
        );

        // Inline code
        parsed = parsed.replace(/`([^`]+)`/g, "<code>$1</code>");

        return parsed;
      })
      .join("");
  }

  htmlBlocks.forEach((block, idx) => {
    // Önce iç içe htmlBlock placeholder'ları çöz
    let resolved = block;
    htmlBlocks.forEach((innerBlock, innerIdx) => {
      if (innerIdx !== idx) {
        resolved = resolved.replace(`%%HTMLBLOCK_${innerIdx}%%`, innerBlock);
      }
    });
    // İçindeki markdown'ı parse et
    const parsed = parseMarkdownInsideBlock(resolved);
    html = html.replace(`%%HTMLBLOCK_${idx}%%`, parsed);
  });
  html = html.replace(/%%COL_LEFT_START%%/g, '<div class="col-left">');
  html = html.replace(/%%COL_LEFT_END%%/g, "</div>");
  html = html.replace(/%%COL_RIGHT_START%%/g, '<div class="col-right">');
  html = html.replace(/%%COL_RIGHT_END%%/g, "</div>");

  if (styleBlocks.length > 0) {
    html = `<style>${styleBlocks.join("\n")}</style>\n${html}`;
  }
  return html;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlidevEditor({ onClose }: SlidevEditorProps) {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [presentationTitle, setPresentationTitle] =
    useState("Royal Cabana Sunum");
  const [theme, setTheme] = useState("seriph");
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");
  const [exporting, setExporting] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 320)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [activeSlideIndex, slides, autoResize]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewFullscreen) setPreviewFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, previewFullscreen]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Auto-load
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const res = await fetch("/api/reports/presentation/preview/slidev");
        if (!res.ok) throw new Error("Veri yüklenemedi.");
        const data = await res.json();
        const md =
          typeof data === "string"
            ? data
            : ((data as { markdown?: string }).markdown ?? "");
        if (!md) throw new Error("Markdown verisi boş.");
        if (cancelled) return;
        const parsed = parseSlidevMarkdown(md);
        if (parsed.length > 0) {
          setSlides(parsed);
          setActiveSlideIndex(0);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        setFeedback({
          type: "error",
          msg:
            e instanceof Error ? e.message : "Veriler yüklenirken hata oluştu.",
        });
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSlide = slides[activeSlideIndex];
  const enabledCount = slides.filter((s) => s.enabled).length;
  const charCount = activeSlide?.content.length ?? 0;

  const updateSlideContent = useCallback(
    (content: string) => {
      setSlides((prev) =>
        prev.map((s, i) => (i === activeSlideIndex ? { ...s, content } : s)),
      );
    },
    [activeSlideIndex],
  );

  const toggleSlide = useCallback((index: number) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s)),
    );
  }, []);

  const moveSlide = useCallback(
    (index: number, direction: "up" | "down") => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= slides.length) return;
      setSlides((prev) => {
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      if (activeSlideIndex === index) setActiveSlideIndex(target);
      else if (activeSlideIndex === target) setActiveSlideIndex(index);
    },
    [slides.length, activeSlideIndex],
  );

  const addSlide = useCallback(() => {
    const newSlide: SlideItem = {
      id: `custom-${Date.now()}`,
      title: `Özel Slayt ${slides.length + 1}`,
      content:
        "---\nlayout: default\n---\n\n# Yeni Slayt\n\nİçeriğinizi buraya yazın.",
      enabled: true,
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
  }, [slides.length]);

  const buildMarkdown = useCallback(() => {
    const enabled = slides.filter((s) => s.enabled);
    if (enabled.length === 0) return "";
    return enabled.map((s) => s.content.trim()).join("\n\n");
  }, [slides]);

  const handleReload = useCallback(async () => {
    setInitialLoading(true);
    try {
      const res = await fetch("/api/reports/presentation/preview/slidev");
      if (!res.ok) throw new Error("Veri yüklenemedi.");
      const data = await res.json();
      const md =
        typeof data === "string"
          ? data
          : ((data as { markdown?: string }).markdown ?? "");
      if (!md) throw new Error("Markdown verisi boş.");
      const parsed = parseSlidevMarkdown(md);
      if (parsed.length > 0) {
        setSlides(parsed);
        setActiveSlideIndex(0);
        setFeedback({
          type: "success",
          msg: `${parsed.length} slayt veritabanından yeniden yüklendi.`,
        });
      }
    } catch (e: unknown) {
      setFeedback({
        type: "error",
        msg: e instanceof Error ? e.message : "Yeniden yükleme hatası.",
      });
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const handlePreview = useCallback(() => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const enabled = slides.filter((s) => s.enabled);
      if (enabled.length === 0) {
        setFeedback({ type: "error", msg: "Aktif slayt yok." });
        return;
      }

      const slideHtmlParts = enabled.map((slide, idx) => {
        const { fm, body } = extractSlideData(slide.content);
        const layout = fm.layout ?? "default";
        const slideClass = fm.class ?? "";
        const bodyHtml = convertMarkdownToHtml(body);
        const hasTwoCols =
          layout === "two-cols" || bodyHtml.includes('class="col-left"');
        return `<div class="slide ${layout} ${slideClass}" id="slide-${idx}">
          <div class="slide-number">${idx + 1}</div>
          <div class="slide-content ${hasTwoCols ? "two-cols-grid" : ""}">${bodyHtml}</div>
        </div>`;
      });

      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
/* === Reset & Base === */
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#111;color:#e0e0e0;padding:24px}

/* === Slide Layout === */
.slide{background:#1a1a2e;border-radius:12px;padding:48px;margin-bottom:32px;min-height:400px;position:relative;box-shadow:0 4px 24px rgba(0,0,0,.4);overflow:hidden}
.slide-number{position:absolute;top:16px;right:20px;font-size:13px;color:#888;z-index:10}
.slide-content{line-height:1.7}
.slide.cover,.slide.end,.slide.center{text-align:center;display:flex;align-items:center;justify-content:center;flex-direction:column}
.slide.cover .slide-content,.slide.center .slide-content{max-width:80%}
.two-cols-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.col-left,.col-right{min-width:0}

/* === Typography === */
h1{font-size:2em;margin-bottom:16px;color:#fff}
h2{font-size:1.5em;margin-bottom:12px;color:#f0f0f0}
h3{font-size:1.2em;margin-bottom:8px;color:#ddd}
p{margin-bottom:8px}
ul,ol{padding-left:24px;margin-bottom:12px}
li{margin-bottom:4px}
strong{color:#60a5fa}
em{font-style:italic;color:#ccc}
code{background:#2d2d44;padding:2px 6px;border-radius:4px;font-size:.9em}
pre{background:#0d1117;padding:16px;border-radius:8px;overflow-x:auto;margin:12px 0}
pre code{background:none;padding:0}
blockquote{border-left:3px solid #60a5fa;padding-left:16px;color:#aaa;margin:12px 0}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{border:1px solid #333;padding:8px 12px;text-align:left}
th{background:#2d2d44}

/* === Tailwind Grid === */
.grid{display:grid}
.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.gap-2{gap:.5rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.gap-5{gap:1.25rem}.gap-6{gap:1.5rem}.gap-8{gap:2rem}

/* === Tailwind Flexbox === */
.flex{display:flex}
.inline-flex{display:inline-flex}
.flex-col{flex-direction:column}
.items-center{align-items:center}
.justify-center{justify-content:center}
.justify-between{justify-content:space-between}

/* === Tailwind Spacing === */
.m-4{margin:1rem}.m-6{margin:1.5rem}
.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}
.ml-4{margin-left:1rem}
.mr-2{margin-right:.5rem}
.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.mt-8{margin-top:2rem}.mt-12{margin-top:3rem}
.p-2{padding:.5rem}.p-4{padding:1rem}.p-5{padding:1.25rem}
.px-2{padding-left:.5rem;padding-right:.5rem}.px-4{padding-left:1rem;padding-right:1rem}
.py-0\\.5{padding-top:.125rem;padding-bottom:.125rem}
.py-2{padding-top:.5rem;padding-bottom:.5rem}
.pt-8{padding-top:2rem}

/* === Tailwind Sizing === */
.text-xs{font-size:.75rem;line-height:1rem}
.text-sm{font-size:.875rem;line-height:1.25rem}
.text-lg{font-size:1.125rem;line-height:1.75rem}
.text-xl{font-size:1.25rem;line-height:1.75rem}
.text-2xl{font-size:1.5rem;line-height:2rem}
.text-3xl{font-size:1.875rem;line-height:2.25rem}
.text-4xl{font-size:2.25rem;line-height:2.5rem}

/* === Tailwind Font === */
.font-bold{font-weight:700}
.font-medium{font-weight:500}

/* === Tailwind Text Align === */
.text-center{text-align:center}
.text-left{text-align:left}

/* === Tailwind Colors === */
.text-white{color:#fff}
.text-amber-300{color:#fcd34d}.text-amber-400{color:#fbbf24}
.text-blue-300{color:#93c5fd}.text-blue-400{color:#60a5fa}
.text-green-300{color:#86efac}.text-green-400{color:#4ade80}
.text-yellow-300{color:#fde047}.text-yellow-400{color:#facc15}
.text-red-300{color:#fca5a5}.text-red-400{color:#f87171}
.text-purple-400{color:#c084fc}
.text-neutral-300{color:#d4d4d4}.text-neutral-400{color:#a3a3a3}.text-neutral-500{color:#737373}

/* === Tailwind Backgrounds === */
.bg-white\\/5{background:rgba(255,255,255,.05)}
.bg-white\\/10{background:rgba(255,255,255,.1)}
.bg-blue-500\\/10{background:rgba(59,130,246,.1)}
.bg-green-500\\/10{background:rgba(34,197,94,.1)}
.bg-yellow-500\\/10{background:rgba(234,179,8,.1)}
.bg-red-500\\/10{background:rgba(239,68,68,.1)}
.bg-purple-500\\/10{background:rgba(168,85,247,.1)}
.bg-amber-500\\/10{background:rgba(245,158,11,.1)}
.bg-amber-500\\/20{background:rgba(245,158,11,.2)}

/* === Tailwind Borders === */
.border{border:1px solid}
.border-white\\/10{border-color:rgba(255,255,255,.1)}
.border-blue-500\\/30{border-color:rgba(59,130,246,.3)}
.border-green-500\\/30{border-color:rgba(34,197,94,.3)}
.border-yellow-500\\/30{border-color:rgba(234,179,8,.3)}
.border-red-500\\/30{border-color:rgba(239,68,68,.3)}
.border-purple-500\\/30{border-color:rgba(168,85,247,.3)}
.border-amber-500\\/30{border-color:rgba(245,158,11,.3)}

/* === Tailwind Border Radius === */
.rounded{border-radius:.25rem}
.rounded-lg{border-radius:.5rem}
.rounded-xl{border-radius:.75rem}
.rounded-full{border-radius:9999px}

/* === Tailwind Opacity & Effects === */
.opacity-50{opacity:.5}
.backdrop-blur{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}

/* === Tailwind Position === */
.relative{position:relative}
.absolute{position:absolute}
.abs-br{position:absolute;bottom:0;right:0}
.abs-bl{position:absolute;bottom:0;left:0}

/* === Tailwind Spacing Utilities === */
.space-y-1>*+*{margin-top:.25rem}
.space-y-2>*+*{margin-top:.5rem}

/* === Tailwind Overflow === */
.overflow-hidden{overflow:hidden}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style></head><body>${slideHtmlParts.join("")}</body></html>`;

      setPreviewHtml(fullHtml);
      setShowPreview(true);
    } finally {
      setPreviewLoading(false);
    }
  }, [showPreview, slides]);

  const handleExport = useCallback(
    async (format: "md" | "html") => {
      setExporting(format);
      try {
        if (format === "md") {
          const md = buildMarkdown();
          if (!md) {
            setFeedback({ type: "error", msg: "Aktif slayt yok." });
            return;
          }
          const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
          await downloadBlob(
            blob,
            `${presentationTitle.replace(/\s+/g, "_")}.md`,
          );
          setFeedback({ type: "success", msg: "Markdown indirildi." });
        } else {
          if (!previewHtml) {
            setFeedback({ type: "error", msg: "Önce önizleme oluşturun." });
            return;
          }
          const blob = new Blob([previewHtml], {
            type: "text/html;charset=utf-8",
          });
          await downloadBlob(
            blob,
            `${presentationTitle.replace(/\s+/g, "_")}.html`,
          );
          setFeedback({ type: "success", msg: "HTML indirildi." });
        }
      } catch {
        setFeedback({ type: "error", msg: "İndirme hatası." });
      } finally {
        setExporting(null);
      }
    },
    [buildMarkdown, presentationTitle, previewHtml],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-white">Sunum verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-72 flex-col border-r border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-blue-400" />
            <span className="text-sm font-medium text-white">Slaytlar</span>
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
              {enabledCount}/{slides.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            title="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => setActiveSlideIndex(idx)}
              className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                idx === activeSlideIndex
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              } ${!slide.enabled ? "opacity-40" : ""}`}
            >
              <span className="w-5 shrink-0 text-center text-xs text-gray-500">
                {idx + 1}
              </span>
              <span className="flex-1 truncate">{slide.title}</span>
              <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSlide(idx, "up");
                  }}
                  disabled={idx === 0}
                  className="rounded p-0.5 hover:bg-gray-700 disabled:opacity-30"
                  title="Yukarı"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSlide(idx, "down");
                  }}
                  disabled={idx === slides.length - 1}
                  className="rounded p-0.5 hover:bg-gray-700 disabled:opacity-30"
                  title="Aşağı"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSlide(idx);
                  }}
                  className="rounded p-0.5 hover:bg-gray-700"
                  title={slide.enabled ? "Devre dışı bırak" : "Etkinleştir"}
                >
                  {slide.enabled ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 p-2">
          <button
            onClick={addSlide}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" /> Slayt Ekle
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-2">
          <div className="flex items-center gap-3">
            <input
              value={presentationTitle}
              onChange={(e) => setPresentationTitle(e.target.value)}
              className="bg-transparent text-sm font-medium text-white outline-none"
              aria-label="Sunum başlığı"
            />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300"
              aria-label="Tema seçimi"
            >
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                setColorScheme((c) => (c === "dark" ? "light" : "dark"))
              }
              className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
              title={colorScheme === "dark" ? "Açık tema" : "Koyu tema"}
            >
              {colorScheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReload}
              className="flex items-center gap-1.5 rounded bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
              title="Veritabanından yeniden yükle"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Yenile
            </button>
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs ${showPreview ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              <Eye className="h-3.5 w-3.5" />{" "}
              {showPreview ? "Düzenle" : "Önizle"}
            </button>
            <button
              onClick={() => handleExport("md")}
              disabled={!!exporting}
              className="flex items-center gap-1.5 rounded bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />{" "}
              {exporting === "md" ? "..." : "MD"}
            </button>
            <button
              onClick={() => handleExport("html")}
              disabled={!!exporting}
              className="flex items-center gap-1.5 rounded bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            >
              <FileCode className="h-3.5 w-3.5" />{" "}
              {exporting === "html" ? "..." : "HTML"}
            </button>
            <button
              onClick={() => {
                const md = buildMarkdown();
                if (md) {
                  const blob = new Blob([md], { type: "text/markdown" });
                  downloadBlob(blob, "presentation.md");
                }
              }}
              className="flex items-center gap-1.5 rounded bg-green-700 px-3 py-1.5 text-xs text-white hover:bg-green-600"
            >
              <Download className="h-3.5 w-3.5" /> İndir
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mx-4 mt-2 rounded-lg px-4 py-2 text-sm ${feedback.type === "success" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {showPreview ? (
            <div
              className={`relative h-full ${previewFullscreen ? "fixed inset-0 z-[60] bg-black" : ""}`}
            >
              <div className="absolute right-4 top-4 z-10">
                <button
                  onClick={() => setPreviewFullscreen((f) => !f)}
                  className="rounded bg-gray-800/80 p-2 text-gray-300 hover:bg-gray-700"
                  title={previewFullscreen ? "Küçült" : "Tam ekran"}
                >
                  {previewFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full border-0"
                title="Sunum Önizleme"
                sandbox="allow-same-origin"
              />
            </div>
          ) : activeSlide ? (
            <div className="flex h-full flex-col p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Slayt {activeSlideIndex + 1} / {slides.length} — {charCount}{" "}
                  karakter
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={activeSlide.content}
                onChange={(e) => updateSlideContent(e.target.value)}
                onInput={autoResize}
                className="flex-1 resize-none rounded-lg border border-gray-800 bg-gray-900 p-4 font-mono text-sm text-gray-200 outline-none focus:border-blue-600"
                spellCheck={false}
                aria-label={`Slayt ${activeSlideIndex + 1} içeriği`}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Slayt seçin veya yeni bir slayt ekleyin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
