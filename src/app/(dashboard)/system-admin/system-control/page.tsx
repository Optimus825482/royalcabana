"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CabanaStatus } from "@/types";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from "@/lib/currency";
import PermissionGate from "@/components/shared/PermissionGate";

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

interface PublicConfig {
  demoQuickLoginEnabled: boolean;
}

const STATUS_LABELS: Record<CabanaStatus, string> = {
  [CabanaStatus.AVAILABLE]: "Müsait",
  [CabanaStatus.RESERVED]: "Rezerve",
  [CabanaStatus.OCCUPIED]: "Dolu",
  [CabanaStatus.CLOSED]: "Kapalı",
};

export default function SystemControlPage() {
  const queryClient = useQueryClient();

  const {
    data: systemOpen = null,
    isLoading: systemLoading,
    isError: isSystemError,
    error: systemError,
  } = useQuery<boolean | null>({
    queryKey: ["system-config-control"],
    queryFn: async () => {
      const res = await fetch("/api/system/config");
      if (!res.ok) throw new Error("Sistem durumu yüklenemedi.");
      const data = await res.json();
      const resolved = data.data ?? data;
      return resolved.isOpen as boolean;
    },
  });

  const {
    data: cabanas = [],
    isLoading: cabanaLoading,
    isError: isCabanaError,
    error: cabanaError,
  } = useQuery<CabanaRow[]>({
    queryKey: ["cabanas-control"],
    queryFn: async () => {
      const res = await fetch("/api/system/reservation-status");
      if (!res.ok) throw new Error("Cabana listesi yüklenemedi.");
      const data = await res.json();
      const resolved = data.data ?? data;
      return resolved.cabanas ?? resolved;
    },
  });

  const { data: moduleConfig, isLoading: moduleLoading } =
    useQuery<ModuleConfig>({
      queryKey: ["module-config"],
      queryFn: async () => {
        const res = await fetch("/api/system/modules");
        if (!res.ok) throw new Error("Modül ayarları yüklenemedi.");
        const json = await res.json();
        return json.data ?? json;
      },
    });

  const { data: publicConfig, isLoading: publicConfigLoading } =
    useQuery<PublicConfig>({
      queryKey: ["system-public-config"],
      queryFn: async () => {
        const res = await fetch("/api/system/public-config", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Public config yüklenemedi.");
        const data = await res.json();
        return data.data as PublicConfig;
      },
    });

  const { data: currencyCode = DEFAULT_CURRENCY, isLoading: currencyLoading } =
    useQuery<CurrencyCode>({
      queryKey: ["system-currency"],
      queryFn: async () => {
        const res = await fetch("/api/system/config/system_currency");
        if (!res.ok) return DEFAULT_CURRENCY;
        const data = await res.json();
        const val = data?.data?.value ?? data?.value ?? DEFAULT_CURRENCY;
        if (val === "TRY" || val === "EUR" || val === "USD")
          return val as CurrencyCode;
        return DEFAULT_CURRENCY;
      },
    });

  const [systemToggling, setSystemToggling] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [moduleToggling, setModuleToggling] = useState<string | null>(null);
  const [demoLoginToggling, setDemoLoginToggling] = useState(false);
  const [currencySaving, setCurrencySaving] = useState(false);
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
      const resolved = data.data ?? data;
      queryClient.invalidateQueries({ queryKey: ["system-config-control"] });
      showSuccess(
        resolved.isOpen
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
        throw new Error(data.message || "Cabana durumu güncellenemedi.");
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

  async function handleCurrencyChange(newCurrency: CurrencyCode) {
    setCurrencySaving(true);
    setError("");
    try {
      const res = await fetch("/api/system/config/system_currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newCurrency }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Para birimi güncellenemedi.");
      }
      queryClient.invalidateQueries({ queryKey: ["system-currency"] });
      showSuccess(
        `Para birimi ${CURRENCIES[newCurrency].label} olarak güncellendi.`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCurrencySaving(false);
    }
  }

  async function handleDemoQuickLoginToggle() {
    if (!publicConfig) return;

    setDemoLoginToggling(true);
    setError("");

    try {
      const nextValue = !publicConfig.demoQuickLoginEnabled;
      const res = await fetch("/api/system/config/demo_quick_login_enabled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: String(nextValue) }),
      });

      const payload = await res.json();
      if (!res.ok || payload?.success === false) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            "Demo hızlı giriş ayarı güncellenemedi.",
        );
      }

      queryClient.invalidateQueries({ queryKey: ["system-public-config"] });
      showSuccess(
        nextValue
          ? "Demo hızlı giriş aktif edildi."
          : "Demo hızlı giriş kapatıldı.",
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDemoLoginToggling(false);
    }
  }

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
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

      {(isSystemError || isCabanaError) && (
        <div className="mb-4 px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
          {(systemError as Error)?.message ??
            (cabanaError as Error)?.message ??
            "Veriler yüklenirken bir hata oluştu."}
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
              <PermissionGate permission="system.config.update">
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
              </PermissionGate>
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
                desc: "Misafirlerin Cabana değerlendirmesi yapabilmesi",
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
                  <PermissionGate permission="system.config.update">
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
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Para Birimi Seçimi */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-neutral-300 mb-4">
          Para Birimi
        </h2>
        {currencyLoading ? (
          <div className="text-neutral-500 text-sm">Yükleniyor...</div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-100 font-medium">Aktif Para Birimi</p>
              <p className="text-sm text-neutral-500 mt-0.5">
                Tüm fiyatlandırma işlemleri seçilen para birimi üzerinden
                gösterilir.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <PermissionGate key={code} permission="system.config.update">
                  <button
                    onClick={() => handleCurrencyChange(code)}
                    disabled={currencySaving}
                    className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors border ${
                      currencyCode === code
                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {CURRENCIES[code].symbol} {code}
                  </button>
                </PermissionGate>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Demo Hızlı Giriş */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-neutral-300 mb-4">
          Demo Hızlı Giriş
        </h2>
        {publicConfigLoading ? (
          <div className="text-neutral-500 text-sm">Yükleniyor...</div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-100 font-medium">
                Login Demo Hesapları
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">
                Açık olduğunda login ekranında demo kullanıcı butonları görünür.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium ${publicConfig?.demoQuickLoginEnabled ? "text-green-400" : "text-red-400"}`}
              >
                {publicConfig?.demoQuickLoginEnabled ? "Açık" : "Kapalı"}
              </span>
              <PermissionGate permission="system.config.update">
                <button
                  onClick={handleDemoQuickLoginToggle}
                  disabled={demoLoginToggling}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${publicConfig?.demoQuickLoginEnabled ? "bg-green-600" : "bg-neutral-700"}`}
                  aria-label="Demo hızlı giriş toggle"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${publicConfig?.demoQuickLoginEnabled ? "translate-x-7" : "translate-x-1"}`}
                  />
                </button>
              </PermissionGate>
            </div>
          </div>
        )}
      </div>

      {/* Cabana Bazında Rezervasyon Durumu */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-300">
            Cabana Bazında Rezervasyon Durumu
          </h2>
        </div>
        {cabanaLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : cabanas.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Henüz Cabana yok.
          </div>
        ) : (
          <>
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                  <th className="px-4 py-3 font-medium">Cabana Adı</th>
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
                        <PermissionGate permission="system.config.update">
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
                        </PermissionGate>
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
                    <PermissionGate permission="system.config.update">
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
                    </PermissionGate>
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
