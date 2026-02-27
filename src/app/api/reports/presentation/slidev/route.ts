import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import {
  generateSlidevMarkdown,
  generateSlidevMarkdownCustom,
  type SlideType,
} from "@/services/slidev-presentation.service";
import { execSync } from "child_process";
import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
  rmSync,
  readdirSync,
} from "fs";
import path from "path";

// Slidev workspace — proje kökünde geçici dizin
const WORKSPACE_DIR = path.join(process.cwd(), "slidev-workspace");
const SLIDES_PATH = path.join(WORKSPACE_DIR, "slides.md");
const SLIDEV_BIN = path.join(process.cwd(), "node_modules", ".bin", "slidev");

/**
 * Slidev workspace'i hazırla: dizin, slides.md ve minimal package.json oluştur.
 */
function prepareSlidevWorkspace(markdown: string): void {
  if (!existsSync(WORKSPACE_DIR)) {
    mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  writeFileSync(SLIDES_PATH, markdown, "utf-8");

  const pkgPath = path.join(WORKSPACE_DIR, "package.json");
  if (!existsSync(pkgPath)) {
    const pkg = {
      name: "royal-cabana-slidev",
      private: true,
      scripts: {
        dev: "slidev",
        build: "slidev build",
        export: "slidev export",
      },
    };
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
  }
}

/**
 * Geçici workspace'i temizle.
 */
function cleanupWorkspace(): void {
  try {
    if (existsSync(WORKSPACE_DIR)) {
      rmSync(WORKSPACE_DIR, { recursive: true, force: true });
    }
  } catch {
    // Temizleme hatası kritik değil
  }
}

/**
 * dist dizinindeki index.html'i döndür (Windows uyumlu — tar komutu yok).
 * Eğer index.html yoksa ilk HTML dosyasını döndür.
 */
function readDistHtml(distDir: string): Buffer | null {
  const indexPath = path.join(distDir, "index.html");
  if (existsSync(indexPath)) {
    return readFileSync(indexPath);
  }
  // Fallback: ilk .html dosyasını bul
  const files = readdirSync(distDir);
  const htmlFile = files.find((f) => f.endsWith(".html"));
  if (htmlFile) {
    return readFileSync(path.join(distDir, htmlFile));
  }
  return null;
}

export const POST = withAuth([Role.SYSTEM_ADMIN], async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "md";

  try {
    // Body'den özelleştirme opsiyonlarını al
    let body: {
      title?: string;
      slides?: string[];
      markdown?: string;
      theme?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      // Body boş olabilir — varsayılanlarla devam
    }

    // Editörden gelen markdown varsa direkt kullan, yoksa DB'den üret
    let markdown: string;
    if (
      body.markdown &&
      typeof body.markdown === "string" &&
      body.markdown.trim().length > 0
    ) {
      markdown = body.markdown;
    } else if (body.title || body.slides) {
      markdown = await generateSlidevMarkdownCustom({
        title: body.title,
        slides: body.slides as SlideType[],
      });
    } else {
      markdown = await generateSlidevMarkdown();
    }

    // Tema editörden geldiyse frontmatter'a uygula
    if (body.theme && typeof body.theme === "string") {
      markdown = applyThemeToMarkdown(markdown, body.theme);
    }

    // Sadece markdown isteniyorsa direkt dön
    if (format === "md") {
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="royal-cabana-slides.md"',
        },
      });
    }

    // HTML veya PDF için workspace hazırla
    prepareSlidevWorkspace(markdown);

    if (format === "html") {
      // Slidev build → statik SPA
      const distDir = path.join(WORKSPACE_DIR, "dist");

      execSync(`"${SLIDEV_BIN}" build "${SLIDES_PATH}" --base / --out dist`, {
        cwd: WORKSPACE_DIR,
        timeout: 120_000,
        stdio: "pipe",
      });

      if (!existsSync(distDir)) {
        return NextResponse.json(
          {
            error: "Slidev build başarısız oldu. dist klasörü oluşturulamadı.",
          },
          { status: 500 },
        );
      }

      // Windows uyumlu: tar yerine index.html döndür
      const htmlBuffer = readDistHtml(distDir);
      cleanupWorkspace();

      if (!htmlBuffer) {
        return NextResponse.json(
          { error: "Build çıktısında HTML dosyası bulunamadı." },
          { status: 500 },
        );
      }

      return new NextResponse(htmlBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="royal-cabana-slides.html"',
        },
      });
    }

    if (format === "pdf") {
      // Slidev export → PDF
      const pdfPath = path.join(WORKSPACE_DIR, "slides-export.pdf");

      execSync(
        `"${SLIDEV_BIN}" export "${SLIDES_PATH}" --format pdf --output "${pdfPath}"`,
        {
          cwd: WORKSPACE_DIR,
          timeout: 120_000,
          stdio: "pipe",
        },
      );

      if (!existsSync(pdfPath)) {
        return NextResponse.json(
          { error: "PDF export başarısız oldu." },
          { status: 500 },
        );
      }

      const pdfBuffer = readFileSync(pdfPath);
      cleanupWorkspace();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="royal-cabana-slides.pdf"',
        },
      });
    }

    // Bilinmeyen format
    return NextResponse.json(
      { error: `Desteklenmeyen format: ${format}. Geçerli: md, html, pdf` },
      { status: 400 },
    );
  } catch (error) {
    cleanupWorkspace();
    console.error("[Slidev Presentation] Export hatası:", error);

    const message = error instanceof Error ? error.message : "Bilinmeyen hata";

    return NextResponse.json(
      { error: `Sunum oluşturulurken hata oluştu: ${message}` },
      { status: 500 },
    );
  }
});

/**
 * Markdown'daki ilk frontmatter bloğunda theme değerini güncelle.
 * Eğer frontmatter yoksa başa ekle.
 */
function applyThemeToMarkdown(markdown: string, theme: string): string {
  // İlk frontmatter bloğunu bul: --- ... ---
  const fmRegex = /^---\n([\s\S]*?)\n---/;
  const match = markdown.match(fmRegex);

  if (match) {
    const frontmatter = match[1];
    // theme satırını güncelle veya ekle
    if (/^theme:/m.test(frontmatter)) {
      const updated = frontmatter.replace(/^theme:.*$/m, `theme: ${theme}`);
      return markdown.replace(fmRegex, `---\n${updated}\n---`);
    }
    // theme yoksa ekle
    return markdown.replace(
      fmRegex,
      `---\ntheme: ${theme}\n${frontmatter}\n---`,
    );
  }

  // Frontmatter yoksa başa ekle
  return `---\ntheme: ${theme}\n---\n\n${markdown}`;
}
