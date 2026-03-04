"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
  primaryBtnCls,
  dangerSoftBtnCls,
  editBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";
import {
  fetchSystemCurrency,
  formatPrice,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

interface ExtraService {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  prices: { id: string; price: string; effectiveFrom: string }[];
}

const CATEGORIES = [
  { value: "MASSAGE", label: "Masaj" },
  { value: "TOWEL", label: "Havlu" },
  { value: "SUNBED", label: "Şezlong" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "PHOTOGRAPHY", label: "Fotoğraf" },
  { value: "DECORATION", label: "Dekorasyon" },
  { value: "OTHER", label: "Diğer" },
];

const defaultForm = { name: "", description: "", category: "OTHER", price: "" };

export default function ExtraServicesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const { data: services = [], isLoading } = useQuery<ExtraService[]>({
    queryKey: ["extra-services"],
    queryFn: async () => {
      const res = await fetch("/api/extra-services");
      if (!res.ok) return [];
      const d = await res.json();
      const resolved = d.data ?? d;
      return Array.isArray(resolved) ? resolved : [];
    },
  });

  function showMsg(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/extra-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          category: form.category,
          price: form.price ? parseFloat(form.price) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Oluşturulamadı");
      }
      setShowCreate(false);
      setForm(defaultForm);
      showMsg("Ekstra hizmet oluşturuldu.");
      qc.invalidateQueries({ queryKey: ["extra-services"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(svc: ExtraService) {
    await fetch(`/api/extra-services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !svc.isActive }),
    });
    qc.invalidateQueries({ queryKey: ["extra-services"] });
  }

  function getCurrentPrice(svc: ExtraService): string | null {
    if (!svc.prices || svc.prices.length === 0) return null;
    const sorted = [...svc.prices].sort(
      (a, b) =>
        new Date(b.effectiveFrom).getTime() -
        new Date(a.effectiveFrom).getTime(),
    );
    return sorted[0].price;
  }

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Ekstra Hizmet Tanımları
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Masaj, havlu, transfer gibi ekstra hizmetleri tanımlayın
          </p>
        </div>
        <PermissionGate permission="system.config.create">
          <button
            onClick={() => {
              setShowCreate(true);
              setError("");
              setForm(defaultForm);
            }}
            className={primaryBtnCls}
          >
            + Yeni Hizmet
          </button>
        </PermissionGate>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : services.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Henüz ekstra hizmet yok.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => {
            const price = getCurrentPrice(svc);
            return (
              <div
                key={svc.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-neutral-100">{svc.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {svc.description || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                    {CATEGORIES.find((c) => c.value === svc.category)?.label ||
                      svc.category ||
                      "—"}
                  </span>
                  {price && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-900/50 text-amber-400 border border-amber-800/40">
                      {formatPrice(parseFloat(price), currency)}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border ${svc.isActive ? "bg-green-900/50 text-green-400 border-green-800/40" : "bg-red-900/50 text-red-400 border-red-800/40"}`}
                  >
                    {svc.isActive ? "Aktif" : "Pasif"}
                  </span>
                  <PermissionGate permission="system.config.update">
                    <button
                      onClick={() => handleToggle(svc)}
                      className={dangerSoftBtnCls}
                    >
                      {svc.isActive ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </PermissionGate>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <Modal title="Yeni Ekstra Hizmet" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Hizmet Adı">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Örn: VIP Masaj"
              />
            </Field>
            <Field label="Açıklama">
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Kategori">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className={selectCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fiyat (Opsiyonel)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            {error && <ErrorMsg msg={error} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button type="submit" disabled={loading} className={submitBtnCls}>
                {loading ? "..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
