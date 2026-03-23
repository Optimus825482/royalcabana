"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import CabanaMap from "@/components/map/CabanaMap";
import { CabanaWithStatus, CabanaStatus } from "@/types";

interface SystemConfig {
  system_open_for_reservation: boolean;
}

async function fetchCabanas(): Promise<CabanaWithStatus[]> {
  const res = await fetch("/api/cabanas");
  if (!res.ok) throw new Error("Cabanalar yüklenemedi.");
  const json = await res.json();
  const resolved = json.data ?? json;
  return Array.isArray(resolved) ? resolved : [];
}

async function fetchSystemConfig(): Promise<SystemConfig | null> {
  const res = await fetch("/api/system/config");
  if (res.status === 403 || res.status === 404) {
    // Yetki yok veya bulunamadı - konfigürasyonu gizle
    return null;
  }
  if (!res.ok) throw new Error("Sistem konfigürasyonu yüklenemedi.");
  const raw = await res.json();
  const data = raw.data ?? raw;
  // API returns { isOpen: boolean }
  if (typeof data.isOpen !== "undefined") {
    return {
      system_open_for_reservation:
        data.isOpen === true || data.isOpen === "true",
    };
  }
  if (Array.isArray(data)) {
    const entry = data.find(
      (d: { key: string; value: string }) =>
        d.key === "system_open_for_reservation",
    );
    return { system_open_for_reservation: entry?.value === "true" };
  }
  return {
    system_open_for_reservation:
      data.system_open_for_reservation === true ||
      data.system_open_for_reservation === "true",
  };
}

const statusLabel: Record<CabanaStatus, string> = {
  [CabanaStatus.AVAILABLE]: "Müsait",
  [CabanaStatus.RESERVED]: "Rezerve",
  [CabanaStatus.OCCUPIED]: "Dolu",
  [CabanaStatus.CLOSED]: "Kapalı",
};

const statusBadgeClass: Record<CabanaStatus, string> = {
  [CabanaStatus.AVAILABLE]:
    "bg-green-950/60 border border-green-700/40 text-green-400",
  [CabanaStatus.RESERVED]:
    "bg-red-950/50 border border-red-800/40 text-red-400",
  [CabanaStatus.OCCUPIED]:
    "bg-amber-950/50 border border-amber-700/40 text-amber-400",
  [CabanaStatus.CLOSED]:
    "bg-neutral-800 border border-neutral-700 text-neutral-500",
};

export default function CasinoViewPage() {
  useSession({ required: true });
  const router = useRouter();
  const [selectedCabana, setSelectedCabana] = useState<CabanaWithStatus | null>(
    null,
  );

  const {
    data: cabanas = [],
    isLoading: cabanasLoading,
    error: cabanasError,
  } = useQuery({
    queryKey: ["cabanas"],
    queryFn: fetchCabanas,
  });

  const {
    data: systemConfig,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ["system-config"],
    queryFn: fetchSystemConfig,
  });

  const systemOpen = systemConfig?.system_open_for_reservation ?? true;
  const isLoading = cabanasLoading || configLoading;
  const fetchError =
    cabanasError instanceof Error
      ? cabanasError.message
      : configError instanceof Error
        ? configError.message
        : null;

  function handleCabanaClick(cabana: CabanaWithStatus) {
    setSelectedCabana(cabana);
  }

  const canRequest =
    systemOpen &&
    selectedCabana !== null &&
    selectedCabana.status === CabanaStatus.AVAILABLE &&
    selectedCabana.isOpenForReservation;

  function handleRequestClick() {
    if (!canRequest || !selectedCabana) return;
    router.push(`/casino/cabana/${selectedCabana.id}/calendar`);
  }

  return (
    <div className="text-neutral-100 flex flex-col">
      {/* System closed banner */}
      {!configLoading && !systemOpen && (
        <div className="px-6 py-3 bg-amber-950/60 border-b border-amber-700/40 flex items-center gap-2 shrink-0">
          <svg
            className="w-4 h-4 text-amber-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span className="text-sm text-amber-300 font-medium">
            Sistem şu anda rezervasyona kapalıdır. Yeni talep oluşturulamaz.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Cabana Görünümü
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Cabana seçerek rezervasyon talebi oluşturun
          </p>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="px-6 pt-3 shrink-0">
          <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
            {fetchError}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        {/* View area */}
        <div className="h-full p-4 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span>Yükleniyor...</span>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px]">
              <CabanaMap
                cabanas={cabanas}
                editable={false}
                onCabanaClick={handleCabanaClick}
                selectedCabanaId={selectedCabana?.id}
              />
            </div>
          )}
        </div>

        {/* Floating detail overlay */}
        {selectedCabana && (
          <div className="absolute bottom-4 right-4 z-40 w-80 max-h-[calc(100%-2rem)] bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl overflow-y-auto rc-scrollbar animate-in slide-in-from-right-4 fade-in duration-200">
            {/* Header with close button */}
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
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass[selectedCabana.status]}`}
                >
                  {statusLabel[selectedCabana.status]}
                </span>
                <button
                  onClick={() => setSelectedCabana(null)}
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

            {/* Details */}
            <div className="p-4 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">Sınıf</span>
                  <span className="text-neutral-200 font-medium">
                    {selectedCabana.cabanaClass?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">Konsept</span>
                  <span className="text-neutral-200 font-medium">
                    {selectedCabana.concept?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">Rezervasyona Açık</span>
                  <span
                    className={
                      selectedCabana.isOpenForReservation
                        ? "text-green-400 font-medium"
                        : "text-neutral-500 font-medium"
                    }
                  >
                    {selectedCabana.isOpenForReservation ? "Evet" : "Hayır"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-neutral-500">Sistem Durumu</span>
                  <span
                    className={
                      systemOpen
                        ? "text-green-400 font-medium"
                        : "text-amber-400 font-medium"
                    }
                  >
                    {systemOpen ? "Açık" : "Kapalı"}
                  </span>
                </div>
              </div>

              <div className="border-t border-neutral-800" />

              {/* Reservation button */}
              <div className="space-y-2">
                <button
                  onClick={handleRequestClick}
                  disabled={!canRequest}
                  title={
                    !systemOpen
                      ? "Sistem rezervasyona kapalı"
                      : selectedCabana.status !== CabanaStatus.AVAILABLE
                        ? "Cabana müsait değil"
                        : !selectedCabana.isOpenForReservation
                          ? "Bu Cabana rezervasyona kapalı"
                          : undefined
                  }
                  className="w-full py-2.5 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 transition-colors"
                >
                  Rezervasyon Talebi Oluştur
                </button>

                {!systemOpen && (
                  <p className="text-xs text-amber-400/80 text-center">
                    Sistem rezervasyona kapalı
                  </p>
                )}
                {systemOpen &&
                  selectedCabana.status !== CabanaStatus.AVAILABLE && (
                    <p className="text-xs text-neutral-500 text-center">
                      Bu Cabana şu anda müsait değil
                    </p>
                  )}
                {systemOpen &&
                  selectedCabana.status === CabanaStatus.AVAILABLE &&
                  !selectedCabana.isOpenForReservation && (
                    <p className="text-xs text-neutral-500 text-center">
                      Bu Cabana rezervasyona kapalı
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
