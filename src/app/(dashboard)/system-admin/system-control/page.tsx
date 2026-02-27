"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CabanaStatus } from "@/types";

interface CabanaRow {
  id: string;
  name: string;
  isOpenForReservation: boolean;
  status: CabanaStatus;
  cabanaClass: { name: string };
}

interface ModuleConfig {
  reviews: { enabled: boolean };
}

const STATUS_LABELS: Record<CabanaStatus, string> = {
  [CabanaStatus.AVAILABLE]: "Müsait",
  [CabanaStatus.RESERVED]: "Rezerve",
  [CabanaStatus.CLOSED]: "Kapalı",
};

export default function SystemControlPage() {
  const queryClient = useQueryClient();

  const { data: systemOpen = null, isLoading: systemLoading } = useQuery<
    boolean | null
  >({
    queryKey: ["system-config-control"],
    queryFn: async () => {
      const res = await fetch("/api/system/config");
      if (!res.ok) throw new Error("Sistem durumu yüklenemedi.");
      const data = await res.json();
      return data.isOpen as boolean;
    },
  });

  const { data: cabanas = [], isLoading: cabanaLoading } = useQuery<
    CabanaRow[]
  >({
    queryKey: ["cabanas-control"],
    queryFn: async () => {
      const res = await fetch("/api/system/reservation-status");
      if (!res.ok) throw new Error("Kabana listesi yüklenemedi.");
      const data = await res.json();
      return data.cabanas;
    },
  });

  const { data: moduleConfig, isLoading: moduleLoading } =
    useQuery<ModuleConfig>({
      queryKey: ["module-config"],
      queryFn: async () => {
        const res = await fetch("/api/system/modules");
        if (!res.ok) throw new Error("Modül ayarları yüklenemedi.");
        return res.json();
      },
    });

  const [systemToggling, setSystemToggling] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [moduleToggling, setModuleToggling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleSystemToggle() {
    if (systemOpen === null) return;
    setSystemToggling(true);
    setError("");
    try {
      const res = await fetch("/api/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !systemOpen }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Sistem durumu güncellenemedi.");
      }
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["system-config-control"] });
      showSuccess(
        data.isOpen
          ? "Sistem rezervasyona açıldı."
          : "Sistem rezervasyona kapatıldı.",
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSystemToggling(false);
    }
  }

  async function handleCabanaToggle(cabana: CabanaRow) {
    setTogglingId(cabana.id);
    setError("");
    try {
      const res = await fetch("/api/system/reservation-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabanaId: cabana.id,
          isOpen: !cabana.isOpenForReservation,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Kabana durumu güncellenemedi.");
      }
      await res.json();
      queryClient.invalidateQueries({ queryKey: ["cabanas-control"] });
      showSuccess(
        `${cabana.name} ${!cabana.isOpenForReservation ? "rezervasyona açıldı" : "rezervasyona kapatıldı"}.`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleModuleToggle(module: "reviews") {
    if (!moduleConfig) return;
    setModuleToggling(module);
    setError("");
    try {
      const updated = {
        ...moduleConfig,
        [module]: {
          ...moduleConfig[module],
          enabled: !moduleConfig[module].enabled,
        },
      };
      const res = await fetch("/api/system/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Modül durumu güncellenemedi.");
      }
      queryClient.invalidateQueries({ queryKey: ["module-config"] });
      const label = "Değerlendirmeler";
      showSuccess(
        `${label} modülü ${!moduleConfig[module].enabled ? "aktif edildi" : "devre dışı bırakıldı"}.`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setModuleToggling(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-yellow-400">
          Sistem Kontrolü
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Rezervasyon açma/kapama kontrollerini yönetin
        </p>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Sistem Geneli Rezervasyon */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-neutral-300 mb-4">
          Sistem Geneli Rezervasyon
        </h2>
        {systemLoading ? (
          <div className="text-neutral-500 text-sm">Yükleniyor...</div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-100 font-medium">Rezervasyon Durumu</p>
              <p className="text-sm text-neutral-500 mt-0.5">
                {systemOpen
                  ? "Sistem şu anda rezervasyona açık. Yeni talepler oluşturulabilir."
                  : "Sistem şu anda rezervasyona kapalı. Yeni talep oluşturulamaz."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium ${systemOpen ? "text-green-400" : "text-red-400"}`}
              >
                {systemOpen ? "Açık" : "Kapalı"}
              </span>
              <button
                onClick={handleSystemToggle}
                disabled={systemToggling}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  systemOpen ? "bg-green-600" : "bg-neutral-700"
                }`}
                aria-label="Sistem rezervasyon toggle"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    systemOpen ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modül Yönetimi */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-neutral-300 mb-4">
          Modül Yönetimi
        </h2>
        {moduleLoading ? (
          <div className="text-neutral-500 text-sm">Yükleniyor...</div>
        ) : moduleConfig ? (
          <div className="space-y-4">
            {[
              {
                key: "reviews" as const,
                label: "Değerlendirmeler",
                desc: "Misafirlerin kabana değerlendirmesi yapabilmesi",
              },
            ].map((mod) => (
              <div key={mod.key} className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-100 font-medium">{mod.label}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">{mod.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${moduleConfig[mod.key].enabled ? "text-green-400" : "text-red-400"}`}
                  >
                    {moduleConfig[mod.key].enabled ? "Aktif" : "Kapalı"}
                  </span>
                  <button
                    onClick={() => handleModuleToggle(mod.key)}
                    disabled={moduleToggling === mod.key}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      moduleConfig[mod.key].enabled
                        ? "bg-green-600"
                        : "bg-neutral-700"
                    }`}
                    aria-label={`${mod.label} toggle`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                        moduleConfig[mod.key].enabled
                          ? "translate-x-7"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Kabana Bazında Rezervasyon Durumu */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-300">
            Kabana Bazında Rezervasyon Durumu
          </h2>
        </div>
        {cabanaLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : cabanas.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Henüz kabana yok.
          </div>
        ) : (
          <>
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                  <th className="px-4 py-3 font-medium">Kabana Adı</th>
                  <th className="px-4 py-3 font-medium">Sınıf</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Rezervasyon
                  </th>
                </tr>
              </thead>
              <tbody>
                {cabanas.map((cabana) => (
                  <tr
                    key={cabana.id}
                    className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-neutral-100 font-medium">
                      {cabana.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {cabana.cabanaClass.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-neutral-400 text-xs">
                        {STATUS_LABELS[cabana.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className={`text-xs font-medium ${cabana.isOpenForReservation ? "text-green-400" : "text-red-400"}`}
                        >
                          {cabana.isOpenForReservation ? "Açık" : "Kapalı"}
                        </span>
                        <button
                          onClick={() => handleCabanaToggle(cabana)}
                          disabled={togglingId === cabana.id}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            cabana.isOpenForReservation
                              ? "bg-green-600"
                              : "bg-neutral-700"
                          }`}
                          aria-label={`${cabana.name} rezervasyon toggle`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              cabana.isOpenForReservation
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card layout */}
            <div className="md:hidden divide-y divide-neutral-800">
              {cabanas.map((cabana) => (
                <div
                  key={cabana.id}
                  className="px-4 py-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-100 truncate">
                      {cabana.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {cabana.cabanaClass.name} · {STATUS_LABELS[cabana.status]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-medium ${cabana.isOpenForReservation ? "text-green-400" : "text-red-400"}`}
                    >
                      {cabana.isOpenForReservation ? "Açık" : "Kapalı"}
                    </span>
                    <button
                      onClick={() => handleCabanaToggle(cabana)}
                      disabled={togglingId === cabana.id}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        cabana.isOpenForReservation
                          ? "bg-green-600"
                          : "bg-neutral-700"
                      }`}
                      aria-label={`${cabana.name} rezervasyon toggle`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          cabana.isOpenForReservation
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
