import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlideData {
  cabanas: CabanaData[];
  classes: ClassData[];
  concepts: ConceptData[];
  prices: PriceData[];
}

interface CabanaData {
  name: string;
  className: string;
  conceptName: string;
  status: string;
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
  products: { name: string; salePrice: number; group: string }[];
}

interface PriceData {
  cabanaName: string;
  className: string;
  date: string;
  dailyPrice: number;
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchData(): Promise<SlideData> {
  const [cabanas, classes, concepts] = await Promise.all([
    prisma.cabana.findMany({
      include: {
        cabanaClass: true,
        concept: true,
        prices: { orderBy: { date: "asc" }, take: 5 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.cabanaClass.findMany({
      include: { attributes: true },
      orderBy: { name: "asc" },
    }),
    prisma.concept.findMany({
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const cabanaList: CabanaData[] = cabanas.map((c) => ({
    name: c.name,
    className: c.cabanaClass.name,
    conceptName: c.concept?.name ?? "—",
    status: c.status,
  }));

  const classList: ClassData[] = classes.map((cls) => ({
    name: cls.name,
    description: cls.description,
    cabanaCount: cabanas.filter((c) => c.classId === cls.id).length,
    attributes: cls.attributes.map((a) => ({ key: a.key, value: a.value })),
  }));

  const conceptList: ConceptData[] = concepts.map((con) => ({
    name: con.name,
    description: con.description,
    products: con.products.map((cp) => ({
      name: cp.product.name,
      salePrice: Number(cp.product.salePrice),
      group: "Genel",
    })),
  }));

  const priceList: PriceData[] = cabanas.flatMap((c) =>
    c.prices.map((p) => ({
      cabanaName: c.name,
      className: c.cabanaClass.name,
      date: new Date(p.date).toLocaleDateString("tr-TR"),
      dailyPrice: Number(p.dailyPrice),
    })),
  );

  return {
    cabanas: cabanaList,
    classes: classList,
    concepts: conceptList,
    prices: priceList,
  };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const map: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: "Müsait", color: "#22c55e" },
    RESERVED: { label: "Rezerveli", color: "#f59e0b" },
    CLOSED: { label: "Kapalı", color: "#ef4444" },
  };
  const s = map[status] ?? { label: status, color: "#6b7280" };
  return `<span style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">${s.label}</span>`;
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────

function buildHtml(data: SlideData): string {
  const date = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Slide 1: Cover ──────────────────────────────────────────────────────────
  const coverSlide = `
    <section class="slide slide-cover">
      <div class="cover-inner">
        <div class="cover-logo">RC</div>
        <h1 class="cover-title">Royal Cabana</h1>
        <p class="cover-subtitle">Kabana Yönetim Sistemi</p>
        <p class="cover-date">${date}</p>
        <div class="cover-stats">
          <div class="stat-item"><span class="stat-num">${data.cabanas.length}</span><span class="stat-label">Kabana</span></div>
          <div class="stat-divider"></div>
          <div class="stat-item"><span class="stat-num">${data.classes.length}</span><span class="stat-label">Sınıf</span></div>
          <div class="stat-divider"></div>
          <div class="stat-item"><span class="stat-num">${data.concepts.length}</span><span class="stat-label">Konsept</span></div>
        </div>
      </div>
    </section>`;

  // ── Slide 2: Kabana Sınıfları ───────────────────────────────────────────────
  const classCards = data.classes
    .map(
      (cls) => `
    <div class="class-card">
      <div class="class-card-header">
        <span class="class-name">${cls.name}</span>
        <span class="class-count">${cls.cabanaCount} kabana</span>
      </div>
      <p class="class-desc">${cls.description}</p>
      ${
        cls.attributes.length > 0
          ? `
        <div class="attr-list">
          ${cls.attributes.map((a) => `<span class="attr-tag"><b>${a.key}:</b> ${a.value}</span>`).join("")}
        </div>`
          : ""
      }
    </div>`,
    )
    .join("");

  const classSlide = `
    <section class="slide">
      <div class="slide-header">
        <span class="slide-num">01</span>
        <h2 class="slide-title">Kabana Sınıfları</h2>
      </div>
      <div class="class-grid">${classCards}</div>
    </section>`;

  // ── Slide 3: Kabana Listesi ─────────────────────────────────────────────────
  const cabanaRows = data.cabanas
    .map(
      (c, i) => `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="td-name">${c.name}</td>
      <td>${c.className}</td>
      <td>${c.conceptName}</td>
      <td>${statusBadge(c.status)}</td>
    </tr>`,
    )
    .join("");

  const cabanaSlide = `
    <section class="slide">
      <div class="slide-header">
        <span class="slide-num">02</span>
        <h2 class="slide-title">Kabana Yerleşimi</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kabana</th><th>Sınıf</th><th>Konsept</th><th>Durum</th>
            </tr>
          </thead>
          <tbody>${cabanaRows}</tbody>
        </table>
      </div>
    </section>`;

  // ── Slide 4: Konseptler ─────────────────────────────────────────────────────
  const conceptCards = data.concepts
    .map((con) => {
      const grouped: Record<string, typeof con.products> = {};
      for (const p of con.products) {
        (grouped[p.group] ??= []).push(p);
      }
      const groupHtml = Object.entries(grouped)
        .map(
          ([grp, prods]) => `
      <div class="product-group">
        <span class="group-label">${grp}</span>
        <div class="product-list">
          ${prods
            .map(
              (p) => `
            <div class="product-row">
              <span>${p.name}</span>
              <span class="product-price">${p.salePrice.toLocaleString("tr-TR")} ₺</span>
            </div>`,
            )
            .join("")}
        </div>
      </div>`,
        )
        .join("");

      return `
      <div class="concept-card">
        <div class="concept-header">${con.name}</div>
        <p class="concept-desc">${con.description}</p>
        ${groupHtml || '<p class="no-product">Ürün tanımlanmamış</p>'}
      </div>`;
    })
    .join("");

  const conceptSlide = `
    <section class="slide">
      <div class="slide-header">
        <span class="slide-num">03</span>
        <h2 class="slide-title">Konseptler & Ürünler</h2>
      </div>
      <div class="concept-grid">${conceptCards}</div>
    </section>`;

  // ── Slide 5: Fiyatlandırma ──────────────────────────────────────────────────
  const priceContent =
    data.prices.length > 0
      ? `<div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Kabana</th><th>Sınıf</th><th>Tarih</th><th>Günlük Fiyat</th></tr>
          </thead>
          <tbody>
            ${data.prices
              .map(
                (p, i) => `
              <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
                <td class="td-name">${p.cabanaName}</td>
                <td>${p.className}</td>
                <td>${p.date}</td>
                <td class="td-price">${p.dailyPrice.toLocaleString("tr-TR")} ₺</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : `<div class="empty-state">Henüz fiyat tanımlanmamış.</div>`;

  const priceSlide = `
    <section class="slide">
      <div class="slide-header">
        <span class="slide-num">04</span>
        <h2 class="slide-title">Fiyatlandırma</h2>
      </div>
      ${priceContent}
    </section>`;

  // ── Slide 6: Kapanış ────────────────────────────────────────────────────────
  const closingSlide = `
    <section class="slide slide-closing">
      <div class="closing-inner">
        <div class="closing-logo">RC</div>
        <h2 class="closing-title">Royal Cabana</h2>
        <p class="closing-sub">Kabana Yönetim Sistemi — ${date}</p>
      </div>
    </section>`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Royal Cabana — Sunum</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --gold: #d4af37;
      --gold-light: #f0d060;
      --dark: #0f0f1a;
      --dark2: #1a1a2e;
      --dark3: #16213e;
      --surface: #1e1e30;
      --border: #2a2a40;
      --text: #e8e8f0;
      --muted: #8888aa;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--dark);
      color: var(--text);
      line-height: 1.5;
    }

    /* ── Navigation ── */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(15,15,26,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 32px; height: 52px;
    }
    .nav-brand { font-size: 15px; font-weight: 700; color: var(--gold); letter-spacing: 1px; }
    .nav-links { display: flex; gap: 4px; }
    .nav-link {
      padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 500;
      color: var(--muted); text-decoration: none; transition: all .2s;
      border: 1px solid transparent;
    }
    .nav-link:hover { color: var(--text); background: var(--surface); border-color: var(--border); }

    /* ── Slides ── */
    .slide {
      min-height: 100vh; padding: 80px 64px 64px;
      border-bottom: 1px solid var(--border);
      display: flex; flex-direction: column;
    }

    /* ── Cover ── */
    .slide-cover {
      background: radial-gradient(ellipse at 30% 40%, #1a1a3e 0%, var(--dark) 70%);
      align-items: center; justify-content: center; text-align: center;
    }
    .cover-inner { max-width: 640px; }
    .cover-logo {
      width: 80px; height: 80px; border-radius: 20px;
      background: linear-gradient(135deg, var(--gold), #a07820);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 900; color: var(--dark);
      margin: 0 auto 28px; box-shadow: 0 0 40px rgba(212,175,55,.3);
    }
    .cover-title { font-size: 56px; font-weight: 800; color: var(--gold); letter-spacing: -1px; margin-bottom: 12px; }
    .cover-subtitle { font-size: 20px; color: var(--muted); margin-bottom: 8px; }
    .cover-date { font-size: 14px; color: #555570; margin-bottom: 48px; }
    .cover-stats { display: flex; align-items: center; justify-content: center; gap: 0; }
    .stat-item { display: flex; flex-direction: column; align-items: center; padding: 0 32px; }
    .stat-num { font-size: 36px; font-weight: 800; color: var(--gold); }
    .stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .stat-divider { width: 1px; height: 48px; background: var(--border); }

    /* ── Slide Header ── */
    .slide-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 36px; }
    .slide-num { font-size: 13px; font-weight: 700; color: var(--gold); opacity: .6; letter-spacing: 2px; }
    .slide-title { font-size: 28px; font-weight: 700; color: var(--text); }

    /* ── Class Cards ── */
    .class-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .class-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px;
      transition: border-color .2s;
    }
    .class-card:hover { border-color: var(--gold); }
    .class-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .class-name { font-size: 15px; font-weight: 700; color: var(--gold); }
    .class-count { font-size: 11px; color: var(--muted); background: var(--dark2); padding: 2px 8px; border-radius: 10px; }
    .class-desc { font-size: 13px; color: var(--muted); margin-bottom: 12px; line-height: 1.6; }
    .attr-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .attr-tag { font-size: 11px; background: var(--dark2); border: 1px solid var(--border); color: var(--text); padding: 3px 8px; border-radius: 6px; }

    /* ── Tables ── */
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table thead tr { background: var(--dark2); }
    .data-table th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: .8px; border-bottom: 1px solid var(--border); }
    .data-table td { padding: 11px 16px; border-bottom: 1px solid var(--border); }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .row-even { background: var(--surface); }
    .row-odd { background: var(--dark2); }
    .td-name { font-weight: 600; color: var(--text); }
    .td-price { font-weight: 700; color: var(--gold); }

    /* ── Concept Cards ── */
    .concept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .concept-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .concept-header { background: var(--dark2); padding: 14px 20px; font-size: 15px; font-weight: 700; color: var(--gold); border-bottom: 1px solid var(--border); }
    .concept-desc { padding: 12px 20px; font-size: 13px; color: var(--muted); border-bottom: 1px solid var(--border); }
    .product-group { padding: 12px 20px; border-bottom: 1px solid var(--border); }
    .product-group:last-child { border-bottom: none; }
    .group-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); display: block; margin-bottom: 8px; }
    .product-list { display: flex; flex-direction: column; gap: 5px; }
    .product-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .product-price { font-weight: 600; color: var(--gold); font-size: 12px; }
    .no-product { padding: 12px 20px; font-size: 13px; color: var(--muted); font-style: italic; }

    /* ── Closing ── */
    .slide-closing {
      background: radial-gradient(ellipse at 70% 60%, #1a1a3e 0%, var(--dark) 70%);
      align-items: center; justify-content: center; text-align: center;
    }
    .closing-inner { max-width: 480px; }
    .closing-logo {
      width: 64px; height: 64px; border-radius: 16px;
      background: linear-gradient(135deg, var(--gold), #a07820);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 900; color: var(--dark);
      margin: 0 auto 24px;
    }
    .closing-title { font-size: 36px; font-weight: 800; color: var(--gold); margin-bottom: 8px; }
    .closing-sub { font-size: 14px; color: var(--muted); }

    /* ── Empty State ── */
    .empty-state {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 48px; text-align: center;
      color: var(--muted); font-size: 14px;
    }

    @media print {
      nav { display: none; }
      .slide { page-break-after: always; min-height: 100vh; }
    }
  </style>
</head>
<body>
  <nav>
    <span class="nav-brand">Royal Cabana</span>
    <div class="nav-links">
      <a class="nav-link" href="#cover">Kapak</a>
      <a class="nav-link" href="#classes">Sınıflar</a>
      <a class="nav-link" href="#cabanas">Kabana</a>
      <a class="nav-link" href="#concepts">Konsept</a>
      <a class="nav-link" href="#pricing">Fiyat</a>
    </div>
  </nav>

  <main>
    <div id="cover">${coverSlide}</div>
    <div id="classes">${classSlide}</div>
    <div id="cabanas">${cabanaSlide}</div>
    <div id="concepts">${conceptSlide}</div>
    <div id="pricing">${priceSlide}</div>
    <div id="closing">${closingSlide}</div>
  </main>
</body>
</html>`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class HtmlPresentationEngine {
  async generate(): Promise<string> {
    const data = await fetchData();
    return buildHtml(data);
  }
}

export const htmlPresentationEngine = new HtmlPresentationEngine();
