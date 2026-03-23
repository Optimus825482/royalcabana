"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CabanaMap from "@/components/map/CabanaMap";
import TransformControls from "@/components/map/TransformControls";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { CabanaWithStatus, CabanaStatus } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inputCls,
  selectCls,
  primaryBtnCls,
  dangerBtnCls,
  dangerSoftBtnCls,
  cancelBtnCls,
} from "@/components/shared/FormComponents";

type PlacementTool = "cabana" | "umbrella" | "sunbed" | "servicepoint" | null;

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
  const searchParams = useSearchParams();
  const placeCabanaId = searchParams.get("placeCabana");
  const [mapLocked, setMapLocked] = useState(false);
  const [placementTool, setPlacementTool] = useState<PlacementTool>(null);
  const [draftSaving, setDraftSaving] = useState(false);

  const {
    data: mapData,
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["map-admin-data"],
    queryFn: async () => {
      const [cabanasRes, classesRes, conceptsRes] = await Promise.all([
        fetch("/api/cabanas"),
        fetch("/api/classes"),
        fetch("/api/concepts"),
      ]);
      if (!cabanasRes.ok) throw new Error("Cabanalar yüklenemedi.");
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
          : (cabanasData.data ?? [])) as CabanaWithStatus[],
        classes: (Array.isArray(classesData)
          ? classesData
          : (classesData.data ?? [])) as CabanaClass[],
        concepts: (Array.isArray(conceptsData)
          ? conceptsData
          : (conceptsData.data ?? [])) as Concept[],
      };
    },
  });

  const cabanas = mapData?.cabanas ?? [];
  const classes = mapData?.classes ?? [];
  const concepts = mapData?.concepts ?? [];

  // Placement mode: filter to only the target cabana and auto-select it
  const displayCabanas = placeCabanaId
    ? cabanas.filter((c) => c.id === placeCabanaId)
    : cabanas;

  // Auto-select the placement cabana when data loads
  useEffect(() => {
    if (placeCabanaId && cabanas.length > 0 && !selectedCabana) {
      const target = cabanas.find((c) => c.id === placeCabanaId);
      if (target) {
        setSelectedCabana(target);
        setEditClassId(target.classId);
        setEditConceptId(target.conceptId ?? "");
      }
    }
  }, [placeCabanaId, cabanas]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [placementCoords, setPlacementCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Edit panel state
  const [editClassId, setEditClassId] = useState("");
  const [editConceptId, setEditConceptId] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load saved elevation on mount — use query result directly
  const { data: savedElevationData = null } = useQuery({
    queryKey: ["map-elevation-data"],
    queryFn: async () => {
      const res = await fetch("/api/map/elevation");
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data as string | null) ?? null;
    },
    staleTime: Infinity,
  });

  async function handleResetElevation() {
    if (!confirm("Tüm yükseltme verileri sıfırlanacak. Emin misiniz?")) return;
    try {
      const res = await fetch("/api/map/elevation", { method: "DELETE" });
      if (!res.ok) throw new Error("Yükseltme sıfırlanamadı.");
      queryClient.invalidateQueries({ queryKey: ["map-elevation-data"] });
      showSuccessMsg("Yükseltme verileri sıfırlandı. Sayfayı yenileyin.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Yükseltme sıfırlanamadı.");
    }
  }

  function showSuccessMsg(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  function handleCabanaClick(cabana: CabanaWithStatus) {
    setSelectedCabana(cabana);
    setEditClassId(cabana.classId);
    setEditConceptId(cabana.conceptId ?? "");
    setShowDeleteConfirm(false);
    setPlacementCoords(null);
  }

  function handleMapClick(lat: number, lng: number) {
    if (!mapLocked) return; // Harita sabit değilse ekleme yapılamaz
    if (!placementTool) return; // Araç seçili değilse ekleme yapılamaz

    if (placementTool === "cabana") {
      setPlacementCoords({ lat, lng });
      setSelectedCabana(null);
      setAddForm((f) => ({ ...f, coordX: lng, coordY: lat }));
      setShowAddModal(true);
      setAddError("");
    } else {
      // TODO: Şemsiye, Şezlong, Hizmet Noktası ekleme — ilgili API'ler hazır olunca
      console.log(`[Placement] ${placementTool} at`, { lat, lng });
      showSuccessMsg(
        `${placementTool === "umbrella" ? "Şemsiye" : placementTool === "sunbed" ? "Şezlong" : "Hizmet Noktası"} konumu seçildi (${Math.round(lng)}, ${Math.round(lat)})`,
      );
    }
  }

  function toggleMapLock() {
    setMapLocked((prev) => {
      if (prev) {
        // Kilidi açarken araç seçimini sıfırla
        setPlacementTool(null);
      }
      return !prev;
    });
  }

  async function handleDraftSave() {
    setDraftSaving(true);
    try {
      // Batch save — parallel PATCH for all cabana locations
      const updates = cabanas.map((c) =>
        fetch(`/api/cabanas/${c.id}/location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coordX: c.coordX,
            coordY: c.coordY,
            rotation: c.rotation ?? 0,
            scaleX: c.scaleX ?? 1,
            scaleY: c.scaleY ?? 1,
          }),
        }),
      );
      const results = await Promise.all(updates);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setError(`${failed.length} cabana kaydedilemedi.`);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
        showSuccessMsg("Tüm konumlar kaydedildi.");
      }
    } catch {
      setError("Taslak kaydedilemedi.");
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleLocationUpdate(
    cabanaId: string,
    coordX: number,
    coordY: number,
    rotation?: number,
    scaleX?: number,
    scaleY?: number,
    color?: string,
    isLocked?: boolean,
  ) {
    try {
      const body: Record<string, number | string | boolean> = {
        coordX,
        coordY,
      };
      if (rotation !== undefined) body.rotation = rotation;
      if (scaleX !== undefined) body.scaleX = scaleX;
      if (scaleY !== undefined) body.scaleY = scaleY;
      if (color !== undefined) body.color = color;
      if (isLocked !== undefined) body.isLocked = isLocked;
      const res = await fetch(`/api/cabanas/${cabanaId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Konum güncellenemedi.");
      queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
      if (selectedCabana?.id === cabanaId) {
        setSelectedCabana((prev) =>
          prev
            ? {
                ...prev,
                coordX,
                coordY,
                ...(rotation !== undefined ? { rotation } : {}),
                ...(scaleX !== undefined ? { scaleX } : {}),
                ...(scaleY !== undefined ? { scaleY } : {}),
                ...(color !== undefined ? { color } : {}),
                ...(isLocked !== undefined ? { isLocked } : {}),
              }
            : prev,
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
        throw new Error(data.message || "Cabana oluşturulamadı.");
      }
      setShowAddModal(false);
      setAddForm(defaultAddForm);
      setPlacementCoords(null);
      showSuccessMsg("Cabana başarıyla eklendi.");
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
        throw new Error(data.message || "Cabana güncellenemedi.");
      }
      showSuccessMsg("Cabana güncellendi.");
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
        throw new Error(data.message || "Cabana silinemedi.");
      }
      showSuccessMsg("Cabana silindi.");
      setSelectedCabana(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- Save Elevation Data ---
  async function handleElevationSave(dataUrl: string) {
    try {
      const res = await fetch("/api/map/elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elevationData: dataUrl }),
      });
      if (!res.ok) throw new Error("Yükseklik verisi kaydedilemedi.");
      // Optimistic update — query cache'i güncelle, state yok
      queryClient.setQueryData(["map-elevation-data"], dataUrl);
      showSuccessMsg("Yükseklik verisi kaydedildi.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Yükseklik kaydedilemedi.");
    }
  }

  // --- Delete Cabana (from map context menu) ---
  async function handleDeleteFromMap(cabanaId: string) {
    try {
      const res = await fetch(`/api/cabanas/${cabanaId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Cabana silinemedi.");
      }
      showSuccessMsg("Cabana silindi.");
      if (selectedCabana?.id === cabanaId) {
        setSelectedCabana(null);
        setShowDeleteConfirm(false);
      }
      queryClient.invalidateQueries({ queryKey: ["map-admin-data"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    }
  }

  const statusLabel: Record<CabanaStatus, string> = {
    [CabanaStatus.AVAILABLE]: "Müsait",
    [CabanaStatus.RESERVED]: "Rezerve",
    [CabanaStatus.OCCUPIED]: "Dolu",
    [CabanaStatus.CLOSED]: "Kapalı",
  };

  const statusColor: Record<CabanaStatus, string> = {
    [CabanaStatus.AVAILABLE]: "text-green-400",
    [CabanaStatus.RESERVED]: "text-red-400",
    [CabanaStatus.OCCUPIED]: "text-amber-400",
    [CabanaStatus.CLOSED]: "text-neutral-500",
  };

  return (
    <div className="text-neutral-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            {placeCabanaId
              ? `${displayCabanas[0]?.name ?? "Cabana"} — Yerleşim`
              : "Cabana Haritası"}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {placeCabanaId
              ? "Bu cabana'yı sürükleyerek haritada konumlandırın"
              : mapLocked && placementTool
                ? `${placementTool === "cabana" ? "Cabana" : placementTool === "umbrella" ? "Şemsiye" : placementTool === "sunbed" ? "Şezlong" : "Hizmet Noktası"} eklemek için haritaya tıklayın`
                : mapLocked
                  ? "Araç seçerek haritaya nesne ekleyin"
                  : "Cabanaları harita üzerinde yönetin"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {placeCabanaId && (
            <a href="/system-admin/map" className={cancelBtnCls}>
              Tümünü Göster
            </a>
          )}

          {/* Map Lock Toggle */}
          <button
            onClick={toggleMapLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${
              mapLocked
                ? "bg-amber-600 text-neutral-950 shadow-lg shadow-amber-600/20"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            {mapLocked ? "🔒 Harita Sabit" : "🔓 Haritayı Sabitle"}
          </button>

          {/* Placement Toolbar — only visible when map is locked */}
          {mapLocked && (
            <>
              <div className="w-px h-6 bg-neutral-700" />
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                {[
                  { key: "cabana" as const, icon: "➕", label: "Cabana" },
                  { key: "umbrella" as const, icon: "🏖️", label: "Şemsiye" },
                  { key: "sunbed" as const, icon: "🛋️", label: "Şezlong" },
                  {
                    key: "servicepoint" as const,
                    icon: "📍",
                    label: "Hizmet Noktası",
                  },
                ].map((tool) => (
                  <button
                    key={tool.key}
                    onClick={() =>
                      setPlacementTool((prev) =>
                        prev === tool.key ? null : tool.key,
                      )
                    }
                    title={tool.label}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      placementTool === tool.key
                        ? "bg-yellow-400 text-neutral-950 shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                    }`}
                  >
                    <span>{tool.icon}</span>
                    <span className="hidden lg:inline">{tool.label}</span>
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-neutral-700" />
              <button
                onClick={handleDraftSave}
                disabled={draftSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-all bg-green-700 hover:bg-green-600 text-white ${draftSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                💾 {draftSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </>
          )}
        </div>
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
      <div className="flex-1 overflow-hidden relative">
        {/* Map view area */}
        <div className="h-full p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <LoadingSpinner message="Cabanalar yükleniyor..." />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <p className="text-red-400 text-sm">
                {(queryError as Error)?.message ??
                  "Harita verileri yüklenirken bir hata oluştu."}
              </p>
            </div>
          ) : (
            <div className="h-full min-h-[300px] md:min-h-[500px]">
              <CabanaMap
                cabanas={displayCabanas}
                editable={true}
                onCabanaClick={handleCabanaClick}
                onLocationUpdate={handleLocationUpdate}
                onMapClick={handleMapClick}
                onCabanaDelete={handleDeleteFromMap}
                onElevationSave={handleElevationSave}
                onElevationReset={handleResetElevation}
                savedElevationData={savedElevationData}
                selectedCabanaId={selectedCabana?.id}
                placementCoords={placementCoords}
                mapLocked={mapLocked}
                placementTool={placementTool}
              />
            </div>
          )}
        </div>

        {/* Floating detail overlay — admin edit panel */}
        {selectedCabana && (
          <div className="absolute bottom-4 right-4 z-40 w-80 max-h-[calc(100%-2rem)] bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl overflow-y-auto rc-scrollbar animate-in slide-in-from-right-4 fade-in duration-200">
            {/* Header with close */}
            <div className="flex items-start justify-between gap-2 p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900/95 backdrop-blur-md rounded-t-xl">
              <div>
                <h2 className="text-base font-semibold text-yellow-400 leading-tight">
                  {selectedCabana.name}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedCabana.cabanaClass?.name ?? "—"} ·{" "}
                  {selectedCabana.concept?.name ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    statusColor[selectedCabana.status] === "text-green-400"
                      ? "bg-green-950/60 border border-green-700/40 text-green-400"
                      : statusColor[selectedCabana.status] === "text-red-400"
                        ? "bg-red-950/50 border border-red-800/40 text-red-400"
                        : statusColor[selectedCabana.status] ===
                            "text-amber-400"
                          ? "bg-amber-950/50 border border-amber-700/40 text-amber-400"
                          : "bg-neutral-800 border border-neutral-700 text-neutral-500"
                  }`}
                >
                  {statusLabel[selectedCabana.status]}
                </span>
                <button
                  onClick={() => {
                    setSelectedCabana(null);
                    setShowDeleteConfirm(false);
                  }}
                  className="text-neutral-500 hover:text-neutral-200 transition-colors p-1"
                  aria-label="Kapat"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Cabana details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-500">Konum</span>
                  <span className="text-neutral-200 font-medium">
                    {Math.round(selectedCabana.coordX)},{" "}
                    {Math.round(selectedCabana.coordY)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-500">Döndürme</span>
                  <span className="text-neutral-200 font-medium">
                    {Math.round(selectedCabana.rotation ?? 0)}°
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-800">
                  <span className="text-neutral-500">Ölçek</span>
                  <span className="text-neutral-200 font-medium">
                    {(selectedCabana.scaleX ?? 1).toFixed(1)}x ×{" "}
                    {(selectedCabana.scaleY ?? 1).toFixed(1)}x
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-500">Kilit</span>
                  <span className="text-neutral-200 font-medium">
                    {selectedCabana.isLocked ? "🔒 Sabit" : "Serbest"}
                  </span>
                </div>
              </div>

              <div className="border-t border-neutral-800" />

              {/* Transform Controls */}
              <TransformControls
                cabana={selectedCabana}
                onSave={(updates) => {
                  handleLocationUpdate(
                    selectedCabana.id,
                    selectedCabana.coordX,
                    selectedCabana.coordY,
                    updates.rotation,
                    updates.scaleX,
                    updates.scaleY,
                    updates.color,
                    updates.isLocked,
                  );
                }}
              />

              <div className="border-t border-neutral-800" />

              {/* Class / Concept edit */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Sınıf
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
                    Konsept
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
                  className={"w-full " + primaryBtnCls}
                >
                  {editLoading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>

              <div className="border-t border-neutral-800" />

              {/* Delete */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={"w-full " + dangerSoftBtnCls}
                >
                  Cabana Sil
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
                      className={"flex-1 " + cancelBtnCls}
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className={"flex-1 " + dangerBtnCls}
                    >
                      {deleteLoading ? "Siliniyor..." : "Sil"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Cabana Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShowAddModal(false);
            setPlacementCoords(null);
          }}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-md sm:mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle for mobile */}
            <div className="flex justify-center pt-2 pb-0 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
              <h2 className="text-sm font-semibold text-yellow-400">
                Yeni Cabana Ekle
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setPlacementCoords(null);
                }}
                className="text-neutral-500 hover:text-neutral-300 text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Cabana Adı
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
                  placeholder="Örn: Cabana 1"
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
                    Konum X
                  </label>
                  <input
                    type="number"
                    required
                    step="1"
                    value={Math.round(addForm.coordX)}
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
                    Konum Y
                  </label>
                  <input
                    type="number"
                    required
                    step="1"
                    value={Math.round(addForm.coordY)}
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
              {placementCoords && (
                <p className="text-xs text-amber-500/80">
                  📍 Konum görselden seçildi. Manuel olarak da
                  düzenleyebilirsiniz.
                </p>
              )}

              {addError && (
                <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                  {addError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setPlacementCoords(null);
                  }}
                  className={cancelBtnCls}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className={primaryBtnCls}
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
