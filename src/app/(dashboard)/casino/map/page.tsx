"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import CabanaMap from "@/components/map/CabanaMap";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
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

async function fetchSystemConfig(): Promise<SystemConfig> {
  const res = await fetch("/api/system/config");
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

export default function CasinoMapPage() {
  useSession({ required: true });
  const router = useRouter();
  const [selectedCabana, setSelectedCabana] = useState<CabanaWithStatus | null>(
    null,
  );

  const {
    data: cabanas = [],
    isLoading: cabanasLoading,
    isError: cabanasIsError,
    error: cabanasError,
  } = useQuery({
    queryKey: ["cabanas"],
    queryFn: fetchCabanas,
  });

  const {
    data: systemConfig,
    isLoading: configLoading,
    isError: configIsError,
    error: configError,
  } = useQuery({
    queryKey: ["system-config"],
    queryFn: fetchSystemConfig,
  });

  const systemOpen = systemConfig?.system_open_for_reservation ?? true;
  const isLoading = cabanasLoading || configLoading;
  const isError = cabanasIsError || configIsError;
  const fetchError =
    cabanasError instanceof Error
      ? cabanasError.message
      : configError instanceof Error
        ? configError.message
        : null;

  function handleCabanaClick(cabana: CabanaWithStatus) {
    setSelectedCabana(cabana);
  }

  function handleReservationStatusClick() {
    if (!selectedCabana) return;
    router.push(`/casino/cabana/${selectedCabana.id}/calendar`);
  }

  return (
    <div className="text-neutral-100 flex flex-col">
      {/* System closed banner */}
      {!configLoading && !systemOpen && (
        <div className="px-4 sm:px-6 py-3 bg-amber-950/60 border-b border-amber-700/40 flex items-center gap-2 shrink-0">
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
      <div className="flex items-center px-4 sm:px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Cabana Haritası
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Cabana seçerek rezervasyon talebi oluşturun
          </p>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="px-4 sm:px-6 pt-3 shrink-0">
          <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
            {fetchError}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 min-h-75 md:min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-75">
              <LoadingSpinner message="Cabanalar yükleniyor..." />
            </div>
          ) : (
            <div className="h-full min-h-75 md:min-h-125">
              <CabanaMap
                cabanas={cabanas}
                editable={false}
                onCabanaClick={handleCabanaClick}
                selectedCabanaId={selectedCabana?.id}
              />
            </div>
          )}
        </div>
      </div>

      {selectedCabana && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedCabana(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCabana.name} detayları`}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2 pb-0 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
              <h2 className="text-base font-semibold text-yellow-400 leading-tight">
                {selectedCabana.name}
              </h2>
              <button
                onClick={() => setSelectedCabana(null)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors active:scale-95"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 overscroll-contain rc-scrollbar">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-neutral-200">Durum</h3>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass[selectedCabana.status]}`}
                >
                  {statusLabel[selectedCabana.status]}
                </span>
              </div>

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
            </div>

            <div className="p-5 border-t border-neutral-800 shrink-0">
              <button
                onClick={handleReservationStatusClick}
                className="w-full min-h-11 py-2.5 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors"
              >
                Rezervasyon Takvimi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
