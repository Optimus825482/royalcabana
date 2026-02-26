"use client";

import { useState } from "react";
import CabanaMap from "@/components/map/CabanaMap";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { CabanaWithStatus, CabanaStatus } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { inputCls, selectCls } from "@/components/shared/FormComponents";

interface CabanaClass {
  id: string;
  name: string;
}

interface Concept {
  id: string;
  name: string;
}

const defaultAddForm = {
  name: "",
  classId: "",
  conceptId: "",
  coordX: 500,
  coordY: 500,
};

export default function SystemAdminMapPage() {
  const queryClient = useQueryClient();

  const {
    data: mapData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["map-admin-data"],
    queryFn: async () => {
      const [cabanasRes, classesRes, conceptsRes] = await Promise.all([
        fetch("/api/cabanas"),
        fetch("/api/classes"),
        fetch("/api/concepts"),
      ]);
      if (!cabanasRes.ok) throw new Error("Kabanalar yüklenemedi.");
      if (!classesRes.ok) throw new Error("Sınıflar yüklenemedi.");
      if (!conceptsRes.ok) throw new Error("Konseptler yüklenemedi.");
      const [cabanasData, classesData, conceptsData] = await Promise.all([
        cabanasRes.json(),
        classesRes.json(),
        conceptsRes.json(),
      ]);
      return {
        cabanas: (Array.isArray(cabanasData)
          ? cabanasData
          : (cabanasData.cabanas ?? [])) as CabanaWithStatus[],
        classes: (Array.isArray(classesData)
          ? classesData
          : (classesData.classes ?? [])) as CabanaClass[],
        concepts: (Array.isArray(conceptsData)
          ? conceptsData
          : (conceptsData.concepts ?? [])) as Concept[],
      };
    },
  });

  const cabanas = mapData?.cabanas ?? [];
  const classes = mapData?.classes ?? [];
  const concepts = mapData?.concepts ?? [];

  const [error, setError] = useState(queryError ? String(queryError) : "");
  const [success, setSuccess] = useState("");

  const [selectedCabana, setSelectedCabana] = useState<CabanaWithStatus | null>(
    null,
  );

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(defaultAddForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit panel state
  const [editClassId, setEditClassId] = useState("");
  const [editConceptId, setEditConceptId] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function showSuccessMsg(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  function handleCabanaClick(cabana: CabanaWithStatus) {
    setSelectedCabana(cabana);
    setEditClassId(cabana.classId);
    setEditConceptId(cabana.conceptId ?? "");
    setShowDeleteConfirm(false);
  }

  async function handleLocationUpdate(
    cabanaId: string,
    coordX: number,
    coordY: number,
  ) {
    try {
      const res = await fetch(`/api/cabanas/${cabanaId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordX, coordY }),
      });
      if (!res.ok) throw new Error("Konum güncellenemedi.");
      queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
      if (selectedCabana?.id === cabanaId) {
        setSelectedCabana((prev) =>
          prev ? { ...prev, coordX, coordY } : prev,
        );
      }
      showSuccessMsg("Konum güncellendi.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Konum güncellenemedi.");
    }
  }

  // --- Add Cabana ---
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const body: Record<string, unknown> = {
        name: addForm.name,
        classId: addForm.classId,
        coordX: addForm.coordX,
        coordY: addForm.coordY,
      };
      if (addForm.conceptId) body.conceptId = addForm.conceptId;

      const res = await fetch("/api/cabanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Kabana oluşturulamadı.");
      }
      setShowAddModal(false);
      setAddForm(defaultAddForm);
      showSuccessMsg("Kabana başarıyla eklendi.");
      queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setAddLoading(false);
    }
  }

  // --- Update Class / Concept ---
  async function handleUpdateCabana() {
    if (!selectedCabana) return;
    setEditLoading(true);
    try {
      const body: Record<string, unknown> = { classId: editClassId };
      if (editConceptId) body.conceptId = editConceptId;
      else body.conceptId = null;

      const res = await fetch(`/api/cabanas/${selectedCabana.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Kabana güncellenemedi.");
      }
      showSuccessMsg("Kabana güncellendi.");
      await queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
      // Refresh selected cabana
      const updated = cabanas.find((c) => c.id === selectedCabana.id);
      if (updated)
        setSelectedCabana({
          ...updated,
          classId: editClassId,
          conceptId: editConceptId || null,
        });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  // --- Delete Cabana ---
  async function handleDelete() {
    if (!selectedCabana) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/cabanas/${selectedCabana.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Kabana silinemedi.");
      }
      showSuccessMsg("Kabana silindi.");
      setSelectedCabana(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const statusLabel: Record<CabanaStatus, string> = {
    [CabanaStatus.AVAILABLE]: "Müsait",
    [CabanaStatus.RESERVED]: "Rezerve",
    [CabanaStatus.CLOSED]: "Kapalı",
  };

  const statusColor: Record<CabanaStatus, string> = {
    [CabanaStatus.AVAILABLE]: "text-green-400",
    [CabanaStatus.RESERVED]: "text-red-400",
    [CabanaStatus.CLOSED]: "text-neutral-500",
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Kabana Haritası
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kabanaları harita üzerinde yönetin
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setAddForm(defaultAddForm);
            setAddError("");
          }}
          className="bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Yeni Kabana Ekle
        </button>
      </div>

      {/* Toast messages */}
      {(success || error) && (
        <div className="px-6 pt-3 shrink-0">
          {success && (
            <div className="px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
              {success}
            </div>
          )}
          {error && (
            <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Map area */}
        <div className="flex-1 p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <LoadingSpinner message="Kabanalar yükleniyor..." />
            </div>
          ) : (
            <div className="h-full min-h-[300px] md:min-h-[500px]">
              <CabanaMap
                cabanas={cabanas}
                editable={true}
                onCabanaClick={handleCabanaClick}
                onLocationUpdate={handleLocationUpdate}
                selectedCabanaId={selectedCabana?.id}
              />
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-neutral-800 bg-neutral-900 flex flex-col overflow-y-auto max-h-[50vh] md:max-h-none">
          {!selectedCabana ? (
            <div className="flex flex-col items-center justify-center flex-1 text-neutral-500 text-sm px-6 text-center gap-2">
              <svg
                className="w-10 h-10 text-neutral-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <p>Haritadan bir kabana seçin</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Cabana info */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-base font-semibold text-yellow-400">
                    {selectedCabana.name}
                  </h2>
                  <span
                    className={`text-xs font-medium ${statusColor[selectedCabana.status]}`}
                  >
                    {statusLabel[selectedCabana.status]}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Sınıf</span>
                    <span className="text-neutral-200">
                      {selectedCabana.cabanaClass?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Konsept</span>
                    <span className="text-neutral-200">
                      {selectedCabana.concept?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Koordinat X</span>
                    <span className="text-neutral-200">
                      {Math.round(selectedCabana.coordX)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Koordinat Y</span>
                    <span className="text-neutral-200">
                      {Math.round(selectedCabana.coordY)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-800" />

              {/* Edit form */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-neutral-400">Düzenle</p>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Sınıf Değiştir
                  </label>
                  <select
                    value={editClassId}
                    onChange={(e) => setEditClassId(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Sınıf seçin</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Konsept Değiştir
                  </label>
                  <select
                    value={editConceptId}
                    onChange={(e) => setEditConceptId(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Konsept yok</option>
                    {concepts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleUpdateCabana}
                  disabled={editLoading || !editClassId}
                  className="w-full py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors"
                >
                  {editLoading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>

              <div className="border-t border-neutral-800" />

              {/* Delete */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 text-sm font-semibold rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 text-red-400 transition-colors"
                >
                  Kabana Sil
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-400">
                    <span className="text-yellow-400">
                      {selectedCabana.name}
                    </span>{" "}
                    silinecek. Emin misiniz?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
                    >
                      {deleteLoading ? "Siliniyor..." : "Sil"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Cabana Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
              <h2 className="text-sm font-semibold text-yellow-400">
                Yeni Kabana Ekle
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-500 hover:text-neutral-300 text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Kabana Adı
                </label>
                <input
                  type="text"
                  required
                  minLength={1}
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="Örn: Kabana 1"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Sınıf
                </label>
                <select
                  required
                  value={addForm.classId}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, classId: e.target.value }))
                  }
                  className={selectCls}
                >
                  <option value="">Sınıf seçin</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Konsept (opsiyonel)
                </label>
                <select
                  value={addForm.conceptId}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, conceptId: e.target.value }))
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
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    Koordinat X
                  </label>
                  <input
                    type="number"
                    required
                    value={addForm.coordX}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        coordX: Number(e.target.value),
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    Koordinat Y
                  </label>
                  <input
                    type="number"
                    required
                    value={addForm.coordY}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        coordY: Number(e.target.value),
                      }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              {addError && (
                <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                  {addError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors"
                >
                  {addLoading ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// (inputCls, selectCls imported from FormComponents)
