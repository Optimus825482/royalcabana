"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface GuideSection {
  title: string;
  roles: string[];
  content: string;
  pages: { name: string; path: string; description: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Panel & Harita",
    roles: ["SYSTEM_ADMIN", "ADMIN", "CASINO_USER", "FNB_USER"],
    content:
      "Ana panel, sistemin genel durumunu gösterir. Harita sayfasında tüm Cabanaların konumlarını görebilir, yeni Cabana ekleyebilir ve mevcut Cabanaları düzenleyebilirsiniz.",
    pages: [
      {
        name: "Panel",
        path: "/system-admin",
        description: "Genel istatistikler, günlük özet ve hızlı erişim",
      },
      {
        name: "Harita",
        path: "/system-admin/map",
        description: "Cabana konumlarını görüntüleme ve düzenleme",
      },
    ],
  },
  {
    title: "Cabana Yönetimi",
    roles: ["SYSTEM_ADMIN", "ADMIN"],
    content:
      "Cabana listesinde tüm Cabanaları görebilir, yeni Cabana tanımlayabilir, konsept atayabilir ve personel görevlendirebilirsiniz. Her kabanın detayında rezervasyon bilgileri ve görevli personeller görüntülenir.",
    pages: [
      {
        name: "Cabana Listesi",
        path: "/system-admin/cabanas",
        description: "Tüm Cabanaları listele, detay görüntüle, konsept ata",
      },
      {
        name: "Cabana Sınıfları",
        path: "/system-admin/classes",
        description: "VIP, Standart gibi Cabana sınıflarını tanımla",
      },
      {
        name: "Konseptler",
        path: "/system-admin/concepts",
        description: "Konsept paketlerini ve ürün içeriklerini yönet",
      },
    ],
  },
  {
    title: "Operasyon",
    roles: ["SYSTEM_ADMIN", "ADMIN"],
    content:
      "Takvim üzerinden rezervasyonları görüntüleyebilir, yeni rezervasyon oluşturabilir ve kapalı tarihleri yönetebilirsiniz.",
    pages: [
      {
        name: "Takvim",
        path: "/system-admin/calendar",
        description: "Rezervasyon takvimi ve zaman çizelgesi",
      },
      {
        name: "Rezervasyonlar",
        path: "/system-admin/reservations",
        description: "Tüm rezervasyonları listele ve yönet",
      },
      {
        name: "Kapalı Tarihler",
        path: "/system-admin/blackout-dates",
        description: "Genel veya Cabana bazlı kapalı tarihler",
      },
    ],
  },
  {
    title: "Fiyatlandırma",
    roles: ["SYSTEM_ADMIN"],
    content:
      "Cabana günlük fiyatları, konsept fiyatları, ürün fiyatları ve ekstra hizmet fiyatlarını ayrı ayrı yönetebilirsiniz. Fiyat arşivinde tüm değişiklik geçmişini görebilirsiniz.",
    pages: [
      {
        name: "Cabana Fiyatlandırma",
        path: "/system-admin/pricing",
        description: "Günlük Cabana fiyatları ve sezonluk fiyat aralıkları",
      },
      {
        name: "Konsept Fiyatlandırma",
        path: "/system-admin/pricing/concepts",
        description: "Konsept bazlı ürün fiyatları",
      },
      {
        name: "Ürün Fiyatlandırma",
        path: "/system-admin/products/pricing",
        description: "Ürün alış ve satış fiyatları",
      },
      {
        name: "Hizmet Fiyatlandırma",
        path: "/system-admin/pricing/services",
        description: "Ekstra hizmet fiyatları",
      },
      {
        name: "Fiyat Arşivi",
        path: "/system-admin/pricing/history",
        description: "Tüm fiyat değişiklik geçmişi",
      },
    ],
  },
  {
    title: "Tanımlar",
    roles: ["SYSTEM_ADMIN"],
    content:
      "Sistemdeki tüm temel tanımları bu bölümden yönetebilirsiniz: konseptler, ürünler, ekstra hizmetler, personel, görevler, kullanıcılar ve roller.",
    pages: [
      {
        name: "Ürün Grubu & Ürünler",
        path: "/system-admin/products",
        description: "Ürün grupları ve ürün tanımları",
      },
      {
        name: "Ekstra Hizmetler",
        path: "/system-admin/extra-services",
        description: "Masaj, havlu, transfer gibi hizmetler",
      },
      {
        name: "Personel & Görevler",
        path: "/system-admin/staff",
        description: "Personel listesi ve görev atamaları",
      },
      {
        name: "Kullanıcı İşlemleri",
        path: "/system-admin/users",
        description: "Sistem kullanıcıları ve rol yönetimi",
      },
      {
        name: "Hizmet Noktaları",
        path: "/system-admin/service-points",
        description: "Bar, restoran gibi hizmet noktaları",
      },
    ],
  },
  {
    title: "Sistem Ayarları",
    roles: ["SYSTEM_ADMIN"],
    content:
      "Sistem genelinde rezervasyon açma/kapama, para birimi seçimi, modül yönetimi ve denetim kayıtlarını bu bölümden yönetebilirsiniz.",
    pages: [
      {
        name: "Sistem Kontrolü",
        path: "/system-admin/system-control",
        description: "Rezervasyon durumu, para birimi, modül yönetimi",
      },
      {
        name: "Audit Trail",
        path: "/system-admin/audit-trail",
        description: "Tüm sistem işlemlerinin denetim kaydı",
      },
      {
        name: "API Docs",
        path: "/system-admin/api-docs",
        description: "API dokümantasyonu",
      },
    ],
  },
];

export default function GuidePage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "SYSTEM_ADMIN";
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const visibleSections = GUIDE_SECTIONS.filter((s) =>
    s.roles.includes(userRole),
  );

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-yellow-400">
          Sistem Kullanım Rehberi
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Rolünüze göre erişebileceğiniz tüm modüller ve işlevler
        </p>
      </div>

      <div className="space-y-3">
        {visibleSections.map((section, idx) => (
          <div
            key={idx}
            className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-800/30 transition-colors"
            >
              <span className="font-medium text-neutral-100">
                {section.title}
              </span>
              <span className="text-neutral-500 text-sm">
                {expandedIdx === idx ? "▲" : "▼"}
              </span>
            </button>
            {expandedIdx === idx && (
              <div className="border-t border-neutral-800 px-5 py-4 space-y-4">
                <p className="text-sm text-neutral-300">{section.content}</p>
                <div className="space-y-2">
                  {section.pages.map((page) => (
                    <a
                      key={page.path}
                      href={page.path}
                      className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-4 py-3 hover:bg-neutral-800 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-amber-400 group-hover:text-amber-300">
                          {page.name}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {page.description}
                        </p>
                      </div>
                      <span className="text-neutral-600 group-hover:text-neutral-400">
                        →
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
