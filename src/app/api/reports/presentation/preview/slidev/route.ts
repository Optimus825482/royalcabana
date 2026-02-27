import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import {
  generateSlidevMarkdown,
  ALL_SLIDE_TYPES,
  SLIDE_LABELS,
} from "@/services/slidev-presentation.service";

export const GET = withAuth([Role.SYSTEM_ADMIN], async () => {
  try {
    const markdown = await generateSlidevMarkdown();

    // Slide sayısını hesapla — Slidev'de her `---` separator bir slide ayırır
    // İlk frontmatter bloğu da bir slide sayılır
    const slideCount = markdown.split(/\n---\n/).length;

    return NextResponse.json({
      markdown,
      slideCount,
      availableSlideTypes: [...ALL_SLIDE_TYPES].map((type) => ({
        value: type,
        label: SLIDE_LABELS[type],
      })),
      formats: [
        {
          value: "md",
          label: "Markdown (.md)",
          description: "Slidev kaynak dosyası",
        },
        {
          value: "html",
          label: "HTML (SPA)",
          description: "Statik web sunumu",
        },
        { value: "pdf", label: "PDF", description: "PDF dokümanı" },
      ],
    });
  } catch (error) {
    console.error("[Slidev Preview] Veri çekme hatası:", error);

    return NextResponse.json(
      { error: "Sunum önizleme verisi oluşturulamadı." },
      { status: 500 },
    );
  }
});
