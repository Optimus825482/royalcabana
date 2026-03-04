"use client";

import { useState, useMemo } from "react";
import { inputCls } from "@/components/shared/FormComponents";

interface HelpItem {
  question: string;
  answer: string;
  tags: string[];
  category: string;
}

const HELP_ITEMS: HelpItem[] = [
  {
    category: "Cabana",
    question: "Yeni Cabana nasıl eklenir?",
    answer:
      "Cabana Yönetimi > Cabana Listesi sayfasından '+ Yeni Cabana' butonuna tıklayın. Cabana adı, sınıf ve opsiyonel olarak konsept seçin. Oluşturduktan sonra Harita sayfasından yerleşimini doğrulayın.",
    tags: ["Cabana", "ekleme", "yeni", "tanımlama"],
  },
  {
    category: "Cabana",
    question: "Cabana konumu nasıl değiştirilir?",
    answer:
      "Harita sayfasına gidin. Cabanayı sürükleyerek yeni konumuna taşıyın ve 'Kaydet' butonuna tıklayın.",
    tags: ["Cabana", "konum", "harita", "yerleşim", "taşıma"],
  },
  {
    category: "Cabana",
    question: "Cabanaya konsept nasıl atanır?",
    answer:
      "Cabana Yönetimi > Cabana Listesi'nde ilgili Cabanada 'İşlemler' butonuna tıklayın. Açılan pencereden konsept seçip kaydedin.",
    tags: ["Cabana", "konsept", "atama"],
  },
  {
    category: "Rezervasyon",
    question: "Rezervasyon nasıl oluşturulur?",
    answer:
      "Operasyon > Takvim sayfasından istediğiniz tarih aralığını seçin veya Rezervasyonlar sayfasından '+ Yeni Rezervasyon' butonunu kullanın.",
    tags: ["rezervasyon", "oluşturma", "yeni", "takvim"],
  },
  {
    category: "Rezervasyon",
    question: "Rezervasyon nasıl iptal edilir?",
    answer:
      "Rezervasyonlar sayfasından ilgili rezervasyonu bulun, detayına girin ve 'İptal Talebi' oluşturun. Admin onayı sonrası iptal gerçekleşir.",
    tags: ["rezervasyon", "iptal", "talep"],
  },
  {
    category: "Fiyatlandırma",
    question: "Cabana fiyatı nasıl belirlenir?",
    answer:
      "Fiyatlandırma > Cabana Fiyatlandırma sayfasından Cabana ve ay seçerek günlük fiyatları girebilirsiniz. Sezonluk fiyat aralıkları da tanımlayabilirsiniz.",
    tags: ["fiyat", "Cabana", "günlük", "sezon"],
  },
  {
    category: "Fiyatlandırma",
    question: "Fiyat geçmişi nasıl görüntülenir?",
    answer:
      "Fiyatlandırma > Fiyat Arşivi sayfasından Cabana, konsept, ürün ve hizmet fiyat değişikliklerinin tüm geçmişini görebilirsiniz.",
    tags: ["fiyat", "arşiv", "geçmiş", "tarihçe"],
  },
  {
    category: "Personel",
    question: "Personel Cabanaya nasıl atanır?",
    answer:
      "Tanımlar > Personel & Görevler sayfasından personeli seçin ve Cabana ataması yapın. Tarih ve vardiya bilgisi girin.",
    tags: ["personel", "atama", "Cabana", "görev"],
  },
  {
    category: "Sistem",
    question: "Sistem rezervasyona nasıl kapatılır?",
    answer:
      "Sistem Ayarları > Rezervasyonlar Açık/Kapalı sayfasından sistem geneli veya Cabana bazlı rezervasyon durumunu değiştirebilirsiniz.",
    tags: ["sistem", "kapatma", "rezervasyon", "kontrol"],
  },
  {
    category: "Sistem",
    question: "Para birimi nasıl değiştirilir?",
    answer:
      "Sistem Ayarları > Sistem Kontrolü sayfasından Para Birimi bölümünde TRY, EUR veya USD seçebilirsiniz.",
    tags: ["para", "birimi", "döviz", "currency"],
  },
  {
    category: "Hizmet",
    question: "Ekstra hizmet nasıl tanımlanır?",
    answer:
      "Tanımlar > Ekstra Hizmetler sayfasından '+ Yeni Hizmet' butonuyla masaj, havlu, transfer gibi hizmetleri tanımlayabilirsiniz.",
    tags: ["hizmet", "ekstra", "tanımlama", "masaj"],
  },
  {
    category: "Hizmet",
    question: "Hizmet noktası nasıl eklenir?",
    answer:
      "Hizmet Noktaları sayfasından '+ Yeni Hizmet Noktası' butonuyla bar, restoran gibi noktaları ekleyebilirsiniz.",
    tags: ["hizmet", "nokta", "bar", "restoran"],
  },
  {
    category: "Rapor",
    question: "Rapor nasıl oluşturulur?",
    answer:
      "Raporlar sayfasından rapor tipini seçin (Doluluk, Gelir, Maliyet), tarih aralığını belirleyin ve 'Oluştur' butonuna tıklayın.",
    tags: ["rapor", "oluşturma", "doluluk", "gelir"],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const categories = useMemo(
    () => [...new Set(HELP_ITEMS.map((h) => h.category))],
    [],
  );

  const filtered = useMemo(() => {
    let items = HELP_ITEMS;
    if (selectedCategory)
      items = items.filter((h) => h.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (h) =>
          h.question.toLowerCase().includes(q) ||
          h.answer.toLowerCase().includes(q) ||
          h.tags.some((t) => t.includes(q)),
      );
    }
    return items;
  }, [search, selectedCategory]);

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-yellow-400">Yardım</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Aradığınız konuyu yazın veya kategorilere göz atın
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Ne arıyorsunuz? Örn: Cabana ekleme, fiyat, rezervasyon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls + " max-w-lg"}
          autoFocus
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${!selectedCategory ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"}`}
        >
          Tümü
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setSelectedCategory(selectedCategory === cat ? null : cat)
            }
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedCategory === cat ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Aramanızla eşleşen sonuç bulunamadı.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">
                    {item.category}
                  </span>
                  <span className="text-sm text-neutral-100">
                    {item.question}
                  </span>
                </div>
                <span className="text-neutral-500 text-sm shrink-0 ml-2">
                  {expandedIdx === idx ? "▲" : "▼"}
                </span>
              </button>
              {expandedIdx === idx && (
                <div className="border-t border-neutral-800 px-5 py-4">
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
