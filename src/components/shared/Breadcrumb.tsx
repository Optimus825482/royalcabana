"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { ROLE_HOME } from "./Navbar";
import { useSession } from "next-auth/react";

const LABEL_MAP: Record<string, string> = {
  "system-admin": "Sistem Yönetimi",
  casino: "Casino",
  admin: "Admin",
  fnb: "F&B",
  reports: "Raporlar",
  profile: "Profil",
  weather: "Hava Durumu",
  users: "Kullanıcılar",
  guests: "Misafirler",
  staff: "Personel",
  classes: "Cabana Sınıfları",
  concepts: "Konseptler",
  products: "Ürünler",
  pricing: "Fiyat İşlemleri",
  seasons: "Sezonluk Fiyatlar",
  map: "Harita",
  settings: "Ayarlar",
  "system-control": "Sistem Kontrolü",
  "blackout-dates": "Kapalı Tarihler",
  "qr-codes": "QR Kodlar",
  "audit-trail": "Audit Log",
  "api-docs": "API Docs",
  "task-definitions": "Görev Tanımları",
  "cancellation-policy": "İptal Politikası",
  reservations: "Rezervasyonlar",
  calendar: "Takvim",
  view: "3D Görünüm",
  waitlist: "Bekleme Listesi",
  recurring: "Tekrarlayan",
  reviews: "Değerlendirmeler",
  requests: "Talepler",
  stock: "Stok",
};

function getLabel(segment: string): string {
  return (
    LABEL_MAP[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const homeHref = role ? (ROLE_HOME[role] ?? "/") : "/";

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  // Build crumbs
  const crumbs: { label: string; href: string }[] = [];
  let accumulated = "";
  for (const seg of segments) {
    accumulated += `/${seg}`;
    crumbs.push({ label: getLabel(seg), href: accumulated });
  }

  // Don't show breadcrumb if we're at root panel
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-neutral-500 px-4 sm:px-6 py-2 bg-neutral-950 border-b border-neutral-800/50 overflow-x-auto"
    >
      <Link
        href={homeHref}
        className="hover:text-amber-400 transition-colors shrink-0"
        aria-label="Ana Sayfa"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5 shrink-0">
            <ChevronRight className="w-3 h-3 text-neutral-700" />
            {isLast ? (
              <span className="text-neutral-300 font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-amber-400 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
