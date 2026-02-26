"use client";

import Link from "next/link";

const MENU_ITEMS = [
  {
    href: "/system-admin/users",
    label: "Kullanıcı Yönetimi",
    description: "Kullanıcıları görüntüle, ekle ve düzenle",
    icon: "👥",
  },
  {
    href: "/system-admin/map",
    label: "Kabana Haritası",
    description: "Kabanaları harita üzerinde yönet",
    icon: "🗺️",
  },
  {
    href: "/system-admin/classes",
    label: "Kabana Sınıfları",
    description: "Sınıf tanımlarını yönet",
    icon: "🏷️",
  },
  {
    href: "/system-admin/concepts",
    label: "Konseptler",
    description: "Konsept ve ürün paketlerini yönet",
    icon: "📦",
  },
  {
    href: "/system-admin/products",
    label: "Ürünler",
    description: "Ürün kataloğunu yönet",
    icon: "🛍️",
  },
  {
    href: "/system-admin/system-control",
    label: "Sistem Kontrolü",
    description: "Sistem ayarlarını ve konfigürasyonu yönet",
    icon: "⚙️",
  },
];

export default function SystemAdminDashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-yellow-400">
            Sistem Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Yönetmek istediğiniz modülü seçin
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col gap-2 p-5 min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl hover:border-yellow-700/50 hover:bg-neutral-800/60 transition-all active:scale-[0.98] group"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="font-medium text-neutral-100 group-hover:text-yellow-400 transition-colors">
                {item.label}
              </span>
              <span className="text-xs text-neutral-500">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
