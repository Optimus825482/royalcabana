"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QrCode, Copy, Check, Printer, Search } from "lucide-react";
import { Modal } from "@/components/shared/FormComponents";

interface Cabana {
  id: string;
  name: string;
  cabanaClass?: { id: string; name: string };
}

interface QrData {
  url: string;
  cabanaId: string;
  cabanaName: string;
}

export default function QrCodesPage() {
  const [selectedCabana, setSelectedCabana] = useState<Cabana | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  const { data: cabanas = [], isLoading } = useQuery<Cabana[]>({
    queryKey: ["cabanas"],
    queryFn: async () => {
      const res = await fetch("/api/cabanas");
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  const { data: qrData, isLoading: qrLoading } = useQuery<QrData>({
    queryKey: ["qr", selectedCabana?.id],
    queryFn: async () => {
      const res = await fetch(`/api/cabanas/${selectedCabana!.id}/qr`);
      if (!res.ok) throw new Error("QR fetch failed");
      return res.json();
    },
    enabled: !!selectedCabana,
  });

  const filtered = cabanas.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!qrData) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR - ${qrData.cabanaName}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        p { font-size: 14px; color: #666; margin-bottom: 24px; }
        .url { font-size: 16px; word-break: break-all; padding: 16px; border: 2px dashed #ccc; border-radius: 8px; }
        .note { margin-top: 24px; font-size: 12px; color: #999; }
      </style></head><body>
        <h1>${qrData.cabanaName}</h1>
        <p>Kabana QR Kodu URL</p>
        <div class="url">${qrData.url}</div>
        <p class="note">Bu URL'yi herhangi bir QR kod oluşturucuya yapıştırarak QR kod oluşturabilirsiniz.</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <QrCode className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-semibold text-amber-400">
              QR Kodları
            </h1>
          </div>
          <p className="text-sm text-neutral-400">
            Kabana QR kodlarını oluşturun ve yazdırın
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Kabana ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 focus:border-amber-600 text-neutral-100 rounded-lg pl-10 pr-4 py-3 text-sm outline-none transition-colors placeholder:text-neutral-600"
          />
        </div>

        {/* Cabana List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((cabana) => (
              <div
                key={cabana.id}
                className="flex items-center justify-between p-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-100">
                    {cabana.name}
                  </p>
                  {cabana.cabanaClass && (
                    <p className="text-xs text-neutral-500">
                      {cabana.cabanaClass.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCabana(cabana)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 transition-colors shrink-0"
                >
                  QR Oluştur
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">
                Kabana bulunamadı.
              </p>
            )}
          </div>
        )}

        {/* QR Modal */}
        {selectedCabana && (
          <Modal
            title={`QR — ${selectedCabana.name}`}
            onClose={() => setSelectedCabana(null)}
          >
            {qrLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrData ? (
              <div className="space-y-4">
                {/* URL Display */}
                <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700">
                  <p className="text-xs text-neutral-400 mb-2">Kabana URL</p>
                  <p className="text-sm text-neutral-100 break-all font-mono">
                    {qrData.url}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(qrData.url)}
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> URL Kopyala
                      </>
                    )}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="min-h-[44px] px-4 py-2 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-neutral-500 text-center">
                  Bu URL&apos;yi herhangi bir QR kod oluşturucuya yapıştırarak
                  QR kod oluşturabilirsiniz.
                </p>
              </div>
            ) : null}
          </Modal>
        )}
      </div>
    </div>
  );
}
