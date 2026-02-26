"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import CabanaMap from "@/components/map/CabanaMap";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { CabanaWithStatus, CabanaStatus } from "@/types";

interface SystemConfig {
  system_open_for_reservation: boolean;
}

async function fetchCabanas(): Promise<CabanaWithStatus[]> {
  const res = await fetch("/api/cabanas");
  if (!res.ok) throw new Error("Kabanalar yüklenemedi.");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.cabanas ?? []);
}

async function fetchSystemConfig(): Promise<SystemConfig> {
  const res = await fetch("/api/system/config");
  if (!res.ok) throw new Error("Sistem konfigürasyonu yüklenemedi.");
  const data = await res.json();
  // API returns array of {key, value} or object
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
  [CabanaStatus.CLOSED]: "Kapalı",
};

const statusBadgeClass: Record<CabanaStatus, string> = {
  [CabanaStatus.AVAILABLE]:
    "bg-green-950/60 border border-green-700/40 text-green-400",
  [CabanaStatus.RESERVED]:
    "bg-red-950/50 border border-red-800/40 text-red-400",
  [CabanaStatus.CLOSED]:
    "bg-neutral-800 border border-neutral-700 text-neutral-500",
};

export default function CasinoMapPage() {
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
    if (!canRequest) return;
    router.push("/casino/calendar");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
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
      <div className="flex items-center px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Kabana Haritası
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kabana seçerek rezervasyon talebi oluşturun
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
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Map area */}
        <div className="flex-1 p-4 min-h-0 min-h-[300px] md:min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <LoadingSpinner message="Kabanalar yükleniyor..." />
            </div>
          ) : (
            <div className="h-full min-h-[300px] md:min-h-[500px]">
              <CabanaMap
                cabanas={cabanas}
                editable={false}
                onCabanaClick={handleCabanaClick}
                selectedCabanaId={selectedCabana?.id}
              />
            </div>
          )}
        </div>

        {/* Detail panel */}
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
              {/* Cabana name + status */}
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-yellow-400 leading-tight">
                  {selectedCabana.name}
                </h2>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass[selectedCabana.status]}`}
                >
                  {statusLabel[selectedCabana.status]}
                </span>
              </div>

              {/* Details */}
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
                        ? "Kabana müsait değil"
                        : !selectedCabana.isOpenForReservation
                          ? "Bu kabana rezervasyona kapalı"
                          : undefined
                  }
                  className="w-full py-2.5 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 transition-colors"
                >
                  Rezervasyon Talebi Oluştur
                </button>

                {/* Disabled reason message */}
                {!systemOpen && (
                  <p className="text-xs text-amber-400/80 text-center">
                    Sistem rezervasyona kapalı
                  </p>
                )}
                {systemOpen &&
                  selectedCabana.status !== CabanaStatus.AVAILABLE && (
                    <p className="text-xs text-neutral-500 text-center">
                      Bu kabana şu anda müsait değil
                    </p>
                  )}
                {systemOpen &&
                  selectedCabana.status === CabanaStatus.AVAILABLE &&
                  !selectedCabana.isOpenForReservation && (
                    <p className="text-xs text-neutral-500 text-center">
                      Bu kabana rezervasyona kapalı
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
