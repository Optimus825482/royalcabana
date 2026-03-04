import { prisma } from "@/lib/prisma";
import { DatabaseError } from "@/lib/errors";
import { cached } from "@/lib/cache";

// ===== Types =====

type SlideType =
  | "cover"
  | "system-overview"
  | "inventory"
  | "layout"
  | "classes"
  | "concepts"
  | "pricing-policy"
  | "workflow"
  | "roles"
  | "advantages"
  | "closing";

interface SlidevOptions {
  title?: string;
  slides?: SlideType[];
}

interface CabanaData {
  name: string;
  className: string;
  conceptName: string;
  status: string;
  coordX: number;
  coordY: number;
  isOpen: boolean;
}

interface ClassData {
  name: string;
  description: string;
  cabanaCount: number;
  attributes: { key: string; value: string }[];
}

interface ConceptData {
  name: string;
  description: string;
  serviceFee: number;
  products: { name: string; salePrice: number; quantity: number }[];
  totalValue: number;
}

interface PriceSummary {
  className: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  cabanaCount: number;
}

interface InventoryStats {
  total: number;
  available: number;
  reserved: number;
  closed: number;
  openForReservation: number;
  classBreakdown: { name: string; count: number }[];
}

// ===== Helpers =====

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Müsait",
  RESERVED: "Rezerveli",
  CLOSED: "Kapalı",
};

const STATUS_EMOJI: Record<string, string> = {
  AVAILABLE: "🟢",
  RESERVED: "🟡",
  CLOSED: "🔴",
};

function formatTurkishDate(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function esc(str: string): string {
  return str.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// ===== Data Fetching =====

async function fetchPresentationData() {
  const [cabanas, classes, concepts] = await Promise.all([
    (prisma as any).cabana.findMany({
      where: { deletedAt: null },
      include: {
        cabanaClass: { include: { attributes: true } },
        concept: { include: { products: { include: { product: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    (prisma as any).cabanaClass.findMany({
      include: { attributes: true },
      orderBy: { name: "asc" },
    }),
    (prisma as any).concept.findMany({
      include: { products: { include: { product: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const cabanaList: CabanaData[] = cabanas.map((c: any) => ({
    name: c.name,
    className: c.cabanaClass.name,
    conceptName: c.concept?.name ?? "—",
    status: c.status,
    coordX: c.coordX,
    coordY: c.coordY,
    isOpen: c.isOpenForReservation,
  }));

  const classList: ClassData[] = classes.map((cls: any) => ({
    name: cls.name,
    description: cls.description,
    cabanaCount: cabanas.filter((c: any) => c.classId === cls.id).length,
    attributes: (cls.attributes ?? []).map((a: any) => ({
      key: a.key,
      value: a.value,
    })),
  }));

  const conceptList: ConceptData[] = concepts.map((con: any) => {
    const products = con.products.map((cp: any) => ({
      name: cp.product.name,
      salePrice: Number(cp.product.salePrice),
      quantity: cp.quantity,
    }));
    const totalValue = products.reduce(
      (sum: number, p: any) => sum + p.salePrice * p.quantity,
      0,
    );
    return {
      name: con.name,
      description: con.description,
      serviceFee: Number(con.serviceFee ?? 0),
      products,
      totalValue,
    };
  });

  // Price summary by class — konsept ürün fiyatları üzerinden hesaplanır
  const priceSummaries: PriceSummary[] = classList.map((cls) => {
    const classCabanas = cabanas.filter(
      (c: any) => c.cabanaClass.name === cls.name,
    );
    const allPrices = classCabanas
      .filter((c: any) => c.concept)
      .map((c: any) => {
        const conceptProducts = c.concept.products ?? [];
        return conceptProducts.reduce(
          (sum: number, cp: any) =>
            sum + Number(cp.product.salePrice) * cp.quantity,
          0,
        );
      })
      .filter((p: number) => p > 0);
    return {
      className: cls.name,
      minPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      maxPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
      avgPrice:
        allPrices.length > 0
          ? allPrices.reduce((a: number, b: number) => a + b, 0) /
            allPrices.length
          : 0,
      cabanaCount: cls.cabanaCount,
    };
  });

  // Inventory stats
  const inventory: InventoryStats = {
    total: cabanas.length,
    available: cabanas.filter((c: any) => c.status === "AVAILABLE").length,
    reserved: cabanas.filter((c: any) => c.status === "RESERVED").length,
    closed: cabanas.filter((c: any) => c.status === "CLOSED").length,
    openForReservation: cabanas.filter((c: any) => c.isOpenForReservation)
      .length,
    classBreakdown: classList.map((cls) => ({
      name: cls.name,
      count: cls.cabanaCount,
    })),
  };

  return {
    cabanaList,
    classList,
    conceptList,
    priceSummaries,
    inventory,
  };
}

// ===== Slide Generators =====

function generateCoverSlide(title: string): string {
  return `---
theme: seriph
title: "${title}"
background: https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920
class: text-center
highlighter: shiki
drawings:
  persist: false
transition: slide-left
---

# Royal Cabana

## ${title}

<div class="pt-8">
  <span class="px-4 py-2 rounded-full bg-white/10 backdrop-blur text-sm">
    🏖️ Merit Royal · Alsancak, Kıbrıs
  </span>
</div>

<div class="abs-br m-6 flex gap-2 text-sm opacity-50">
  📅 ${formatTurkishDate(new Date())}
</div>

<style>
h1 {
  font-size: 3.5em !important;
  font-weight: 700 !important;
  text-shadow: 0 4px 30px rgba(0,0,0,0.5);
}
h2 {
  color: #fbbf24 !important;
  font-weight: 400 !important;
}
</style>`;
}

function generateSystemOverviewSlide(): string {
  return `---
layout: two-cols
transition: slide-left
---

# Sistem Tanımı

**Royal Cabana Rezervasyon Sistemi**, Merit Royal Hotel bünyesindeki Cabana alanlarının dijital yönetimini sağlayan kapsamlı bir platformdur.

<v-clicks>

- 🏖️ **Cabana Yönetimi** — Envanter, sınıf ve konsept takibi
- 📅 **Rezervasyon** — Gerçek zamanlı müsaitlik ve onay akışı
- 💰 **Dinamik Fiyatlandırma** — Sezon, sınıf ve konsept bazlı
- 🍽️ **F&B Servis Yönetimi** — Konsept ürünleri ve ekstra talep koordinasyonu
- 👥 **Misafir Veritabanı** — VIP seviye ve geçmiş takibi
- 📊 **Raporlama** — Doluluk, gelir ve performans analizleri

</v-clicks>

::right::

<div class="ml-4 mt-12">

### Teknoloji Altyapısı

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 15 + React |
| Backend | Next.js API Routes |
| Veritabanı | PostgreSQL + Prisma |
| Gerçek Zamanlı | Socket.IO |
| Harita | Three.js + React Three Fiber |
| Sunum | Slidev |

</div>

<style>
h1 { color: #fbbf24 !important; }
h3 { color: #60a5fa !important; }
</style>`;
}

function generateInventorySlide(inventory: InventoryStats): string {
  const pct = (n: number) =>
    inventory.total > 0 ? ((n / inventory.total) * 100).toFixed(0) : "0";

  let classBreakdownMd = "";
  for (const cls of inventory.classBreakdown) {
    classBreakdownMd += `  - **${esc(cls.name)}**: ${cls.count} Cabana\n`;
  }

  return `---
layout: default
transition: slide-left
---

# Cabana Envanteri

<div class="grid grid-cols-4 gap-4 mt-8">
  <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
    <div class="text-3xl font-bold text-blue-400">${inventory.total}</div>
    <div class="text-sm text-blue-300 mt-1">Toplam Cabana</div>
  </div>
  <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
    <div class="text-3xl font-bold text-green-400">${inventory.available}</div>
    <div class="text-sm text-green-300 mt-1">Müsait (${pct(inventory.available)}%)</div>
  </div>
  <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
    <div class="text-3xl font-bold text-yellow-400">${inventory.reserved}</div>
    <div class="text-sm text-yellow-300 mt-1">Rezerveli (${pct(inventory.reserved)}%)</div>
  </div>
  <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
    <div class="text-3xl font-bold text-red-400">${inventory.closed}</div>
    <div class="text-sm text-red-300 mt-1">Kapalı (${pct(inventory.closed)}%)</div>
  </div>
</div>

<div class="mt-8 grid grid-cols-2 gap-8">
  <div>

### Sınıf Dağılımı

${classBreakdownMd}
  </div>
  <div>

### Rezervasyona Açık

- **${inventory.openForReservation}** / ${inventory.total} Cabana aktif olarak rezervasyona açık

  </div>
</div>

<style>
h1 { color: #fbbf24 !important; }
h3 { color: #60a5fa !important; }
</style>`;
}

function generateLayoutSlide(cabanas: CabanaData[]): string {
  let tableRows = "";
  for (const c of cabanas) {
    const emoji = STATUS_EMOJI[c.status] ?? "⚪";
    const label = STATUS_LABELS[c.status] ?? c.status;
    tableRows += `| ${emoji} ${esc(c.name)} | ${esc(c.className)} | ${esc(c.conceptName)} | ${label} | ${c.isOpen ? "✅" : "❌"} |\n`;
  }

  return `---
layout: default
transition: slide-left
---

# Cabana Yerleşim Planı

<div class="mt-4 text-xs">

| Cabana | Sınıf | Konsept | Durum | Rez. Açık |
|--------|-------|---------|-------|-----------|
${tableRows}
</div>

<div class="abs-br m-4 text-xs opacity-50">
  🟢 Müsait &nbsp; 🟡 Rezerveli &nbsp; 🔴 Kapalı
</div>

<style>
h1 { color: #fbbf24 !important; }
table { font-size: 0.75em; }
th { background: rgba(251, 191, 36, 0.15) !important; color: #fbbf24 !important; }
</style>`;
}

function generateClassesSlide(classes: ClassData[]): string {
  let classCards = "";
  for (const cls of classes) {
    const desc = esc(cls.description.slice(0, 120));
    const attrs = cls.attributes
      .slice(0, 4)
      .map((a) => `\`${esc(a.key)}: ${esc(a.value)}\``)
      .join(" · ");

    classCards += `
  <div class="bg-white/5 border border-white/10 rounded-xl p-4">
    <div class="flex justify-between items-center mb-2">
      <span class="text-lg font-bold text-amber-400">${esc(cls.name)}</span>
      <span class="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-xs">${cls.cabanaCount} cabana</span>
    </div>
    <p class="text-sm text-neutral-300 mb-2">${desc}</p>
    ${attrs ? `<div class="text-xs text-neutral-500">${attrs}</div>` : ""}
  </div>
`;
  }

  return `---
layout: default
transition: slide-left
---

# Cabana Sınıfları

<div class="grid grid-cols-2 gap-4 mt-6">
${classCards}
</div>

<style>
h1 { color: #fbbf24 !important; }
</style>`;
}

function generateConceptsSlide(concepts: ConceptData[]): string {
  if (concepts.length === 0) {
    return `---
layout: center
transition: slide-left
---

# Konsept Tanımları

*Henüz konsept tanımlanmamış.*`;
  }

  // Her konsept için ayrı bir bölüm
  let conceptBlocks = "";
  for (const concept of concepts) {
    const productList =
      concept.products.length > 0
        ? concept.products
            .map(
              (p) =>
                `${esc(p.name)} (${p.quantity}x — ₺${formatCurrency(p.salePrice)})`,
            )
            .join(" · ")
        : "*Ürün yok*";

    conceptBlocks += `
  <div class="bg-white/5 border border-white/10 rounded-xl p-4">
    <div class="flex justify-between items-center mb-2">
      <span class="text-lg font-bold text-amber-400">${esc(concept.name)}</span>
      <span class="text-sm text-green-400">₺${formatCurrency(concept.totalValue)}</span>
    </div>
    <p class="text-sm text-neutral-300 mb-2">${esc(concept.description.slice(0, 150))}</p>
    <div class="text-xs text-neutral-400">${productList}</div>
    ${concept.serviceFee > 0 ? `<div class="text-xs text-yellow-400 mt-1">Servis Ücreti: ₺${formatCurrency(concept.serviceFee)}</div>` : ""}
  </div>
`;
  }

  return `---
layout: default
transition: slide-left
---

# Konsept Tanımları ve İçerikleri

<div class="grid grid-cols-2 gap-4 mt-4 text-sm">
${conceptBlocks}
</div>

<style>
h1 { color: #fbbf24 !important; }
</style>`;
}

function generatePricingPolicySlide(priceSummaries: PriceSummary[]): string {
  let summaryRows = "";
  for (const ps of priceSummaries) {
    if (ps.cabanaCount === 0) continue;
    summaryRows += `| ${esc(ps.className)} | ${ps.cabanaCount} | ₺${formatCurrency(ps.minPrice)} | ₺${formatCurrency(ps.maxPrice)} | ₺${formatCurrency(ps.avgPrice)} |\n`;
  }

  return `---
layout: two-cols
transition: slide-left
---

# Fiyatlandırma Politikaları

### Sınıf Bazlı Fiyat Özeti

| Sınıf | Cabana | Min | Max | Ort |
|-------|--------|-----|-----|-----|
${summaryRows || "| — | — | — | — | — |\n"}

<v-clicks>

**Fiyatlandırma Katmanları:**
1. 🎯 Konsept bazlı ürün fiyatı (Product.salePrice × miktar)
2. ➕ Ekstra ürün/hizmet fiyatı
3. 💰 Hizmet ücreti (serviceFee)

</v-clicks>

::right::

<div class="ml-4 mt-12">

### Basit Fiyat Formülü

**Toplam = Σ(Ürün Fiyatı × Miktar) + Σ(Ekstra Hizmet) + Hizmet Ücreti**

</div>

<style>
h1 { color: #fbbf24 !important; }
h3 { color: #60a5fa !important; }
table { font-size: 0.8em; }
</style>`;
}

function generateWorkflowSlide(): string {
  return `---
layout: default
transition: slide-left
---

# Çalışma Prensipleri

<div class="grid grid-cols-3 gap-6 mt-8">
  <div class="text-center">
    <div class="text-4xl mb-3">📋</div>
    <h3 class="text-amber-400 font-bold mb-2">1. Talep</h3>
    <p class="text-sm text-neutral-300">Casino kullanıcısı Cabana seçer, tarih ve misafir bilgilerini girerek rezervasyon talebi oluşturur.</p>
  </div>
  <div class="text-center">
    <div class="text-4xl mb-3">✅</div>
    <h3 class="text-amber-400 font-bold mb-2">2. Onay</h3>
    <p class="text-sm text-neutral-300">Admin talepleri inceler, uygunsa onaylar. Otomatik fiyat hesaplaması yapılır. Casino kullanıcısına bildirim gönderilir.</p>
  </div>
  <div class="text-center">
    <div class="text-4xl mb-3">🏖️</div>
    <h3 class="text-amber-400 font-bold mb-2">3. Kullanım</h3>
    <p class="text-sm text-neutral-300">F&B veya admin günün listesinden misafir check-in/out doğrulaması yapar, konsept ürünleri ve ekstra talepler koordine edilir.</p>
  </div>
</div>

<div class="mt-8 bg-white/5 border border-white/10 rounded-xl p-4">

### Akış Detayı

\`\`\`
Talep → Onay Bekliyor → Onaylandı → Check-in → Aktif Kullanım → Check-out → Tamamlandı
         ↓                                        ↓
      Reddedildi                          Değişiklik/İptal Talebi
\`\`\`

</div>

<style>
h1 { color: #fbbf24 !important; }
h3 { color: #fbbf24 !important; }
</style>`;
}

function generateRolesSlide(): string {
  return `---
layout: default
transition: slide-left
---

# Kullanıcı Rolleri

<div class="grid grid-cols-2 gap-6 mt-6">
  <div class="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">🛡️</span>
      <span class="text-lg font-bold text-purple-400">System Admin</span>
    </div>
    <ul class="text-sm text-neutral-300 space-y-1">
      <li>• Tüm sistem ayarları ve konfigürasyon</li>
      <li>• Kullanıcı, sınıf, konsept ve ürün yönetimi</li>
      <li>• Fiyatlandırma politikaları</li>
      <li>• Raporlama ve sunum oluşturma</li>
      <li>• Personel ve görev tanımları</li>
    </ul>
  </div>
  <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">👔</span>
      <span class="text-lg font-bold text-blue-400">Admin</span>
    </div>
    <ul class="text-sm text-neutral-300 space-y-1">
      <li>• Rezervasyon onay/red işlemleri</li>
      <li>• Fiyat güncelleme</li>
      <li>• Check-in / Check-out yönetimi</li>
      <li>• Personel atama ve görev takibi</li>
      <li>• Operasyonel raporlar</li>
    </ul>
  </div>
  <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">🎰</span>
      <span class="text-lg font-bold text-amber-400">Casino User</span>
    </div>
    <ul class="text-sm text-neutral-300 space-y-1">
      <li>• Cabana müsaitlik görüntüleme</li>
      <li>• Rezervasyon talebi oluşturma</li>
      <li>• Değişiklik ve iptal talepleri</li>
      <li>• Ekstra konsept talepleri</li>
      <li>• Değerlendirme ve yorum</li>
    </ul>
  </div>
  <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">🍽️</span>
      <span class="text-lg font-bold text-green-400">F&B User</span>
    </div>
    <ul class="text-sm text-neutral-300 space-y-1">
      <li>• Konsept ürünlerinin cabana'ya servis edilmesi</li>
      <li>• Ekstra taleplerin hazırlanması ve teslimi</li>
      <li>• Günün listesinden check-in/out doğrulama</li>
      <li>• Günlük sipariş özeti</li>
      <li>• Stok ve ürün bilgisi görüntüleme</li>
    </ul>
  </div>
</div>

<style>
h1 { color: #fbbf24 !important; }
</style>`;
}

function generateAdvantagesSlide(): string {
  return `---
layout: default
transition: slide-left
---

# Sistem Avantajları

<div class="grid grid-cols-3 gap-5 mt-8">
  <div class="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
    <div class="text-3xl mb-2">⚡</div>
    <h3 class="text-amber-400 font-bold text-sm mb-2">Gerçek Zamanlı</h3>
    <p class="text-xs text-neutral-400">Socket.IO ile anlık bildirimler, canlı durum güncellemeleri</p>
  </div>
  <div class="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
    <div class="text-3xl mb-2">💰</div>
    <h3 class="text-amber-400 font-bold text-sm mb-2">Dinamik Fiyatlandırma</h3>
    <p class="text-xs text-neutral-400">Sezon, sınıf ve konsept bazlı esnek fiyat yönetimi</p>
  </div>
  <div class="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
    <div class="text-3xl mb-2">🗺️</div>
    <h3 class="text-amber-400 font-bold text-sm mb-2">Görsel Harita</h3>
    <p class="text-xs text-neutral-400">Cabana yerleşimini interaktif harita üzerinde görüntüleme</p>
  </div>
  <div class="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
    <div class="text-3xl mb-2">📱</div>
    <h3 class="text-amber-400 font-bold text-sm mb-2">Responsive Tasarım</h3>
    <p class="text-xs text-neutral-400">Masaüstü, tablet ve mobil cihazlarda sorunsuz kullanım</p>
  </div>
  <div class="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
    <div class="text-3xl mb-2">🔒</div>
    <h3 class="text-amber-400 font-bold text-sm mb-2">Güvenlik</h3>
    <p class="text-xs text-neutral-400">Rol bazlı erişim kontrolü, JWT kimlik doğrulama, denetim kaydı</p>
  </div>
  <div class="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
    <div class="text-3xl mb-2">📊</div>
    <h3 class="text-amber-400 font-bold text-sm mb-2">Kapsamlı Raporlama</h3>
    <p class="text-xs text-neutral-400">Doluluk, gelir, maliyet analizi ve sunum oluşturma</p>
  </div>
</div>

<style>
h1 { color: #fbbf24 !important; }
</style>`;
}

function generateClosingSlide(): string {
  return `---
layout: center
class: text-center
transition: fade
---

# Teşekkürler

<div class="mt-4 text-lg text-neutral-300">
  Royal Cabana Rezervasyon Sistemi
</div>

<div class="mt-2 text-sm text-neutral-500">
  Merit Royal · Alsancak, Kıbrıs
</div>

<div class="mt-8 flex justify-center gap-8 text-sm text-neutral-400">
  <span>📧 info@meritroyalbet.com</span>
  <span>🌐 meritroyalbet.com</span>
</div>

<style>
h1 {
  font-size: 3em !important;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>`;
}

// ===== Public API =====

const ALL_SLIDE_TYPES: readonly SlideType[] = [
  "cover",
  "system-overview",
  "inventory",
  "layout",
  "classes",
  "concepts",
  "pricing-policy",
  "workflow",
  "roles",
  "advantages",
  "closing",
] as const;

const SLIDE_LABELS: Record<SlideType, string> = {
  cover: "Kapak",
  "system-overview": "Sistem Tanımı",
  inventory: "Cabana Envanteri",
  layout: "Cabana Yerleşimi",
  classes: "Cabana Sınıfları",
  concepts: "Konsept Tanımları",
  "pricing-policy": "Fiyatlandırma Politikaları",
  workflow: "Çalışma Prensipleri",
  roles: "Kullanıcı Rolleri",
  advantages: "Avantajlar",
  closing: "Kapanış",
};

/**
 * Veritabanından veri çekerek tam bir Slidev markdown dosyası üretir.
 */
export async function generateSlidevMarkdown(): Promise<string> {
  try {
    return await generateSlidevMarkdownCustom({});
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError("Slidev markdown oluşturulamadı", {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Özelleştirilebilir Slidev markdown üretici.
 */
export async function generateSlidevMarkdownCustom(
  options: SlidevOptions = {},
): Promise<string> {
  try {
    const title = options.title ?? "Cabana Yönetim Sistemi";
    const selectedSlides = options.slides ?? [...ALL_SLIDE_TYPES];

    const { cabanaList, classList, conceptList, priceSummaries, inventory } =
      await cached("presentation:slidev", 300, () => fetchPresentationData());

    const slideGenerators: Record<string, () => string> = {
      cover: () => generateCoverSlide(title),
      "system-overview": () => generateSystemOverviewSlide(),
      inventory: () => generateInventorySlide(inventory),
      layout: () => generateLayoutSlide(cabanaList),
      classes: () => generateClassesSlide(classList),
      concepts: () => generateConceptsSlide(conceptList),
      "pricing-policy": () => generatePricingPolicySlide(priceSummaries),
      workflow: () => generateWorkflowSlide(),
      roles: () => generateRolesSlide(),
      advantages: () => generateAdvantagesSlide(),
      closing: () => generateClosingSlide(),
    };

    const parts: string[] = [];

    for (const slideType of selectedSlides) {
      const generator = slideGenerators[slideType];
      if (generator) {
        parts.push(generator());
      }
    }

    return parts.join("\n\n");
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError("Özel Slidev markdown oluşturulamadı", {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export { ALL_SLIDE_TYPES, SLIDE_LABELS, type SlidevOptions, type SlideType };
