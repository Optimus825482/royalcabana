import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";

type MatchStatus = "MATCH" | "NO_CHANGE" | "NEW" | "UNMATCHED";

interface ImportItem {
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

interface UserDecision {
  row: number;
  action: "create" | "skip" | "link";
  linkProductId?: string;
}

// --- Fuzzy matching helpers ---

const TURKISH_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TURKISH_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function levenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  // Use single-row DP for memory efficiency
  let prev = new Array<number>(lenB + 1);
  let curr = new Array<number>(lenB + 1);

  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lenB];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Exact normalized match
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;

  // One contains the other
  if (na.includes(nb) || nb.includes(na)) {
    const longer = Math.max(na.length, nb.length);
    const shorter = Math.min(na.length, nb.length);
    return shorter / longer;
  }

  // Levenshtein distance-based similarity
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshteinDistance(na, nb);
  return 1 - dist / maxLen;
}

function findBestMatch(
  name: string,
  products: {
    id: string;
    name: string;
    purchasePrice: number;
    salePrice: number;
  }[],
): { product: (typeof products)[number]; score: number } | null {
  const normalizedName = normalize(name);
  let best: { product: (typeof products)[number]; score: number } | null = null;

  for (const p of products) {
    const score = similarity(normalizedName, normalize(p.name));
    if (score > (best?.score ?? 0)) {
      best = { product: p, score };
    }
  }

  return best && best.score >= 0.4 ? best : null;
}

// --- File parsing ---

interface ParsedRow {
  name: string;
  purchasePrice: number;
  salePrice: number;
}

function parseFile(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Dosyada sayfa bulunamadı.");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (rows.length === 0) throw new Error("Dosya boş.");

  const results: ParsedRow[] = [];

  for (const row of rows) {
    // Flexible column name matching
    const name = findColumn(row, [
      "name",
      "ürün",
      "urun",
      "ürün adı",
      "urun adi",
      "product",
      "ürün ad",
      "ad",
    ]);
    const purchase = findNumericColumn(row, [
      "purchaseprice",
      "alış",
      "alis",
      "alış fiyatı",
      "alis fiyati",
      "purchase",
      "maliyet",
      "cost",
      "alış fiyat",
      "alis fiyat",
    ]);
    const sale = findNumericColumn(row, [
      "saleprice",
      "satış",
      "satis",
      "satış fiyatı",
      "satis fiyati",
      "sale",
      "fiyat",
      "price",
      "satış fiyat",
      "satis fiyat",
    ]);

    if (!name || name.toString().trim() === "") continue;

    results.push({
      name: String(name).trim(),
      purchasePrice: purchase,
      salePrice: sale,
    });
  }

  return results;
}

function findColumn(
  row: Record<string, unknown>,
  candidates: string[],
): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find((k) => normalize(k) === normalize(candidate));
    if (found !== undefined) return row[found];
  }
  return undefined;
}

function findNumericColumn(
  row: Record<string, unknown>,
  candidates: string[],
): number {
  const val = findColumn(row, candidates);
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(
    String(val)
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return isNaN(num) ? 0 : num;
}

// --- Main handler ---

export const POST = withAuth(
  [Role.SYSTEM_ADMIN],
  async (req, { session }) => {
    const url = new URL(req.url);
    const isPreview = url.searchParams.get("preview") === "true";

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Dosya yüklenmedi. 'file' alanı gerekli." },
        { status: 400 },
      );
    }

    // File size check — max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Dosya boyutu 10MB'ı aşamaz." },
        { status: 400 },
      );
    }

    const filename = file.name.toLowerCase();
    if (
      !filename.endsWith(".xlsx") &&
      !filename.endsWith(".csv") &&
      !filename.endsWith(".xls")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Desteklenmeyen dosya formatı. .xlsx, .xls veya .csv yükleyin.",
        },
        { status: 400 },
      );
    }

    let parsedRows: ParsedRow[];
    try {
      const buffer = await file.arrayBuffer();
      parsedRows = parseFile(buffer);
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: `Dosya okunamadı: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`,
        },
        { status: 400 },
      );
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Dosyada geçerli ürün satırı bulunamadı." },
        { status: 400 },
      );
    }

    // Parse user decisions for apply mode
    let decisions: UserDecision[] = [];
    if (!isPreview) {
      const decisionsStr = formData.get("decisions") as string | null;
      if (decisionsStr) {
        try {
          decisions = JSON.parse(decisionsStr);
        } catch {
          return NextResponse.json(
            { success: false, error: "Geçersiz decisions JSON formatı." },
            { status: 400 },
          );
        }
      }
    }

    // Build decisions lookup by row number
    const decisionMap = new Map<number, UserDecision>(
      decisions.map((d) => [d.row, d]),
    );

    // Fetch all existing products for matching
    const existingProducts = await prisma.product.findMany({
      select: { id: true, name: true, purchasePrice: true, salePrice: true },
    });

    const dbProducts = existingProducts.map((p) => ({
      id: p.id,
      name: p.name,
      purchasePrice: Number(p.purchasePrice),
      salePrice: Number(p.salePrice),
    }));

    // Analyze each row
    const items: ImportItem[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const item: ImportItem = {
        row: i + 2, // +2 for header row + 0-index
        name: row.name,
        purchasePrice: row.purchasePrice,
        salePrice: row.salePrice,
        status: "NEW",
      };

      if (row.purchasePrice <= 0 && row.salePrice <= 0) {
        item.status = "NEW";
        item.error = "Fiyat bilgisi eksik";
        items.push(item);
        continue;
      }

      const match = findBestMatch(row.name, dbProducts);

      if (match) {
        if (match.score >= 0.7) {
          // Confident match
          item.matchedProduct = match.product;
          item.similarity = Math.round(match.score * 100);

          const priceChanged =
            row.purchasePrice !== match.product.purchasePrice ||
            row.salePrice !== match.product.salePrice;

          item.status = priceChanged ? "MATCH" : "NO_CHANGE";
        } else {
          // Uncertain match (0.4 <= score < 0.7) — suggest to user
          item.status = "UNMATCHED";
          item.suggestedProduct = match.product;
          item.suggestedSimilarity = Math.round(match.score * 100);
        }
      } else {
        item.status = "NEW";
      }

      items.push(item);
    }

    const summary = {
      total: items.length,
      matched: items.filter((i) => i.status === "MATCH").length,
      unchanged: items.filter((i) => i.status === "NO_CHANGE").length,
      created: items.filter((i) => i.status === "NEW" && !i.error).length,
      unmatched: items.filter((i) => i.status === "UNMATCHED").length,
      errors: items.filter((i) => !!i.error).length,
      updated: 0,
    };

    // Preview mode — return analysis only
    if (isPreview) {
      return NextResponse.json({ success: true, data: { items, summary } });
    }

    // Apply mode — write to DB using batched transactions for atomicity
    let updatedCount = 0;
    let createdCount = 0;

    // Collect operations for batched transaction
    type DbOp =
      | {
          type: "update";
          id: string;
          purchasePrice: number;
          salePrice: number;
          item: ImportItem;
        }
      | {
          type: "create";
          name: string;
          purchasePrice: number;
          salePrice: number;
          item: ImportItem;
        };

    const ops: DbOp[] = [];

    for (const item of items) {
      if (item.error) continue;

      if (item.status === "MATCH" && item.matchedProduct) {
        ops.push({
          type: "update",
          id: item.matchedProduct.id,
          purchasePrice: item.purchasePrice,
          salePrice: item.salePrice,
          item,
        });
      } else if (item.status === "NEW") {
        const decision = decisionMap.get(item.row);
        if (!decision || decision.action === "skip") continue;
        if (decision.action === "create") {
          ops.push({
            type: "create",
            name: item.name,
            purchasePrice: item.purchasePrice,
            salePrice: item.salePrice,
            item,
          });
        }
      } else if (item.status === "UNMATCHED") {
        const decision = decisionMap.get(item.row);
        if (!decision || decision.action === "skip") continue;
        if (decision.action === "link" && decision.linkProductId) {
          ops.push({
            type: "update",
            id: decision.linkProductId,
            purchasePrice: item.purchasePrice,
            salePrice: item.salePrice,
            item,
          });
        } else if (decision.action === "create") {
          ops.push({
            type: "create",
            name: item.name,
            purchasePrice: item.purchasePrice,
            salePrice: item.salePrice,
            item,
          });
        }
      }
    }

    // Execute in batched transaction
    if (ops.length > 0) {
      try {
        const results = await prisma.$transaction(
          ops.map((op) => {
            if (op.type === "update") {
              return prisma.product.update({
                where: { id: op.id },
                data: {
                  purchasePrice: op.purchasePrice,
                  salePrice: op.salePrice,
                },
              });
            } else {
              return prisma.product.create({
                data: {
                  name: op.name,
                  purchasePrice: op.purchasePrice,
                  salePrice: op.salePrice,
                },
              });
            }
          }),
        );

        // Post-transaction: audit logs and counts
        for (let i = 0; i < ops.length; i++) {
          const op = ops[i];
          const result = results[i];
          if (op.type === "update") {
            const oldProduct =
              op.item.matchedProduct ?? dbProducts.find((p) => p.id === op.id);
            logAudit({
              userId: session.user.id,
              action: "PRICE_UPDATE",
              entity: "Product",
              entityId: op.id,
              oldValue: oldProduct
                ? {
                    purchasePrice: oldProduct.purchasePrice,
                    salePrice: oldProduct.salePrice,
                  }
                : undefined,
              newValue: {
                purchasePrice: op.purchasePrice,
                salePrice: op.salePrice,
                source: "IMPORT",
              },
            });
            updatedCount++;
          } else {
            logAudit({
              userId: session.user.id,
              action: "CREATE",
              entity: "Product",
              entityId: result.id,
              newValue: {
                name: op.name,
                purchasePrice: op.purchasePrice,
                salePrice: op.salePrice,
                source: "IMPORT",
              },
            });
            createdCount++;
          }
        }
      } catch (err) {
        return NextResponse.json(
          {
            success: false,
            error: `Toplu işlem hatası: ${err instanceof Error ? err.message : "Bilinmeyen"}`,
          },
          { status: 500 },
        );
      }
    }

    summary.updated = updatedCount;
    summary.created = createdCount;
    summary.errors = items.filter((i) => !!i.error).length;

    return NextResponse.json({ success: true, data: { items, summary } });
  },
  { requiredPermissions: ["product.create"] },
);
