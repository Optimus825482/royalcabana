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
  editBtnCls,
  ghostBtnCls,
  infoBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";
import {
  fetchSystemCurrency,
  formatPrice,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

interface CabanaPricingProduct {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CabanaPricingRow {
  id: string;
  name: string;
  calculatedDaily: number;
  breakdown: {
    conceptProductsTotal: number;
    serviceFee: number;
    products: CabanaPricingProduct[];
  };
}

interface StaffAssignment {
  id: string;
  staff: { id: string; name: string; position: string };
  date: string;
  shift: string | null;
}

interface Reservation {
  id: string;
  guestName: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface CabanaItem {
  id: string;
  name: string;
  status: string;
  isOpenForReservation: boolean;
  coordX: number;
  coordY: number;
  cabanaClass: { id: string; name: string };
  concept: { id: string; name: string } | null;
  staffAssignments: StaffAssignment[];
  reservations: Reservation[];
}

interface CabanaClass {
  id: string;
  name: string;
}

interface Concept {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Müsait",
  RESERVED: "Rezerve",
  CLOSED: "Kapalı",
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-900/50 text-green-400 border-green-800/40",
  RESERVED: "bg-amber-900/50 text-amber-400 border-amber-800/40",
  CLOSED: "bg-red-900/50 text-red-400 border-red-800/40",
};

export default function CabanasPage() {
  const queryClient = useQueryClient();
  const [detailCabana, setDetailCabana] = useState<CabanaItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    classId: "",
    conceptId: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  // Assign concept modal
  const [assignCabana, setAssignCabana] = useState<CabanaItem | null>(null);
  const [assignConceptId, setAssignConceptId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const { data: pricingData = [] } = useQuery<CabanaPricingRow[]>({
    queryKey: ["cabana-daily-prices"],
    queryFn: async () => {
      const res = await fetch("/api/pricing/cabana-daily-prices");
      if (!res.ok) return [];
      const d = await res.json();
      const resolved = d.data ?? d;
      return Array.isArray(resolved) ? resolved : [];
    },
  });

  const { data: systemCurrency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const {
    data: cabanas = [],
    isLoading,
    isError,
    error: queryError,
  } = useQuery<CabanaItem[]>({
    queryKey: ["cabanas-management"],
    queryFn: async () => {
      const res = await fetch("/api/cabanas?include=staff,reservations");
      if (!res.ok) throw new Error("Cabanalar yüklenemedi");
      const d = await res.json();
      const resolved = d.data ?? d;
      return Array.isArray(resolved) ? resolved : (resolved.cabanas ?? []);
    },
  });

  const { data: classes = [] } = useQuery<CabanaClass[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await fetch("/api/classes");
      if (!res.ok) return [];
      const json = await res.json();
      const resolved = json.data ?? json;
      return Array.isArray(resolved) ? resolved : [];
    },
  });

  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["concepts"],
    queryFn: async () => {
      const res = await fetch("/api/concepts");
      if (!res.ok) return [];
      const d = await res.json();
      const resolved = d.data ?? d;
      return Array.isArray(resolved) ? resolved : [];
    },
  });

  function showSuccessMsg(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  const filtered = cabanas.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cabanaClass?.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const res = await fetch("/api/cabanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          classId: createForm.classId,
          conceptId: createForm.conceptId || null,
          coordX: 500,
          coordY: 500,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Cabana oluşturulamadı");
      }
      setShowCreate(false);
      setCreateForm({ name: "", classId: "", conceptId: "" });
      showSuccessMsg(
        "Cabana başarıyla oluşturuldu. Haritadan yerleşimini doğrulayın.",
      );
      queryClient.invalidateQueries({ queryKey: ["cabanas-management"] });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAssignConcept() {
    if (!assignCabana) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/cabanas/${assignCabana.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: assignConceptId || null }),
      });
      if (!res.ok) throw new Error("Konsept atanamadı");
      setAssignCabana(null);
      showSuccessMsg("Konsept başarıyla atandı");
      queryClient.invalidateQueries({ queryKey: ["cabanas-management"] });
    } catch {
      // silent
    } finally {
      setAssignLoading(false);
    }
  }

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Cabana Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Cabanalar, konsept atamaları, personel ve rezervasyon bilgileri
          </p>
        </div>
        <div className="flex gap-2">
          <PermissionGate permission="cabana.class.create">
            <button
              onClick={() => {
                setShowCreate(true);
                setCreateError("");
              }}
              className={primaryBtnCls}
            >
              + Yeni Cabana
            </button>
          </PermissionGate>
        </div>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cabana veya sınıf ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls + " max-w-sm"}
        />
      </div>

      {/* Cabana List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">
            {(queryError as Error)?.message ??
              "Veriler yüklenirken bir hata oluştu."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Cabana bulunamadı.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cabana) => (
            <div
              key={cabana.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 sm:px-5 py-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-100 truncate">
                      {cabana.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {cabana.cabanaClass?.name}
                      {cabana.concept && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="text-yellow-400">
                            {cabana.concept.name}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[cabana.status] || "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                    >
                      {STATUS_LABELS[cabana.status] || cabana.status}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {cabana.staffAssignments?.length || 0} personel
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {cabana.reservations?.length || 0} rez.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDetailCabana(cabana)}
                    className={
                      infoBtnCls + " !text-xs !px-3 !py-2 !min-h-[36px]"
                    }
                  >
                    Detay
                  </button>
                  <PermissionGate permission="concept.update">
                    <button
                      onClick={() => {
                        setAssignCabana(cabana);
                        setAssignConceptId(cabana.concept?.id || "");
                      }}
                      className={editBtnCls}
                    >
                      İşlemler
                    </button>
                  </PermissionGate>
                  <a
                    href={`/system-admin/map?placeCabana=${cabana.id}`}
                    className={ghostBtnCls + " inline-flex items-center gap-1"}
                  >
                    Yerleşim
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailCabana && (
        <Modal
          title={`${detailCabana.name} - Detay`}
          onClose={() => setDetailCabana(null)}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-500">Sınıf:</span>{" "}
                <span className="text-neutral-200">
                  {detailCabana.cabanaClass?.name}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Konsept:</span>{" "}
                <span className="text-yellow-400">
                  {detailCabana.concept?.name || "—"}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Durum:</span>{" "}
                <span className="text-neutral-200">
                  {STATUS_LABELS[detailCabana.status]}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Konum:</span>{" "}
                <span className="text-neutral-200">
                  {detailCabana.coordX.toFixed(0)},{" "}
                  {detailCabana.coordY.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-2">
                Fiyat Bilgisi
              </p>
              {(() => {
                const pricing = pricingData.find(
                  (p) => p.id === detailCabana.id,
                );
                if (!pricing) {
                  return (
                    <p className="text-xs text-neutral-600">
                      Konsept atanmamış veya fiyat hesaplanamadı.
                    </p>
                  );
                }
                return (
                  <div className="space-y-1">
                    {pricing.breakdown.products.map((prod) => (
                      <div
                        key={prod.productId}
                        className="flex items-center justify-between bg-neutral-800/60 rounded px-3 py-2 text-xs"
                      >
                        <span className="text-neutral-200 truncate mr-2">
                          {prod.productName}
                        </span>
                        <span className="text-neutral-400 whitespace-nowrap">
                          {prod.quantity} ×{" "}
                          {formatPrice(prod.unitPrice, systemCurrency)} ={" "}
                          <span className="text-emerald-400">
                            {formatPrice(prod.total, systemCurrency)}
                          </span>
                        </span>
                      </div>
                    ))}
                    {pricing.breakdown.serviceFee > 0 && (
                      <div className="flex items-center justify-between bg-neutral-800/60 rounded px-3 py-2 text-xs">
                        <span className="text-neutral-200">Hizmet Bedeli</span>
                        <span className="text-emerald-400">
                          {formatPrice(
                            pricing.breakdown.serviceFee,
                            systemCurrency,
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-neutral-800/80 rounded px-3 py-2 text-xs font-medium border border-neutral-700/50 mt-1">
                      <span className="text-neutral-300">Günlük Toplam</span>
                      <span className="text-amber-400">
                        {formatPrice(pricing.calculatedDaily, systemCurrency)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Staff */}
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-2">
                Görevli Personeller
              </p>
              {(detailCabana.staffAssignments?.length || 0) === 0 ? (
                <p className="text-xs text-neutral-600">
                  Atanmış personel yok.
                </p>
              ) : (
                <div className="space-y-1">
                  {detailCabana.staffAssignments.map((sa) => (
                    <div
                      key={sa.id}
                      className="flex items-center justify-between bg-neutral-800/60 rounded px-3 py-2 text-xs"
                    >
                      <span className="text-neutral-200">{sa.staff.name}</span>
                      <span className="text-neutral-500">
                        {sa.staff.position}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reservations */}
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-2">
                Aktif Rezervasyonlar
              </p>
              {(detailCabana.reservations?.length || 0) === 0 ? (
                <p className="text-xs text-neutral-600">
                  Aktif rezervasyon yok.
                </p>
              ) : (
                <div className="space-y-1">
                  {detailCabana.reservations.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between bg-neutral-800/60 rounded px-3 py-2 text-xs"
                    >
                      <span className="text-neutral-200">{r.guestName}</span>
                      <span className="text-neutral-500">
                        {new Date(r.startDate).toLocaleDateString("tr-TR")} -{" "}
                        {new Date(r.endDate).toLocaleDateString("tr-TR")}
                      </span>
                      <span className="text-amber-400">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Cabana Tanımla" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Cabana Adı">
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Örn: Cabana 1"
              />
            </Field>
            <Field label="Sınıf">
              <select
                required
                value={createForm.classId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, classId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Sınıf seçin</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Konsept (Opsiyonel)">
              <select
                value={createForm.conceptId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, conceptId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Konsept yok</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-neutral-500">
              Cabana oluşturulduktan sonra haritadan yerleşimini
              doğrulayabilirsiniz.
            </p>
            {createError && <ErrorMsg msg={createError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className={submitBtnCls}
              >
                {createLoading ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Concept Modal */}
      {assignCabana && (
        <Modal
          title={`${assignCabana.name} - İşlemler`}
          onClose={() => setAssignCabana(null)}
        >
          <div className="space-y-4">
            <Field label="Konsept Ata / Güncelle">
              <select
                value={assignConceptId}
                onChange={(e) => setAssignConceptId(e.target.value)}
                className={selectCls}
              >
                <option value="">Konsept yok</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAssignCabana(null)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                onClick={handleAssignConcept}
                disabled={assignLoading}
                className={submitBtnCls}
              >
                {assignLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
