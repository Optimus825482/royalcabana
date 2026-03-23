import { prisma } from "@/lib/prisma";
import { DatabaseError } from "@/lib/errors";
import { cached } from "@/lib/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemStats {
  cabanas: {
    total: number;
    available: number;
    reserved: number;
    occupied: number;
    closed: number;
  };
  classes: { name: string; count: number; description: string }[];
  concepts: {
    name: string;
    description: string;
    productCount: number;
    totalValue: number;
    serviceFee: number;
  }[];
  reservations: {
    total: number;
    pending: number;
    approved: number;
    checkedIn: number;
    checkedOut: number;
    cancelled: number;
    rejected: number;
    avgDuration: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  guests: {
    total: number;
    vip: { standard: number; silver: number; gold: number; platinum: number };
    blacklisted: number;
  };
  fnb: {
    totalOrders: number;
    preparing: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
  };
  products: { total: number; active: number; groups: number };
  users: {
    total: number;
    admins: number;
    casinoUsers: number;
    fnbUsers: number;
    systemAdmins: number;
  };
  staff: { total: number; active: number };
  servicePoints: { total: number; types: { type: string; count: number }[] };
  extraServices: { total: number; categories: string[] };
  reviews: { total: number; avgRating: number };
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchSystemStats(): Promise<SystemStats> {
  const db = prisma;
  const [
    cabanas,
    classes,
    concepts,
    reservations,
    guests,
    fnbOrders,
    products,
    productGroups,
    users,
    staff,
    servicePoints,
    extraServices,
    reviews,
  ] = await Promise.all([
    db.cabana.findMany({
      where: { isDeleted: false },
      include: {
        cabanaClass: true,
        concept: { include: { products: { include: { product: true } } } },
      },
    }),
    db.cabanaClass.findMany({
      where: { isDeleted: false },
      include: { attributes: true },
    }),
    db.concept.findMany({
      where: { isDeleted: false },
      include: { products: { include: { product: true } } },
    }),
    db.reservation.findMany({ where: { isDeleted: false } }),
    db.guest.findMany({ where: { isDeleted: false } }),
    db.fnbOrder.findMany({ include: { items: true } }),
    db.product.findMany({ where: { isDeleted: false } }),
    db.productGroup.findMany({ where: { isDeleted: false } }),
    db.user.findMany({ where: { isDeleted: false } }),
    db.staff.findMany({ where: { isDeleted: false } }),
    db.servicePoint.findMany({ where: { isDeleted: false } }),
    db.extraService.findMany({ where: { isDeleted: false } }),
    db.review.findMany({ where: { isDeleted: false } }),
  ]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setMonth(monthStart.getMonth() - 1);

  const completedRes = reservations.filter((reservation) =>
    Boolean(reservation.checkInAt && reservation.checkOutAt),
  );
  const avgDuration =
    completedRes.length > 0
      ? completedRes.reduce((sum, reservation) => {
          const days = Math.ceil(
            (new Date(reservation.endDate).getTime() -
              new Date(reservation.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }, 0) / completedRes.length
      : 0;

  const fnbTotalRevenue = fnbOrders
    .filter((order) => order.status !== "CANCELLED")
    .reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + Number(item.unitPrice) * item.quantity,
          0,
        ),
      0,
    );

  const spTypes: Record<string, number> = {};
  for (const sp of servicePoints) {
    spTypes[sp.type] = (spTypes[sp.type] ?? 0) + 1;
  }

  const categories = [
    ...new Set(
      extraServices
        .map((service) => service.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ];

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    cabanas: {
      total: cabanas.length,
      available: cabanas.filter((cabana) => cabana.status === "AVAILABLE").length,
      reserved: cabanas.filter((cabana) => cabana.status === "RESERVED").length,
      occupied: cabanas.filter((cabana) => cabana.status === "OCCUPIED").length,
      closed: cabanas.filter((cabana) => cabana.status === "CLOSED").length,
    },
    classes: classes.map((cls) => ({
      name: cls.name,
      count: cabanas.filter((cabana) => cabana.classId === cls.id).length,
      description: cls.description,
    })),
    concepts: concepts.map((concept) => {
      const totalValue = concept.products.reduce(
        (sum, conceptProduct) =>
          sum +
          Number(conceptProduct.product.salePrice) * conceptProduct.quantity,
        0,
      );
      return {
        name: concept.name,
        description: concept.description,
        productCount: concept.products.length,
        totalValue,
        serviceFee: Number(concept.serviceFee),
      };
    }),
    reservations: {
      total: reservations.length,
      pending: reservations.filter((reservation) => reservation.status === "PENDING").length,
      approved: reservations.filter((reservation) => reservation.status === "APPROVED").length,
      checkedIn: reservations.filter((reservation) => reservation.status === "CHECKED_IN")
        .length,
      checkedOut: reservations.filter((reservation) => reservation.status === "CHECKED_OUT")
        .length,
      cancelled: reservations.filter((reservation) => reservation.status === "CANCELLED")
        .length,
      rejected: reservations.filter((reservation) => reservation.status === "REJECTED").length,
      avgDuration: Math.round(avgDuration * 10) / 10,
      todayCount: reservations.filter(
        (reservation) => new Date(reservation.createdAt) >= todayStart,
      ).length,
      weekCount: reservations.filter(
        (reservation) => new Date(reservation.createdAt) >= weekStart,
      ).length,
      monthCount: reservations.filter(
        (reservation) => new Date(reservation.createdAt) >= monthStart,
      ).length,
    },
    guests: {
      total: guests.length,
      vip: {
        standard: guests.filter((guest) => guest.vipLevel === "STANDARD").length,
        silver: guests.filter((guest) => guest.vipLevel === "SILVER").length,
        gold: guests.filter((guest) => guest.vipLevel === "GOLD").length,
        platinum: guests.filter((guest) => guest.vipLevel === "PLATINUM").length,
      },
      blacklisted: guests.filter((guest) => guest.isBlacklisted).length,
    },
    fnb: {
      totalOrders: fnbOrders.length,
      preparing: fnbOrders.filter((order) => order.status === "PREPARING").length,
      delivered: fnbOrders.filter((order) => order.status === "DELIVERED").length,
      cancelled: fnbOrders.filter((order) => order.status === "CANCELLED").length,
      totalRevenue: fnbTotalRevenue,
    },
    products: {
      total: products.length,
      active: products.filter((product) => product.isActive).length,
      groups: productGroups.length,
    },
    users: {
      total: users.length,
      admins: users.filter((user) => user.role === "ADMIN").length,
      casinoUsers: users.filter((user) => user.role === "CASINO_USER").length,
      fnbUsers: users.filter((user) => user.role === "FNB_USER").length,
      systemAdmins: users.filter((user) => user.role === "SYSTEM_ADMIN").length,
    },
    staff: {
      total: staff.length,
      active: staff.filter((employee) => employee.isActive).length,
    },
    servicePoints: {
      total: servicePoints.length,
      types: Object.entries(spTypes).map(([type, count]) => ({
        type,
        count: count as number,
      })),
    },
    extraServices: { total: extraServices.length, categories },
    reviews: {
      total: reviews.length,
      avgRating:
        reviews.length > 0
          ? Math.round((totalRating / reviews.length) * 10) / 10
          : 0,
    },
  };
}

// ─── HTML Presentation Builder ────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("tr-TR");
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildComprehensiveHtml(stats: SystemStats): string {
  const date = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const occupancyRate =
    stats.cabanas.total > 0
      ? Math.round(
          ((stats.cabanas.reserved + stats.cabanas.occupied) /
            stats.cabanas.total) *
            100,
        )
      : 0;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Royal Cabana — Sistem Tanıtım Sunumu</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a14;--surface:#12122a;--surface2:#1a1a36;--border:#252550;
  --gold:#d4af37;--gold-dim:#a08520;--gold-light:#f0d060;
  --text:#e8e8f4;--muted:#7878a0;--accent:#5090ff;
  --green:#34d399;--red:#f87171;--amber:#fbbf24;--purple:#a78bfa;
}
html{scroll-behavior:smooth;font-size:16px}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;overflow-x:hidden}

/* ── Print ── */
@media print{
  nav,.nav-progress{display:none!important}
  .slide{page-break-after:always;min-height:100vh;padding:40px!important}
  body{background:#fff;color:#111}
  :root{--surface:#f8f8fc;--surface2:#f0f0f8;--border:#ddd;--text:#111;--muted:#666;--gold:#8B6914}
}

/* ── Navigation ── */
nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  background:rgba(10,10,20,.94);backdrop-filter:blur(16px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 32px;height:56px;
}
.nav-brand{font-size:14px;font-weight:800;color:var(--gold);letter-spacing:1.5px;text-transform:uppercase}
.nav-links{display:flex;gap:2px;overflow-x:auto;max-width:70vw}
.nav-link{
  padding:6px 14px;border-radius:8px;font-size:11px;font-weight:600;
  color:var(--muted);text-decoration:none;transition:.2s;white-space:nowrap;
  border:1px solid transparent;
}
.nav-link:hover{color:var(--text);background:var(--surface);border-color:var(--border)}
.nav-progress{
  position:fixed;top:56px;left:0;right:0;height:2px;z-index:99;
  background:var(--border);
}
.nav-progress-bar{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-light));width:0;transition:width .1s}

/* ── Slides ── */
.slide{
  min-height:100vh;padding:96px 72px 72px;
  border-bottom:1px solid var(--border);
  display:flex;flex-direction:column;position:relative;
}
.slide-num{
  position:absolute;top:72px;right:72px;
  font-size:64px;font-weight:900;color:var(--border);letter-spacing:-2px;
  line-height:1;
}

/* ── Cover ── */
.cover{
  background:radial-gradient(ellipse at 20% 30%,#1a1a40 0%,var(--bg) 60%);
  align-items:center;justify-content:center;text-align:center;
}
.cover-logo{
  width:96px;height:96px;border-radius:24px;
  background:linear-gradient(135deg,var(--gold),var(--gold-dim));
  display:flex;align-items:center;justify-content:center;
  font-size:32px;font-weight:900;color:var(--bg);
  margin:0 auto 32px;box-shadow:0 0 60px rgba(212,175,55,.25);
}
.cover h1{font-size:clamp(2.5rem,5vw,4rem);font-weight:900;color:var(--gold);letter-spacing:-1px;margin-bottom:12px}
.cover .subtitle{font-size:clamp(1rem,2vw,1.4rem);color:var(--muted);margin-bottom:8px;font-weight:400}
.cover .date{font-size:14px;color:var(--border);margin-bottom:48px}
.cover-metrics{display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:wrap}
.metric-item{display:flex;flex-direction:column;align-items:center;padding:0 clamp(16px,3vw,40px)}
.metric-num{font-size:clamp(1.5rem,4vw,2.5rem);font-weight:900;color:var(--gold)}
.metric-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-top:4px}
.metric-divider{width:1px;height:56px;background:var(--border)}

/* ── Slide Header ── */
.sh{display:flex;align-items:baseline;gap:16px;margin-bottom:40px}
.sh-num{font-size:12px;font-weight:800;color:var(--gold);opacity:.5;letter-spacing:2px}
.sh h2{font-size:clamp(1.4rem,3vw,2rem);font-weight:800;color:var(--text)}
.sh-sub{font-size:14px;color:var(--muted);margin-top:4px}

/* ── Cards / Grid ── */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.card-grid-3{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card-grid-4{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
.card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:14px;padding:20px;transition:border-color .2s;
}
.card:hover{border-color:var(--gold)}
.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.card-title{font-size:15px;font-weight:700;color:var(--gold)}
.card-badge{font-size:10px;color:var(--muted);background:var(--surface2);padding:3px 10px;border-radius:12px}
.card-desc{font-size:13px;color:var(--muted);line-height:1.6}

/* ── Stat boxes ── */
.stat-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.stat-box{
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:16px 20px;text-align:center;
}
.stat-box.gold{border-color:rgba(212,175,55,.3);background:rgba(212,175,55,.06)}
.stat-box.green{border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.06)}
.stat-box.blue{border-color:rgba(80,144,255,.3);background:rgba(80,144,255,.06)}
.stat-box.amber{border-color:rgba(251,191,36,.3);background:rgba(251,191,36,.06)}
.stat-box.red{border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.06)}
.stat-box.purple{border-color:rgba(167,139,250,.3);background:rgba(167,139,250,.06)}
.stat-val{font-size:28px;font-weight:800;line-height:1.1}
.stat-val.gold{color:var(--gold)}.stat-val.green{color:var(--green)}.stat-val.blue{color:var(--accent)}
.stat-val.amber{color:var(--amber)}.stat-val.red{color:var(--red)}.stat-val.purple{color:var(--purple)}
.stat-lbl{font-size:11px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}

/* ── Tables ── */
.tbl-wrap{overflow-x:auto;border-radius:12px;border:1px solid var(--border)}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl thead tr{background:var(--surface2)}
.tbl th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--border)}
.tbl td{padding:11px 16px;border-bottom:1px solid var(--border)}
.tbl tbody tr:last-child td{border-bottom:none}
.tbl tbody tr:nth-child(even){background:var(--surface)}
.tbl tbody tr:nth-child(odd){background:var(--surface2)}
.tbl .bold{font-weight:700;color:var(--text)}
.tbl .price{font-weight:700;color:var(--gold)}

/* ── Flow diagram ── */
.flow{display:flex;align-items:center;gap:0;flex-wrap:wrap;justify-content:center;margin:24px 0}
.flow-step{
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:12px 20px;font-size:13px;font-weight:600;color:var(--text);text-align:center;
  min-width:120px;
}
.flow-step.active{border-color:var(--gold);color:var(--gold);background:rgba(212,175,55,.08)}
.flow-arrow{color:var(--border);font-size:20px;padding:0 6px}

/* ── Role cards ── */
.role-card{background:var(--surface);border-radius:14px;padding:24px;border:1px solid var(--border)}
.role-icon{font-size:28px;margin-bottom:12px}
.role-name{font-size:16px;font-weight:800;margin-bottom:8px}
.role-list{list-style:none;padding:0}
.role-list li{font-size:12px;color:var(--muted);padding:3px 0;padding-left:16px;position:relative}
.role-list li::before{content:"•";position:absolute;left:0;color:var(--gold)}

/* ── Feature grid ── */
.feat{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center}
.feat-icon{font-size:32px;margin-bottom:10px}
.feat-title{font-size:13px;font-weight:700;color:var(--gold);margin-bottom:6px}
.feat-desc{font-size:11px;color:var(--muted);line-height:1.5}

/* ── Two column ── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:32px}
@media(max-width:768px){.two-col{grid-template-columns:1fr}}

/* ── Closing ── */
.closing{
  background:radial-gradient(ellipse at 70% 60%,#1a1a40 0%,var(--bg) 60%);
  align-items:center;justify-content:center;text-align:center;
}
.closing h2{font-size:clamp(2rem,4vw,3rem);font-weight:900;color:var(--gold);margin-bottom:12px}
.closing .sub{font-size:16px;color:var(--muted);margin-bottom:8px}
.closing .info{font-size:13px;color:var(--border)}
</style>
</head>
<body>

<nav>
  <span class="nav-brand">Royal Cabana</span>
  <div class="nav-links">
    <a class="nav-link" href="#cover">Kapak</a>
    <a class="nav-link" href="#overview">Genel Bakış</a>
    <a class="nav-link" href="#cabanas">Cabana</a>
    <a class="nav-link" href="#concepts">Konseptler</a>
    <a class="nav-link" href="#reservation">Rezervasyon</a>
    <a class="nav-link" href="#workflow">İş Akışı</a>
    <a class="nav-link" href="#fnb">F&B</a>
    <a class="nav-link" href="#guests">Misafir</a>
    <a class="nav-link" href="#roles">Roller</a>
    <a class="nav-link" href="#features">Özellikler</a>
    <a class="nav-link" href="#pricing">Fiyat</a>
    <a class="nav-link" href="#staff">Personel</a>
    <a class="nav-link" href="#closing">Son</a>
  </div>
</nav>
<div class="nav-progress"><div class="nav-progress-bar" id="progressBar"></div></div>

<!-- ═══════ 1. COVER ═══════ -->
<section class="slide cover" id="cover">
  <div class="cover-logo">RC</div>
  <h1>Royal Cabana</h1>
  <p class="subtitle">Cabana Yönetim & Rezervasyon Sistemi</p>
  <p class="subtitle" style="font-size:15px;color:var(--muted)">Üst Yönetim & Kullanıcı Tanıtım Sunumu</p>
  <p class="date">${date} — Merit Royal · Alsancak, KKTC</p>
  <div class="cover-metrics">
    <div class="metric-item"><span class="metric-num">${stats.cabanas.total}</span><span class="metric-label">Cabana</span></div>
    <div class="metric-divider"></div>
    <div class="metric-item"><span class="metric-num">${stats.classes.length}</span><span class="metric-label">Sınıf</span></div>
    <div class="metric-divider"></div>
    <div class="metric-item"><span class="metric-num">${stats.concepts.length}</span><span class="metric-label">Konsept</span></div>
    <div class="metric-divider"></div>
    <div class="metric-item"><span class="metric-num">${fmt(stats.reservations.total)}</span><span class="metric-label">Rezervasyon</span></div>
    <div class="metric-divider"></div>
    <div class="metric-item"><span class="metric-num">${fmt(stats.guests.total)}</span><span class="metric-label">Misafir</span></div>
  </div>
</section>

<!-- ═══════ 2. SİSTEM GENEL BAKIŞ ═══════ -->
<section class="slide" id="overview">
  <span class="slide-num">01</span>
  <div class="sh">
    <span class="sh-num">01</span>
    <div>
      <h2>Sistem Genel Bakışı</h2>
      <p class="sh-sub">Royal Cabana Dijital Yönetim Platformu — Ne Yapar?</p>
    </div>
  </div>
  <p style="font-size:15px;color:var(--muted);max-width:900px;margin-bottom:32px;line-height:1.8">
    <strong style="color:var(--text)">Royal Cabana Rezervasyon Sistemi</strong>, Merit Royal Hotel bünyesindeki plaj cabana alanlarının uçtan uca dijital yönetimini sağlayan kapsamlı bir platformdur. Cabana envanter yönetiminden rezervasyon taleplerine, misafir takibinden F&B sipariş yönetimine, fiyatlandırmadan raporlamaya kadar tüm operasyonel süreçleri tek bir ekrandan yönetmenize imkân tanır.
  </p>
  <div class="card-grid-3">
    <div class="feat"><div class="feat-icon">🏖️</div><div class="feat-title">Cabana Yönetimi</div><div class="feat-desc">Cabana envanteri, sınıflar, konseptler, interaktif harita üzerinde yerleşim planı ve durum takibi</div></div>
    <div class="feat"><div class="feat-icon">📅</div><div class="feat-title">Rezervasyon Sistemi</div><div class="feat-desc">Talep oluşturma, onay/red akışı, takvim görünümü, check-in/out işlemleri, değişiklik ve iptal talepleri</div></div>
    <div class="feat"><div class="feat-icon">💰</div><div class="feat-title">Dinamik Fiyatlandırma</div><div class="feat-desc">Sınıf ve konsept bazlı esnek fiyat yönetimi, ekstra hizmet fiyatlandırma, otomatik toplam hesaplama</div></div>
    <div class="feat"><div class="feat-icon">🍽️</div><div class="feat-title">F&B Servis Yönetimi</div><div class="feat-desc">Konsept ürünlerinin zamanında cabana'ya ulaştırılması, ekstra taleplerin koordinasyonu, servis takibi</div></div>
    <div class="feat"><div class="feat-icon">👥</div><div class="feat-title">Misafir Veritabanı</div><div class="feat-desc">VIP seviye takibi (Standard, Silver, Gold, Platinum), ziyaret geçmişi, kara liste yönetimi</div></div>
    <div class="feat"><div class="feat-icon">📊</div><div class="feat-title">Raporlama & Analiz</div><div class="feat-desc">Doluluk, gelir, performans, F&B ve misafir analizleri, CSV/Excel/PDF dışa aktarma</div></div>
    <div class="feat"><div class="feat-icon">🔒</div><div class="feat-title">Güvenlik & Yetki</div><div class="feat-desc">Rol bazlı erişim kontrolü (RBAC), JWT kimlik doğrulama, denetim kaydı, oturum takibi</div></div>
    <div class="feat"><div class="feat-icon">🗺️</div><div class="feat-title">İnteraktif Harita</div><div class="feat-desc">Cabana yerleşimini harita üzerinde görüntüleme, durum renklendirmesi, sürükle-bırak düzenleme</div></div>
    <div class="feat"><div class="feat-icon">🔔</div><div class="feat-title">Bildirim Sistemi</div><div class="feat-desc">Anlık bildirimler, push notification, e-posta bildirimleri, SSE ile gerçek zamanlı güncelleme</div></div>
    <div class="feat"><div class="feat-icon">👷</div><div class="feat-title">Personel Yönetimi</div><div class="feat-desc">Personel atamaları, görev tanımları, vardiya planlama, hizmet noktası koordinasyonu</div></div>
    <div class="feat"><div class="feat-icon">⭐</div><div class="feat-title">Değerlendirme</div><div class="feat-desc">Misafir memnuniyet değerlendirmeleri, puan ortalamaları ve yorum takibi</div></div>
    <div class="feat"><div class="feat-icon">📱</div><div class="feat-title">Responsive & PWA</div><div class="feat-desc">Masaüstü, tablet ve mobil cihazlarda sorunsuz kullanım, offline destek, kurulabilir uygulama</div></div>
  </div>
</section>

<!-- ═══════ 3. CABANA ENVANTERİ ═══════ -->
<section class="slide" id="cabanas">
  <span class="slide-num">02</span>
  <div class="sh">
    <span class="sh-num">02</span>
    <div>
      <h2>Cabana Envanteri & Sınıflar</h2>
      <p class="sh-sub">Mevcut cabana durumu ve sınıf dağılımı</p>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-box gold"><div class="stat-val gold">${stats.cabanas.total}</div><div class="stat-lbl">Toplam Cabana</div></div>
    <div class="stat-box green"><div class="stat-val green">${stats.cabanas.available}</div><div class="stat-lbl">Müsait</div></div>
    <div class="stat-box amber"><div class="stat-val amber">${stats.cabanas.reserved}</div><div class="stat-lbl">Rezerveli</div></div>
    <div class="stat-box blue"><div class="stat-val blue">${stats.cabanas.occupied}</div><div class="stat-lbl">Kullanımda</div></div>
    <div class="stat-box red"><div class="stat-val red">${stats.cabanas.closed}</div><div class="stat-lbl">Kapalı</div></div>
    <div class="stat-box purple"><div class="stat-val purple">%${occupancyRate}</div><div class="stat-lbl">Doluluk Oranı</div></div>
  </div>

  <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:16px">Cabana Sınıfları</h3>
  <div class="card-grid">
    ${stats.classes
      .map(
        (cls) => `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${esc(cls.name)}</span>
        <span class="card-badge">${cls.count} cabana</span>
      </div>
      <p class="card-desc">${esc(cls.description.slice(0, 200))}</p>
    </div>`,
      )
      .join("")}
  </div>

  <div style="margin-top:24px;padding:16px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
    <p style="font-size:13px;color:var(--muted);line-height:1.7">
      <strong style="color:var(--text)">Cabana Yönetimi Nasıl Çalışır?</strong><br/>
      Her cabana bir sınıfa ve isteğe bağlı bir konsepte atanır. Sınıflar cabana'nın fiziksel özelliklerini (kapasite, konum, donanım) tanımlarken, konseptler sunulan yiyecek-içecek paketini belirler. Cabana durumları (Müsait, Rezerveli, Kullanımda, Kapalı) gerçek zamanlı olarak güncellenir. Yöneticiler harita üzerinden cabana'ları sürükle-bırak ile konumlandırabilir.
    </p>
  </div>
</section>

<!-- ═══════ 4. KONSEPTLER ═══════ -->
<section class="slide" id="concepts">
  <span class="slide-num">03</span>
  <div class="sh">
    <span class="sh-num">03</span>
    <div>
      <h2>Konseptler & Ürünler</h2>
      <p class="sh-sub">Cabana'lara atanabilen yiyecek-içecek paketleri</p>
    </div>
  </div>

  <p style="font-size:14px;color:var(--muted);margin-bottom:24px;max-width:800px;line-height:1.7">
    Konseptler, cabana misafirlerine sunulan yiyecek-içecek paketlerini tanımlar. Her konsept belirli ürünleri ve miktarları içerir. Cabana'lara konsept atanarak misafirlerin ne alacağı önceden belirlenir. Ek olarak servis ücreti tanımlanabilir.
  </p>

  <div class="card-grid">
    ${stats.concepts
      .map(
        (con) => `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${esc(con.name)}</span>
        <span class="card-badge">${con.productCount} ürün</span>
      </div>
      <p class="card-desc">${esc(con.description.slice(0, 150))}</p>
      <div style="margin-top:10px;display:flex;gap:12px;font-size:12px">
        <span style="color:var(--gold);font-weight:700">₺${fmtCurrency(con.totalValue)}</span>
        ${con.serviceFee > 0 ? `<span style="color:var(--muted)">+ ₺${fmtCurrency(con.serviceFee)} servis</span>` : ""}
      </div>
    </div>`,
      )
      .join("")}
  </div>

  <div style="margin-top:24px;padding:16px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
    <p style="font-size:13px;color:var(--muted);line-height:1.7">
      <strong style="color:var(--text)">Ürün & Stok Bilgisi:</strong>
      Sistemde toplam <strong style="color:var(--gold)">${fmt(stats.products.total)}</strong> ürün tanımlı,
      <strong style="color:var(--green)">${fmt(stats.products.active)}</strong> aktif,
      <strong style="color:var(--accent)">${stats.products.groups}</strong> ürün grubunda organize edilmiş.
    </p>
  </div>
</section>

<!-- ═══════ 5. REZERVASYON SİSTEMİ ═══════ -->
<section class="slide" id="reservation">
  <span class="slide-num">04</span>
  <div class="sh">
    <span class="sh-num">04</span>
    <div>
      <h2>Rezervasyon Sistemi</h2>
      <p class="sh-sub">Talep oluşturma, onay akışı ve durum takibi</p>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-box gold"><div class="stat-val gold">${fmt(stats.reservations.total)}</div><div class="stat-lbl">Toplam Rezervasyon</div></div>
    <div class="stat-box amber"><div class="stat-val amber">${stats.reservations.pending}</div><div class="stat-lbl">Bekleyen</div></div>
    <div class="stat-box green"><div class="stat-val green">${stats.reservations.approved}</div><div class="stat-lbl">Onaylanan</div></div>
    <div class="stat-box blue"><div class="stat-val blue">${stats.reservations.checkedIn}</div><div class="stat-lbl">Check-in</div></div>
    <div class="stat-box purple"><div class="stat-val purple">${stats.reservations.checkedOut}</div><div class="stat-lbl">Check-out</div></div>
    <div class="stat-box red"><div class="stat-val red">${stats.reservations.cancelled + stats.reservations.rejected}</div><div class="stat-lbl">İptal/Red</div></div>
  </div>

  <div class="two-col">
    <div>
      <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:12px">Rezervasyon İşlemleri</h3>
      <div style="font-size:13px;color:var(--muted);line-height:1.8">
        <p style="margin-bottom:10px"><strong style="color:var(--text)">Talep Oluşturma:</strong> Casino kullanıcısı, uygun cabana seçerek tarih, misafir adı ve isteğe bağlı konsept bilgileriyle bir rezervasyon talebi oluşturur. Sistem müsaitlik kontrolü yapar.</p>
        <p style="margin-bottom:10px"><strong style="color:var(--text)">Onay / Red:</strong> Admin kullanıcılar gelen talepleri inceler. Onaylanan taleplerde fiyat otomatik hesaplanır ve casino kullanıcısına bildirim gönderilir.</p>
        <p style="margin-bottom:10px"><strong style="color:var(--text)">Check-in / Check-out:</strong> F&B kullanıcısı veya admin, misafirin geldiğini günün rezervasyon listesinden doğrulayarak check-in yapar. Cabana "Kullanımda" durumuna geçer. Ayrıldığında check-out işlemiyle cabana tekrar müsait olur.</p>
        <p><strong style="color:var(--text)">Değişiklik & İptal:</strong> Onaylanan rezervasyonlarda tarih, cabana veya misafir değişikliği talep edilebilir. İptal talepleri de onay mekanizmasından geçer.</p>
      </div>
    </div>
    <div>
      <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:12px">Zaman Analizi</h3>
      <div class="stat-row" style="grid-template-columns:1fr 1fr">
        <div class="stat-box blue"><div class="stat-val blue">${stats.reservations.todayCount}</div><div class="stat-lbl">Bugün Gelen</div></div>
        <div class="stat-box green"><div class="stat-val green">${stats.reservations.weekCount}</div><div class="stat-lbl">Bu Hafta</div></div>
        <div class="stat-box amber"><div class="stat-val amber">${stats.reservations.monthCount}</div><div class="stat-lbl">Bu Ay</div></div>
        <div class="stat-box purple"><div class="stat-val purple">${stats.reservations.avgDuration}</div><div class="stat-lbl">Ort. Gün/Rez.</div></div>
      </div>
      <div style="margin-top:16px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:10px">
        <p style="font-size:12px;color:var(--muted);line-height:1.6">
          <strong style="color:var(--text)">Ekstra Özellikler:</strong> Bekleme listesi, tekrarlayan rezervasyonlar (haftalık/aylık), blackout tarihleri (tatil/bakım günleri) ve ekstra konsept talepleri sisteme entegredir.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- ═══════ 6. İŞ AKIŞI ═══════ -->
<section class="slide" id="workflow">
  <span class="slide-num">05</span>
  <div class="sh">
    <span class="sh-num">05</span>
    <div>
      <h2>Rezervasyon İş Akışı</h2>
      <p class="sh-sub">Talep — Onay — Kullanım — Tamamlama süreci</p>
    </div>
  </div>

  <div class="flow">
    <div class="flow-step active">📋 Talep Oluştur</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step">⏳ Onay Bekliyor</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step active">✅ Onaylandı</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step">🏖️ Check-in</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step active">🎯 Aktif Kullanım</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step">🔚 Check-out</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step active">✔️ Tamamlandı</div>
  </div>

  <div style="margin-top:16px;text-align:center;font-size:12px;color:var(--muted)">
    ↕ Reddedilme &nbsp;&nbsp; ↕ Değişiklik Talebi &nbsp;&nbsp; ↕ İptal Talebi &nbsp;&nbsp; ↕ Ekstra Konsept Talebi
  </div>

  <div class="two-col" style="margin-top:36px">
    <div>
      <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:16px">Talep Aşaması</h3>
      <div style="font-size:13px;color:var(--muted);line-height:1.8">
        <p style="margin-bottom:8px">1. Kullanıcı takvimden uygun tarihleri seçer</p>
        <p style="margin-bottom:8px">2. Müsait cabana'lardan birini seçer (harita veya liste görünümü)</p>
        <p style="margin-bottom:8px">3. Misafir bilgilerini girer (mevcut misafir veya yeni kayıt)</p>
        <p style="margin-bottom:8px">4. Konsept ve ekstra hizmet seçimi yapar</p>
        <p>5. Talebi gönderir — yöneticilere anlık bildirim iletilir</p>
      </div>
    </div>
    <div>
      <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:16px">Onay & İşlem Aşaması</h3>
      <div style="font-size:13px;color:var(--muted);line-height:1.8">
        <p style="margin-bottom:8px">1. Admin bildirim alır ve talebi inceler</p>
        <p style="margin-bottom:8px">2. Onaylama: Fiyat hesaplanır, cabana "Rezerveli" olur</p>
        <p style="margin-bottom:8px">3. Reddetme: Neden belirtilir, kullanıcı bilgilendirilir</p>
        <p style="margin-bottom:8px">4. Check-in: F&B veya admin, günün listesinden misafir gelişini doğrular</p>
        <p>5. Check-out: Kullanım sona erer, cabana tekrar müsait olur</p>
      </div>
    </div>
  </div>
</section>

<!-- ═══════ 7. F&B SİPARİŞ YÖNETİMİ ═══════ -->
<section class="slide" id="fnb">
  <span class="slide-num">06</span>
  <div class="sh">
    <span class="sh-num">06</span>
    <div>
      <h2>F&B Servis Yönetimi</h2>
      <p class="sh-sub">Konsept ürünleri ve ekstra taleplerin cabana'ya servis edilmesi</p>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-box gold"><div class="stat-val gold">${fmt(stats.fnb.totalOrders)}</div><div class="stat-lbl">Toplam Sipariş</div></div>
    <div class="stat-box amber"><div class="stat-val amber">${stats.fnb.preparing}</div><div class="stat-lbl">Hazırlanıyor</div></div>
    <div class="stat-box green"><div class="stat-val green">${stats.fnb.delivered}</div><div class="stat-lbl">Teslim Edildi</div></div>
    <div class="stat-box red"><div class="stat-val red">${stats.fnb.cancelled}</div><div class="stat-lbl">İptal</div></div>
    <div class="stat-box blue"><div class="stat-val blue">₺${fmtCurrency(stats.fnb.totalRevenue)}</div><div class="stat-lbl">Toplam Gelir</div></div>
  </div>

  <div style="padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
    <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:12px">F&B Servis Nasıl Çalışır?</h3>
    <div style="font-size:13px;color:var(--muted);line-height:1.8">
      <p style="margin-bottom:8px"><strong style="color:var(--text)">Konsept Ürün Servisi:</strong> F&B kullanıcısı, o günkü aktif rezervasyonların konseptlerine dahil ürünlerin zamanında cabana'ya ulaştırılmasından sorumludur.</p>
      <p style="margin-bottom:8px"><strong style="color:var(--text)">Ekstra Talep Koordinasyonu:</strong> Misafirlerin konsept dışı ekstra talepleri (admin onayından sonra) F&B ekibi tarafından hazırlanır ve teslim edilir.</p>
      <p style="margin-bottom:8px"><strong style="color:var(--text)">Check-in Doğrulama:</strong> F&B kullanıcısı veya admin, misafirin geldiğini günün rezervasyon listesinden doğrulayarak check-in işlemi gerçekleştirir.</p>
      <p><strong style="color:var(--text)">Ürün Yönetimi:</strong> Ürünler kategorilere ayrılmıştır (ürün grupları). Her ürünün alış ve satış fiyatı tanımlıdır.</p>
    </div>
  </div>
</section>

<!-- ═══════ 8. MİSAFİR VERİTABANI ═══════ -->
<section class="slide" id="guests">
  <span class="slide-num">07</span>
  <div class="sh">
    <span class="sh-num">07</span>
    <div>
      <h2>Misafir Veritabanı</h2>
      <p class="sh-sub">VIP seviye takibi, ziyaret geçmişi ve değerlendirmeler</p>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-box gold"><div class="stat-val gold">${fmt(stats.guests.total)}</div><div class="stat-lbl">Toplam Misafir</div></div>
    <div class="stat-box"><div class="stat-val" style="color:var(--muted)">${stats.guests.vip.standard}</div><div class="stat-lbl">Standard</div></div>
    <div class="stat-box" style="border-color:rgba(192,192,192,.3)"><div class="stat-val" style="color:#c0c0c0">${stats.guests.vip.silver}</div><div class="stat-lbl">Silver</div></div>
    <div class="stat-box gold"><div class="stat-val gold">${stats.guests.vip.gold}</div><div class="stat-lbl">Gold</div></div>
    <div class="stat-box purple"><div class="stat-val purple">${stats.guests.vip.platinum}</div><div class="stat-lbl">Platinum</div></div>
    <div class="stat-box red"><div class="stat-val red">${stats.guests.blacklisted}</div><div class="stat-lbl">Kara Liste</div></div>
  </div>

  <div class="two-col">
    <div style="padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:12px">Misafir Yönetimi</h3>
      <div style="font-size:13px;color:var(--muted);line-height:1.8">
        <p style="margin-bottom:8px">• Her misafir için telefon, e-posta ve özel notlar tutulur</p>
        <p style="margin-bottom:8px">• VIP seviyeleri (Standard → Silver → Gold → Platinum) ile misafir segmentasyonu</p>
        <p style="margin-bottom:8px">• Toplam ziyaret sayısı ve son ziyaret tarihi otomatik güncellenir</p>
        <p style="margin-bottom:8px">• Kara liste özelliği ile sorunlu misafirlerin takibi</p>
      </div>
    </div>
    <div style="padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <h3 style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:12px">Değerlendirme Sistemi</h3>
      <div style="font-size:13px;color:var(--muted);line-height:1.8">
        <p style="margin-bottom:16px">Misafirler deneyimleri sonunda 1-5 arası puan ve yorum bırakabilir.</p>
        <div class="stat-row" style="grid-template-columns:1fr 1fr">
          <div class="stat-box gold"><div class="stat-val gold">${stats.reviews.total}</div><div class="stat-lbl">Toplam Yorum</div></div>
          <div class="stat-box amber"><div class="stat-val amber">${stats.reviews.avgRating}/5</div><div class="stat-lbl">Ort. Puan</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════ 9. KULLANICI ROLLERİ ═══════ -->
<section class="slide" id="roles">
  <span class="slide-num">08</span>
  <div class="sh">
    <span class="sh-num">08</span>
    <div>
      <h2>Kullanıcı Rolleri & Yetkilendirme</h2>
      <p class="sh-sub">Rol bazlı erişim kontrolü (RBAC) — Kim ne yapar?</p>
    </div>
  </div>

  <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
    <div class="role-card" style="border-color:rgba(167,139,250,.3)">
      <div class="role-icon">🛡️</div>
      <div class="role-name" style="color:var(--purple)">System Admin <span style="font-size:12px;color:var(--muted);font-weight:400">(${stats.users.systemAdmins} kişi)</span></div>
      <ul class="role-list">
        <li>Tüm sistem ayarları ve konfigürasyon</li>
        <li>Kullanıcı yönetimi (oluşturma, düzenleme, silme)</li>
        <li>Cabana sınıf, konsept ve ürün tanımlama</li>
        <li>Fiyatlandırma politikalarını belirleme</li>
        <li>Tüm raporlara erişim ve sunum oluşturma</li>
        <li>Personel ve görev yönetimi</li>
        <li>Denetim kayıtlarını görüntüleme</li>
      </ul>
    </div>
    <div class="role-card" style="border-color:rgba(80,144,255,.3)">
      <div class="role-icon">👔</div>
      <div class="role-name" style="color:var(--accent)">Admin <span style="font-size:12px;color:var(--muted);font-weight:400">(${stats.users.admins} kişi)</span></div>
      <ul class="role-list">
        <li>Rezervasyon onay/red işlemleri</li>
        <li>Check-in / Check-out yönetimi</li>
        <li>Fiyat güncelleme ve konsept atama</li>
        <li>Misafir bilgi düzenleme</li>
        <li>Personel atama ve görev takibi</li>
        <li>Operasyonel raporları görüntüleme</li>
      </ul>
    </div>
    <div class="role-card" style="border-color:rgba(251,191,36,.3)">
      <div class="role-icon">🎰</div>
      <div class="role-name" style="color:var(--amber)">Casino User <span style="font-size:12px;color:var(--muted);font-weight:400">(${stats.users.casinoUsers} kişi)</span></div>
      <ul class="role-list">
        <li>Cabana müsaitlik görüntüleme (harita/takvim)</li>
        <li>Rezervasyon talebi oluşturma</li>
        <li>Değişiklik ve iptal talepleri gönderme</li>
        <li>Ekstra konsept / ürün talep etme</li>
        <li>Misafir değerlendirme ve yorum bırakma</li>
      </ul>
    </div>
    <div class="role-card" style="border-color:rgba(52,211,153,.3)">
      <div class="role-icon">🍽️</div>
      <div class="role-name" style="color:var(--green)">F&B User <span style="font-size:12px;color:var(--muted);font-weight:400">(${stats.users.fnbUsers} kişi)</span></div>
      <ul class="role-list">
        <li>Konsept ürünlerinin cabana'ya zamanında servis edilmesi</li>
        <li>Ekstra taleplerin hazırlanması ve teslimi</li>
        <li>Günün rezervasyon listesinden misafir check-in/out doğrulaması</li>
        <li>Günlük servis durumu ve ürün bilgisi görüntüleme</li>
      </ul>
    </div>
  </div>

  <div style="margin-top:20px;padding:14px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
    <p style="font-size:12px;color:var(--muted);line-height:1.6">
      <strong style="color:var(--text)">Toplam Kullanıcı:</strong> ${stats.users.total} aktif kullanıcı &nbsp;|&nbsp;
      Her işlem denetim kaydına (Audit Log) yazılır &nbsp;|&nbsp;
      Oturum takibi ile cihaz, IP ve konum bilgileri kaydedilir
    </p>
  </div>
</section>

<!-- ═══════ 10. SİSTEM ÖZELLİKLERİ ═══════ -->
<section class="slide" id="features">
  <span class="slide-num">09</span>
  <div class="sh">
    <span class="sh-num">09</span>
    <div>
      <h2>Sistem Özellikleri — Detaylı</h2>
      <p class="sh-sub">Tüm modüller ve yetenekler</p>
    </div>
  </div>

  <div class="two-col">
    <div>
      <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin-bottom:14px">Rezervasyon Modülü</h3>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        <p>• Takvim ve zaman çizelgesi görünümü ile müsaitlik kontrolü</p>
        <p>• Tek günlük ve çok günlük rezervasyon desteği</p>
        <p>• Otomatik fiyat hesaplama (konsept + ekstra + servis ücreti)</p>
        <p>• Değişiklik talebi (tarih, cabana, misafir değişikliği)</p>
        <p>• İptal talebi ve neden takibi</p>
        <p>• Ekstra konsept talebi (kullanım sırasında ek sipariş)</p>
        <p>• Bekleme listesi (müsait olmayan cabanalar için)</p>
        <p>• Tekrarlayan rezervasyonlar (haftalık, iki haftada bir, aylık)</p>
        <p>• Blackout tarihleri (bakım, özel etkinlik günleri)</p>
        <p>• Rezervasyon durum geçmişi (her adım kaydedilir)</p>
        <p>• Özel istekler ve liste dışı talep yönetimi</p>
      </div>

      <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin:20px 0 14px">Raporlama Modülü</h3>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        <p>• <strong style="color:var(--text)">Doluluk Raporu:</strong> Günlük/haftalık/aylık cabana doluluk oranları</p>
        <p>• <strong style="color:var(--text)">Gelir Raporu:</strong> Rezervasyon bazlı gelir analizi</p>
        <p>• <strong style="color:var(--text)">Performans Raporu:</strong> Cabana ve sınıf bazlı karşılaştırma</p>
        <p>• <strong style="color:var(--text)">F&B Raporu:</strong> Sipariş ve ürün satış analizi</p>
        <p>• <strong style="color:var(--text)">Misafir Raporu:</strong> VIP dağılım, ziyaret sıklığı</p>
        <p>• CSV, Excel ve PDF formatında dışa aktarma</p>
        <p>• Sunum oluşturma (HTML, PPTX, PDF)</p>
      </div>
    </div>
    <div>
      <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin-bottom:14px">Güvenlik & Altyapı</h3>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        <p>• JWT tabanlı kimlik doğrulama (NextAuth)</p>
        <p>• Rol bazlı erişim kontrolü (RBAC) — granüler izin sistemi</p>
        <p>• API rate limiting ve brute-force koruması</p>
        <p>• Hesap kilitleme (ard arda başarısız giriş)</p>
        <p>• Oturum takibi (IP, cihaz, tarayıcı, konum)</p>
        <p>• Tüm kritik işlemler denetim kaydına yazılır</p>
        <p>• Soft delete — veriler fiziksel olarak silinmez</p>
        <p>• Redis cache ile performans optimizasyonu</p>
      </div>

      <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin:20px 0 14px">Bildirim & İletişim</h3>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        <p>• SSE (Server-Sent Events) ile gerçek zamanlı bildirim</p>
        <p>• Push notification desteği (tarayıcı)</p>
        <p>• E-posta bildirimleri (rezervasyon onay/red, değişiklik)</p>
        <p>• Bildirim türleri: yeni talep, onay, red, değişiklik, check-in/out, F&B sipariş</p>
        <p>• Bildirim paneli ve okunmamış bildirim sayacı</p>
      </div>

      <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin:20px 0 14px">Teknoloji Altyapısı</h3>
      <div class="tbl-wrap" style="margin-top:8px">
        <table class="tbl">
          <thead><tr><th>Katman</th><th>Teknoloji</th></tr></thead>
          <tbody>
            <tr><td class="bold">Frontend</td><td>Next.js 15 + React + Tailwind CSS</td></tr>
            <tr><td class="bold">UI Kütüphanesi</td><td>shadcn/ui + Radix Primitives</td></tr>
            <tr><td class="bold">Backend</td><td>Next.js API Routes (App Router)</td></tr>
            <tr><td class="bold">Veritabanı</td><td>PostgreSQL + Prisma ORM</td></tr>
            <tr><td class="bold">Cache</td><td>Redis</td></tr>
            <tr><td class="bold">Harita</td><td>Three.js + React Three Fiber (2D/3D)</td></tr>
            <tr><td class="bold">3D Görünüm</td><td>Three.js + React Three Fiber</td></tr>
            <tr><td class="bold">Takvim</td><td>Custom React Calendar</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>

<!-- ═══════ 11. FİYATLANDIRMA ═══════ -->
<section class="slide" id="pricing">
  <span class="slide-num">10</span>
  <div class="sh">
    <span class="sh-num">10</span>
    <div>
      <h2>Fiyatlandırma Sistemi</h2>
      <p class="sh-sub">Konsept bazlı dinamik fiyat hesaplama</p>
    </div>
  </div>

  <div style="padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:24px">
    <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin-bottom:12px">Fiyat Hesaplama Formülü</h3>
    <p style="font-size:14px;color:var(--text);margin-bottom:12px;font-family:monospace;background:var(--surface2);padding:12px;border-radius:8px">
      Toplam = Σ(Ürün Fiyatı × Miktar) + Σ(Ekstra Hizmet Fiyatı) + Hizmet Ücreti × Gün Sayısı
    </p>
    <div style="font-size:13px;color:var(--muted);line-height:1.7">
      <p style="margin-bottom:6px"><strong style="color:var(--text)">1. Konsept Fiyatı:</strong> Cabana'ya atanan konseptteki ürünlerin (salePrice × quantity) toplamı</p>
      <p style="margin-bottom:6px"><strong style="color:var(--text)">2. Ekstra Ürünler:</strong> Rezervasyon sırasında veya sonrasında talep edilen ek ürün/hizmetler</p>
      <p><strong style="color:var(--text)">3. Hizmet Ücreti:</strong> Konsepte tanımlı sabit servis ücreti</p>
    </div>
  </div>

  ${
    stats.concepts.length > 0
      ? `
  <div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Konsept</th><th>Ürün Sayısı</th><th>Konsept Değeri</th><th>Servis Ücreti</th><th>Toplam</th></tr></thead>
      <tbody>
        ${stats.concepts
          .map(
            (con) => `
        <tr>
          <td class="bold">${esc(con.name)}</td>
          <td>${con.productCount}</td>
          <td class="price">₺${fmtCurrency(con.totalValue)}</td>
          <td>₺${fmtCurrency(con.serviceFee)}</td>
          <td class="price">₺${fmtCurrency(con.totalValue + con.serviceFee)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>`
      : '<div style="text-align:center;color:var(--muted);padding:24px">Henüz konsept tanımlanmamış.</div>'
  }

  ${
    stats.extraServices.total > 0
      ? `
  <div style="margin-top:20px;padding:16px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
    <p style="font-size:13px;color:var(--muted)">
      <strong style="color:var(--text)">Ekstra Hizmetler:</strong>
      Toplam ${stats.extraServices.total} ekstra hizmet tanımlı
      ${stats.extraServices.categories.length > 0 ? ` — Kategoriler: ${stats.extraServices.categories.join(", ")}` : ""}
    </p>
  </div>`
      : ""
  }
</section>

<!-- ═══════ 12. PERSONEL & HİZMET NOKTALARI ═══════ -->
<section class="slide" id="staff">
  <span class="slide-num">11</span>
  <div class="sh">
    <span class="sh-num">11</span>
    <div>
      <h2>Personel & Hizmet Noktaları</h2>
      <p class="sh-sub">Ekip yönetimi, görev atama ve hizmet noktası koordinasyonu</p>
    </div>
  </div>

  <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-box gold"><div class="stat-val gold">${stats.staff.total}</div><div class="stat-lbl">Toplam Personel</div></div>
    <div class="stat-box green"><div class="stat-val green">${stats.staff.active}</div><div class="stat-lbl">Aktif</div></div>
    <div class="stat-box blue"><div class="stat-val blue">${stats.servicePoints.total}</div><div class="stat-lbl">Hizmet Noktası</div></div>
    <div class="stat-box amber"><div class="stat-val amber">${stats.servicePoints.types.length}</div><div class="stat-lbl">Nokta Türü</div></div>
  </div>

  <div class="two-col">
    <div style="padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin-bottom:12px">Personel Yönetimi</h3>
      <div style="font-size:13px;color:var(--muted);line-height:1.8">
        <p style="margin-bottom:8px">• Personel kayıtları (isim, telefon, e-posta, pozisyon)</p>
        <p style="margin-bottom:8px">• Cabana bazlı günlük personel ataması</p>
        <p style="margin-bottom:8px">• Vardiya planlama (sabah, öğleden sonra, tam gün)</p>
        <p style="margin-bottom:8px">• Görev tanımlama ve takip (görev listesi, tamamlama durumu)</p>
        <p>• Hizmet noktasına personel atama (Bar, Restoran, Havuz Bar vb.)</p>
      </div>
    </div>
    <div>
      <h3 style="font-size:14px;font-weight:700;color:var(--gold);margin-bottom:12px">Hizmet Noktaları</h3>
      ${
        stats.servicePoints.types.length > 0
          ? `
      <div class="card-grid-4">
        ${stats.servicePoints.types
          .map(
            (sp) => `
        <div class="stat-box"><div class="stat-val gold" style="font-size:20px">${sp.count}</div><div class="stat-lbl">${esc(sp.type)}</div></div>
        `,
          )
          .join("")}
      </div>`
          : '<p style="font-size:13px;color:var(--muted)">Henüz hizmet noktası tanımlanmamış.</p>'
      }
      <div style="margin-top:16px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:10px">
        <p style="font-size:12px;color:var(--muted)">Hizmet noktaları harita üzerinde konumlandırılabilir. Her noktanın türü, gerekli personel sayısı ve roller tanımlanır.</p>
      </div>
    </div>
  </div>
</section>

<!-- ═══════ 13. KAPANIŞ ═══════ -->
<section class="slide closing" id="closing">
  <div class="cover-logo" style="width:80px;height:80px;border-radius:20px;font-size:28px">RC</div>
  <h2>Royal Cabana</h2>
  <p class="sub">Cabana Yönetim & Rezervasyon Sistemi</p>
  <p class="info" style="margin-top:12px">Merit Royal · Alsancak, KKTC — ${date}</p>
  <div style="margin-top:32px;display:flex;gap:24px;font-size:13px;color:var(--muted)">

  </div>
</section>

</body>
</html>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── PPTX Generator ──────────────────────────────────────────────────────────

async function generateComprehensivePptx(stats: SystemStats): Promise<Buffer> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = "Royal Cabana — Sistem Tanıtım Sunumu";

  const BG = "0a0a14";
  const SURFACE = "12122a";
  const GOLD = "d4af37";
  const WHITE = "e8e8f4";
  const MUTED = "7878a0";
  const date = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const addTitle = (
    slide: ReturnType<typeof pptx.addSlide>,
    title: string,
    yPos = 0.3,
  ) => {
    slide.addText(title, {
      x: 0.5,
      y: yPos,
      w: 12,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: GOLD,
    });
  };

  const tableHeader = (cols: string[]) =>
    cols.map((text) => ({
      text,
      options: { bold: true, color: WHITE, fill: { color: SURFACE } },
    }));

  // Slide 1: Cover
  const s1 = pptx.addSlide();
  s1.background = { color: BG };
  s1.addText("Royal Cabana", {
    x: 1,
    y: 1.5,
    w: 11,
    h: 1.5,
    fontSize: 48,
    bold: true,
    color: GOLD,
    align: "center",
  });
  s1.addText("Cabana Yönetim & Rezervasyon Sistemi", {
    x: 1,
    y: 3.2,
    w: 11,
    h: 0.6,
    fontSize: 20,
    color: WHITE,
    align: "center",
  });
  s1.addText("Üst Yönetim & Kullanıcı Tanıtım Sunumu", {
    x: 1,
    y: 3.9,
    w: 11,
    h: 0.5,
    fontSize: 15,
    color: MUTED,
    align: "center",
  });
  s1.addText(`${date} — Merit Royal · Alsancak, KKTC`, {
    x: 1,
    y: 4.6,
    w: 11,
    h: 0.4,
    fontSize: 12,
    color: MUTED,
    align: "center",
  });
  s1.addText(
    `${stats.cabanas.total} Cabana  |  ${stats.classes.length} Sınıf  |  ${stats.concepts.length} Konsept  |  ${stats.reservations.total} Rezervasyon  |  ${stats.guests.total} Misafir`,
    {
      x: 1,
      y: 5.5,
      w: 11,
      h: 0.4,
      fontSize: 13,
      color: GOLD,
      align: "center",
    },
  );

  // Slide 2: System Overview
  const s2 = pptx.addSlide();
  s2.background = { color: BG };
  addTitle(s2, "Sistem Genel Bakışı");
  s2.addText(
    "Royal Cabana, Merit Royal Hotel bünyesindeki plaj cabana alanlarının uçtan uca dijital yönetimini sağlayan kapsamlı bir platformdur.",
    {
      x: 0.5,
      y: 1.3,
      w: 12,
      h: 0.6,
      fontSize: 13,
      color: MUTED,
    },
  );
  const features = [
    "🏖️ Cabana Yönetimi — Envanter, sınıf, konsept ve harita",
    "📅 Rezervasyon — Talep, onay, check-in/out, değişiklik/iptal",
    "💰 Dinamik Fiyatlandırma — Konsept + ekstra + servis ücreti",
    "🍽️ F&B Servis — Konsept ürünleri ve ekstra talep koordinasyonu",
    "👥 Misafir Veritabanı — VIP seviye, ziyaret geçmişi",
    "📊 Raporlama — Doluluk, gelir, performans analizi",
    "🔒 Güvenlik — RBAC, JWT, denetim kaydı, oturum takibi",
    "🔔 Bildirimler — SSE, push, e-posta bildirimleri",
    "👷 Personel — Atama, görev, vardiya yönetimi",
    "📱 Responsive & PWA — Tüm cihazlarda kullanım",
  ];
  features.forEach((f, i) => {
    s2.addText(f, {
      x: 0.7,
      y: 2.1 + i * 0.42,
      w: 11,
      h: 0.4,
      fontSize: 12,
      color: WHITE,
    });
  });

  // Slide 3: Cabana Inventory
  const s3 = pptx.addSlide();
  s3.background = { color: BG };
  addTitle(s3, "Cabana Envanteri");
  s3.addTable(
    [
      tableHeader(["Toplam", "Müsait", "Rezerveli", "Kullanımda", "Kapalı"]),
      [
        String(stats.cabanas.total),
        String(stats.cabanas.available),
        String(stats.cabanas.reserved),
        String(stats.cabanas.occupied),
        String(stats.cabanas.closed),
      ],
    ] as Parameters<typeof s3.addTable>[0],
    {
      x: 0.5,
      y: 1.4,
      w: 12,
      colW: [2.4, 2.4, 2.4, 2.4, 2.4],
      fontSize: 14,
      color: WHITE,
      border: { type: "solid", color: "252550" },
    },
  );
  if (stats.classes.length > 0) {
    s3.addText("Cabana Sınıfları", {
      x: 0.5,
      y: 2.6,
      w: 12,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: GOLD,
    });
    s3.addTable(
      [
        tableHeader(["Sınıf", "Cabana Sayısı", "Açıklama"]),
        ...stats.classes.map((cls) => [
          cls.name,
          String(cls.count),
          cls.description.slice(0, 80),
        ]),
      ] as Parameters<typeof s3.addTable>[0],
      {
        x: 0.5,
        y: 3.2,
        w: 12,
        colW: [3, 2, 7],
        fontSize: 11,
        color: WHITE,
        border: { type: "solid", color: "252550" },
        autoPage: true,
      },
    );
  }

  // Slide 4: Concepts
  const s4 = pptx.addSlide();
  s4.background = { color: BG };
  addTitle(s4, "Konseptler & Ürünler");
  if (stats.concepts.length > 0) {
    s4.addTable(
      [
        tableHeader([
          "Konsept",
          "Ürün Sayısı",
          "Değer (₺)",
          "Servis (₺)",
          "Toplam (₺)",
        ]),
        ...stats.concepts.map((c) => [
          c.name,
          String(c.productCount),
          fmtCurrency(c.totalValue),
          fmtCurrency(c.serviceFee),
          fmtCurrency(c.totalValue + c.serviceFee),
        ]),
      ] as Parameters<typeof s4.addTable>[0],
      {
        x: 0.5,
        y: 1.4,
        w: 12,
        colW: [3, 2, 2.5, 2, 2.5],
        fontSize: 11,
        color: WHITE,
        border: { type: "solid", color: "252550" },
        autoPage: true,
      },
    );
  }
  s4.addText(
    `Toplam ${stats.products.total} ürün  |  ${stats.products.active} aktif  |  ${stats.products.groups} ürün grubu`,
    {
      x: 0.5,
      y: 6.5,
      w: 12,
      h: 0.4,
      fontSize: 11,
      color: MUTED,
    },
  );

  // Slide 5: Reservations
  const s5 = pptx.addSlide();
  s5.background = { color: BG };
  addTitle(s5, "Rezervasyon Sistemi");
  s5.addTable(
    [
      tableHeader([
        "Toplam",
        "Bekleyen",
        "Onaylı",
        "Check-in",
        "Check-out",
        "İptal/Red",
      ]),
      [
        String(stats.reservations.total),
        String(stats.reservations.pending),
        String(stats.reservations.approved),
        String(stats.reservations.checkedIn),
        String(stats.reservations.checkedOut),
        String(stats.reservations.cancelled + stats.reservations.rejected),
      ],
    ] as Parameters<typeof s5.addTable>[0],
    {
      x: 0.5,
      y: 1.4,
      w: 12,
      colW: [2, 2, 2, 2, 2, 2],
      fontSize: 13,
      color: WHITE,
      border: { type: "solid", color: "252550" },
    },
  );
  const resFeatures = [
    "• Talep oluşturma: Cabana, tarih, misafir ve konsept seçimi",
    "• Onay/Red akışı: Admin inceleme, otomatik fiyat hesaplama",
    "• Check-in/out: Kimlik doğrulama, durum güncelleme",
    "• Değişiklik ve iptal talepleri",
    "• Bekleme listesi, tekrarlayan rez., blackout tarihleri",
    "• Ekstra konsept talepleri ve özel istekler",
  ];
  resFeatures.forEach((f, i) => {
    s5.addText(f, {
      x: 0.7,
      y: 2.6 + i * 0.42,
      w: 11,
      h: 0.4,
      fontSize: 12,
      color: WHITE,
    });
  });

  // Slide 6: Workflow
  const s6 = pptx.addSlide();
  s6.background = { color: BG };
  addTitle(s6, "Rezervasyon İş Akışı");
  s6.addText(
    "Talep → Onay Bekliyor → Onaylandı → Check-in → Aktif Kullanım → Check-out → Tamamlandı",
    {
      x: 0.5,
      y: 1.6,
      w: 12,
      h: 0.6,
      fontSize: 14,
      bold: true,
      color: GOLD,
      align: "center",
    },
  );
  s6.addText(
    "↕ Reddedilme    ↕ Değişiklik Talebi    ↕ İptal Talebi    ↕ Ekstra Konsept",
    {
      x: 0.5,
      y: 2.4,
      w: 12,
      h: 0.4,
      fontSize: 11,
      color: MUTED,
      align: "center",
    },
  );
  const wfLeft = [
    "1. Kullanıcı takvimden tarih seçer",
    "2. Müsait cabana seçer",
    "3. Misafir bilgisi girer",
    "4. Konsept ve ekstra seçer",
    "5. Talebi gönderir",
  ];
  const wfRight = [
    "1. Admin bildirim alır",
    "2. Onaylama → fiyat hesaplanır",
    "3. Reddetme → neden belirtilir",
    "4. Check-in → cabana kullanımda",
    "5. Check-out → cabana müsait",
  ];
  s6.addText("Talep Aşaması", {
    x: 0.5,
    y: 3.2,
    w: 6,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: GOLD,
  });
  wfLeft.forEach((t, i) =>
    s6.addText(t, {
      x: 0.7,
      y: 3.7 + i * 0.38,
      w: 5.5,
      h: 0.36,
      fontSize: 11,
      color: WHITE,
    }),
  );
  s6.addText("Onay & İşlem", {
    x: 6.5,
    y: 3.2,
    w: 6,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: GOLD,
  });
  wfRight.forEach((t, i) =>
    s6.addText(t, {
      x: 6.7,
      y: 3.7 + i * 0.38,
      w: 5.5,
      h: 0.36,
      fontSize: 11,
      color: WHITE,
    }),
  );

  // Slide 7: F&B
  const s7 = pptx.addSlide();
  s7.background = { color: BG };
  addTitle(s7, "F&B Servis Yönetimi");
  s7.addTable(
    [
      tableHeader([
        "Toplam Sipariş",
        "Hazırlanıyor",
        "Teslim Edildi",
        "İptal",
        "Toplam Gelir",
      ]),
      [
        String(stats.fnb.totalOrders),
        String(stats.fnb.preparing),
        String(stats.fnb.delivered),
        String(stats.fnb.cancelled),
        `₺${fmtCurrency(stats.fnb.totalRevenue)}`,
      ],
    ] as Parameters<typeof s7.addTable>[0],
    {
      x: 0.5,
      y: 1.4,
      w: 12,
      colW: [2.4, 2.4, 2.4, 2.4, 2.4],
      fontSize: 13,
      color: WHITE,
      border: { type: "solid", color: "252550" },
    },
  );
  const fnbFeatures = [
    "• F&B kullanıcısı konsept ürünlerinin cabana'ya zamanında ulaşmasını sağlar",
    "• Ekstra talepler admin onayından sonra F&B ekibi tarafından hazırlanır",
    "• Günün rezervasyon listesinden misafir check-in/out doğrulaması yapılır",
    "• Ürün fiyatlandırma ve kategori yönetimi",
    `• Toplam ${stats.products.total} ürün, ${stats.products.groups} kategori`,
  ];
  fnbFeatures.forEach((f, i) => {
    s7.addText(f, {
      x: 0.7,
      y: 2.6 + i * 0.42,
      w: 11,
      h: 0.4,
      fontSize: 12,
      color: WHITE,
    });
  });

  // Slide 8: Guests
  const s8 = pptx.addSlide();
  s8.background = { color: BG };
  addTitle(s8, "Misafir Veritabanı & Değerlendirme");
  s8.addTable(
    [
      tableHeader([
        "Toplam",
        "Standard",
        "Silver",
        "Gold",
        "Platinum",
        "Kara Liste",
      ]),
      [
        String(stats.guests.total),
        String(stats.guests.vip.standard),
        String(stats.guests.vip.silver),
        String(stats.guests.vip.gold),
        String(stats.guests.vip.platinum),
        String(stats.guests.blacklisted),
      ],
    ] as Parameters<typeof s8.addTable>[0],
    {
      x: 0.5,
      y: 1.4,
      w: 12,
      colW: [2, 2, 2, 2, 2, 2],
      fontSize: 13,
      color: WHITE,
      border: { type: "solid", color: "252550" },
    },
  );
  s8.addText(
    `Değerlendirme: ${stats.reviews.total} yorum  |  Ortalama: ${stats.reviews.avgRating}/5`,
    {
      x: 0.5,
      y: 2.6,
      w: 12,
      h: 0.4,
      fontSize: 13,
      color: GOLD,
    },
  );

  // Slide 9: Roles
  const s9 = pptx.addSlide();
  s9.background = { color: BG };
  addTitle(s9, "Kullanıcı Rolleri");
  s9.addTable(
    [
      tableHeader(["Rol", "Kişi", "Yetkiler"]),
      [
        `System Admin`,
        String(stats.users.systemAdmins),
        "Tüm sistem, ayarlar, kullanıcı yönetimi, raporlar",
      ],
      [
        `Admin`,
        String(stats.users.admins),
        "Onay/red, check-in/out, fiyat, personel atama",
      ],
      [
        `Casino User`,
        String(stats.users.casinoUsers),
        "Müsaitlik, rez. talebi, değişiklik, iptal, yorum",
      ],
      [
        `F&B User`,
        String(stats.users.fnbUsers),
        "Sipariş, durum takibi, stok görüntüleme",
      ],
    ] as Parameters<typeof s9.addTable>[0],
    {
      x: 0.5,
      y: 1.4,
      w: 12,
      colW: [2.5, 1.5, 8],
      fontSize: 12,
      color: WHITE,
      border: { type: "solid", color: "252550" },
    },
  );
  s9.addText(
    `Toplam: ${stats.users.total} kullanıcı  |  Personel: ${stats.staff.total} (${stats.staff.active} aktif)  |  Hizmet Noktası: ${stats.servicePoints.total}`,
    {
      x: 0.5,
      y: 5.5,
      w: 12,
      h: 0.4,
      fontSize: 12,
      color: MUTED,
    },
  );

  // Slide 10: Closing
  const sEnd = pptx.addSlide();
  sEnd.background = { color: BG };
  sEnd.addText("Royal Cabana", {
    x: 1,
    y: 2.5,
    w: 11,
    h: 1,
    fontSize: 42,
    bold: true,
    color: GOLD,
    align: "center",
  });
  sEnd.addText("Cabana Yönetim & Rezervasyon Sistemi", {
    x: 1,
    y: 3.6,
    w: 11,
    h: 0.5,
    fontSize: 18,
    color: WHITE,
    align: "center",
  });
  sEnd.addText(`Merit Royal · Alsancak, KKTC — ${date}`, {
    x: 1,
    y: 4.3,
    w: 11,
    h: 0.4,
    fontSize: 13,
    color: MUTED,
    align: "center",
  });

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class ComprehensivePresentationEngine {
  async generateHtml(): Promise<string> {
    try {
      const stats = await cached("presentation:comprehensive", 300, () =>
        fetchSystemStats(),
      );
      return buildComprehensiveHtml(stats);
    } catch (error) {
      throw new DatabaseError("Kapsamlı HTML sunum oluşturulamadı", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async generatePptx(): Promise<Buffer> {
    try {
      const stats = await cached("presentation:comprehensive", 300, () =>
        fetchSystemStats(),
      );
      return generateComprehensivePptx(stats);
    } catch (error) {
      throw new DatabaseError("Kapsamlı PPTX sunum oluşturulamadı", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async generatePdf(): Promise<Buffer> {
    try {
      const { jsPDF } = await import("jspdf");
      const html = await this.generateHtml();

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const stats = await cached("presentation:comprehensive", 300, () =>
        fetchSystemStats(),
      );
      const date = new Date().toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const pageW = 297;
      const pageH = 210;
      const margin = 15;

      const addPageBg = () => {
        doc.setFillColor(10, 10, 20);
        doc.rect(0, 0, pageW, pageH, "F");
      };

      // Page 1: Cover
      addPageBg();
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(36);
      doc.text("Royal Cabana", pageW / 2, 60, { align: "center" });
      doc.setTextColor(232, 232, 244);
      doc.setFontSize(16);
      doc.text("Cabana Yönetim & Rezervasyon Sistemi", pageW / 2, 78, {
        align: "center",
      });
      doc.setTextColor(120, 120, 160);
      doc.setFontSize(12);
      doc.text("Üst Yönetim & Kullanıcı Tanıtım Sunumu", pageW / 2, 92, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.text(`${date} — Merit Royal · Alsancak, KKTC`, pageW / 2, 106, {
        align: "center",
      });
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(11);
      doc.text(
        `${stats.cabanas.total} Cabana  |  ${stats.classes.length} Sinif  |  ${stats.concepts.length} Konsept  |  ${stats.reservations.total} Rezervasyon  |  ${stats.guests.total} Misafir`,
        pageW / 2,
        130,
        { align: "center" },
      );

      // Page 2: System Overview
      doc.addPage();
      addPageBg();
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(22);
      doc.text("Sistem Genel Bakisi", margin, 20);
      doc.setTextColor(120, 120, 160);
      doc.setFontSize(10);
      const overviewItems = [
        "Cabana Yonetimi — Envanter, sinif, konsept ve harita",
        "Rezervasyon — Talep, onay, check-in/out, degisiklik/iptal",
        "Dinamik Fiyatlandirma — Konsept + ekstra + servis ucreti",
        "F&B Siparis — Cabana ici yiyecek-icecek yonetimi",
        "Misafir Veritabani — VIP seviye, ziyaret gecmisi",
        "Raporlama — Doluluk, gelir, performans analizi",
        "Guvenlik — RBAC, JWT, denetim kaydi, oturum takibi",
        "Bildirimler — SSE, push, e-posta bildirimleri",
        "Personel — Atama, gorev, vardiya yonetimi",
        "Responsive & PWA — Tum cihazlarda kullanim",
      ];
      overviewItems.forEach((item, i) => {
        doc.setTextColor(232, 232, 244);
        doc.text(`• ${item}`, margin + 2, 35 + i * 12);
      });

      // Page 3: Cabana
      doc.addPage();
      addPageBg();
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(22);
      doc.text("Cabana Envanteri", margin, 20);
      doc.setTextColor(232, 232, 244);
      doc.setFontSize(12);
      doc.text(
        `Toplam: ${stats.cabanas.total}  |  Musait: ${stats.cabanas.available}  |  Rezerveli: ${stats.cabanas.reserved}  |  Kullanim: ${stats.cabanas.occupied}  |  Kapali: ${stats.cabanas.closed}`,
        margin,
        35,
      );
      doc.setFontSize(10);
      let yPos = 50;
      for (const cls of stats.classes) {
        doc.setTextColor(212, 175, 55);
        doc.text(`${cls.name} (${cls.count} cabana)`, margin + 2, yPos);
        doc.setTextColor(120, 120, 160);
        doc.text(cls.description.slice(0, 100), margin + 2, yPos + 8);
        yPos += 20;
        if (yPos > pageH - 20) break;
      }

      // Page 4: Reservations
      doc.addPage();
      addPageBg();
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(22);
      doc.text("Rezervasyon Sistemi", margin, 20);
      doc.setTextColor(232, 232, 244);
      doc.setFontSize(12);
      doc.text(
        `Toplam: ${stats.reservations.total}  |  Bekleyen: ${stats.reservations.pending}  |  Onayli: ${stats.reservations.approved}  |  Check-in: ${stats.reservations.checkedIn}  |  Check-out: ${stats.reservations.checkedOut}`,
        margin,
        35,
      );
      doc.setFontSize(10);
      doc.setTextColor(212, 175, 55);
      doc.text("Rezervasyon Akisi:", margin, 52);
      doc.setTextColor(232, 232, 244);
      doc.text(
        "Talep → Onay Bekliyor → Onaylandi → Check-in → Aktif Kullanim → Check-out → Tamamlandi",
        margin + 2,
        62,
      );
      doc.setTextColor(120, 120, 160);
      doc.text(
        "Degisiklik, iptal, ekstra konsept talepleri ve bekleme listesi islemleri desteklenir.",
        margin + 2,
        75,
      );

      // Page 5: Roles & Closing
      doc.addPage();
      addPageBg();
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(22);
      doc.text("Kullanici Rolleri", margin, 20);
      doc.setFontSize(10);
      const roles = [
        {
          name: "System Admin",
          count: stats.users.systemAdmins,
          desc: "Tum sistem ayarlari, kullanici yonetimi, raporlar",
        },
        {
          name: "Admin",
          count: stats.users.admins,
          desc: "Onay/red, check-in/out, fiyat, personel",
        },
        {
          name: "Casino User",
          count: stats.users.casinoUsers,
          desc: "Musaitlik, rez. talebi, degisiklik, iptal",
        },
        {
          name: "F&B User",
          count: stats.users.fnbUsers,
          desc: "Siparis, durum takibi, stok",
        },
      ];
      roles.forEach((role, i) => {
        doc.setTextColor(212, 175, 55);
        doc.text(`${role.name} (${role.count} kisi)`, margin + 2, 35 + i * 18);
        doc.setTextColor(120, 120, 160);
        doc.text(role.desc, margin + 2, 43 + i * 18);
      });

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(16);
      doc.text("Royal Cabana — Merit Royal · Alsancak, KKTC", pageW / 2, 160, {
        align: "center",
      });
      doc.setTextColor(120, 120, 160);
      doc.setFontSize(10);
      doc.text(date, pageW / 2, 172, { align: "center" });

      void html;
      return Buffer.from(doc.output("arraybuffer"));
    } catch (error) {
      throw new DatabaseError("Kapsamlı PDF sunum oluşturulamadı", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const comprehensivePresentationEngine =
  new ComprehensivePresentationEngine();
